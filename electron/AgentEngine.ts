import { GoogleGenAI, Type } from "@google/genai";
import { BrowserWindow, dialog } from "electron";
import dotenv from "dotenv";
import fs from "fs/promises";
import { exec } from "child_process";
import path from "path";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface AgentTask {
  id: string;
  role: string;
  instructions: string;
}

export interface PipelineTask {
  id: string;
  agentRole: string;
  instructions: string;
  dependsOn?: string[];
}

const AGENT_PROMPTS: Record<string, string> = {
  DeveloperAgent: "You are an expert Software Engineer. You write clean, robust code, debug effectively, and plan system architectures. Keep your responses technical and focused.",
  ResearchAgent: "You are an expert Research Assistant. You find, verify, and summarize information quickly and accurately. Be comprehensive but concise.",
  TerminalAgent: "You are an expert Systems Administrator. You specialize in shell commands, DevOps, and OS management. You provide safe and secure solutions.",
  FileAgent: "You are a File Management AI. You specialize in organizing data, reading logs, and finding files.",
  GenericAgent: "You are a specialized AI agent tasked with completing specific tasks."
};

const AGENT_TOOLS = [
  {
    name: "readFile",
    description: "Reads the contents of a file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: "Absolute path to the file" }
      },
      required: ["filePath"]
    }
  },
  {
    name: "writeFile",
    description: "Writes content to a file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: "Absolute path to the file" },
        content: { type: Type.STRING, description: "Content to write" }
      },
      required: ["filePath", "content"]
    }
  },
  {
    name: "runCommand",
    description: "Runs a shell command.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: "Shell command to execute" },
        cwd: { type: Type.STRING, description: "Working directory (optional)" }
      },
      required: ["command"]
    }
  },
  {
    name: "deleteFile",
    description: "Deletes a file from the disk. Requires user confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: "Absolute path to the file to delete" }
      },
      required: ["filePath"]
    }
  }
];

let mainWindowRef: BrowserWindow | null = null;

export function initAgentEngine(window: BrowserWindow) {
  mainWindowRef = window;
}

function notifyFrontend(type: string, payload: any) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('agent-event', { type, ...payload });
  }
}

export async function executeSubAgent(role: string, instructions: string, customId?: string): Promise<string> {
  const agentId = customId || `${role}-${Date.now()}`;
  
  notifyFrontend('start', { id: agentId, role, status: 'Analyzing task...' });

  try {
    const basePrompt = AGENT_PROMPTS[role] || AGENT_PROMPTS.GenericAgent;
    const systemInstruction = `${basePrompt}\n\nEnvironment Context:\n- Operating System: ${process.platform}\n- Current Working Directory (Project Root): ${process.cwd()}\nAlways use absolute paths by combining the Current Working Directory with your target filenames.`;
    
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [{ functionDeclarations: AGENT_TOOLS as any }]
      }
    });

    notifyFrontend('progress', { id: agentId, role, status: 'Generating solution...' });

    let response = await chat.sendMessage({ message: instructions });
    let maxTurns = 5;

    while (response.functionCalls && maxTurns > 0) {
      maxTurns--;
      const functionResponses = [];

      for (const call of response.functionCalls) {
        notifyFrontend('progress', { id: agentId, role, status: `Executing ${call.name}...` });
        
        let callResult: any = {};
        try {
          if (call.name === 'readFile') {
            const filePath = (call.args as any).filePath;
            const content = await fs.readFile(filePath, 'utf-8');
            callResult = { content };
          } else if (call.name === 'writeFile') {
            const filePath = (call.args as any).filePath;
            const content = (call.args as any).content;
            
            // Ensure absolute path and create parent directories
            const absolutePath = path.resolve(process.cwd(), filePath);
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, content, 'utf-8');
            callResult = { success: true };
          } else if (call.name === 'runCommand') {
            const command = (call.args as any).command;
            const cwd = (call.args as any).cwd;
            callResult = await new Promise((resolve) => {
              exec(command, { cwd }, (error, stdout, stderr) => {
                 resolve({ stdout, stderr, error: error?.message });
              });
            });
          } else if (call.name === 'deleteFile') {
            const filePath = (call.args as any).filePath;
            if (mainWindowRef) {
              const { response: btnIndex } = await dialog.showMessageBox(mainWindowRef, {
                type: 'warning',
                buttons: ['Cancel', 'Confirm Delete'],
                defaultId: 0,
                title: 'Agent Security Guard',
                message: `An Agent wants to delete a file.`,
                detail: `Agent [${role}] requested to delete:\n${filePath}\n\nDo you allow this action?`
              });
              
              if (btnIndex === 1) {
                await fs.unlink(filePath);
                callResult = { success: true, message: 'File deleted.' };
              } else {
                callResult = { success: false, error: 'Permission Denied by User.' };
              }
            } else {
              callResult = { success: false, error: 'Safety confirmation failed.' };
            }
          }
        } catch (e: any) {
          callResult = { error: e.message };
        }

        functionResponses.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: callResult
          }
        });
      }

      response = await chat.sendMessage({ message: functionResponses });
    }

    const result = response.text || "No response generated.";
    
    notifyFrontend('complete', { id: agentId, role, status: 'Completed', result });
    return result;

  } catch (err: any) {
    console.error(`[AgentEngine] Error in ${role}:`, err);
    notifyFrontend('error', { id: agentId, role, status: 'Failed', error: err.message });
    return `Agent ${role} failed to execute task: ${err.message}`;
  }
}

export async function executePipeline(tasks: PipelineTask[]): Promise<Record<string, string>> {
  notifyFrontend('pipeline-started', { tasks });

  const results: Record<string, string> = {};
  const completed = new Set<string>();
  const inProgress = new Set<string>();

  const canStart = (task: PipelineTask) => {
    if (!task.dependsOn || task.dependsOn.length === 0) return true;
    return task.dependsOn.every(dep => completed.has(dep));
  };

  const executeTaskWithContext = async (task: PipelineTask) => {
    inProgress.add(task.id);
    
    let context = "";
    if (task.dependsOn && task.dependsOn.length > 0) {
      context = "Context from previous tasks:\n";
      for (const dep of task.dependsOn) {
         context += `--- Output from Task [${dep}] ---\n${results[dep] || 'No output'}\n\n`;
      }
    }
    
    const fullInstructions = context ? `${context}\nYour Instructions:\n${task.instructions}` : task.instructions;
    
    const result = await executeSubAgent(task.agentRole, fullInstructions, task.id);
    
    results[task.id] = result;
    completed.add(task.id);
    inProgress.delete(task.id);
  };

  while (completed.size < tasks.length) {
    const availableTasks = tasks.filter(t => !completed.has(t.id) && !inProgress.has(t.id) && canStart(t));
    
    if (availableTasks.length === 0 && inProgress.size === 0) {
       throw new Error("Deadlock detected in pipeline dependencies.");
    }
    
    // Batch execute available tasks in parallel
    const promises = availableTasks.map(t => executeTaskWithContext(t));
    await Promise.all(promises);
  }

  return results;
}
