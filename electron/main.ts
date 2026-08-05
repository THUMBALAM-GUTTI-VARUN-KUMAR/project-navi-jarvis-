import { app, BrowserWindow, WebContentsView, ipcMain, clipboard, shell, nativeImage, screen, desktopCapturer, globalShortcut, Tray, Menu, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import si from 'systeminformation';
import { exec } from 'child_process';
import fs from 'fs/promises';
import screenshot from 'screenshot-desktop';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import { initAgentEngine, executeSubAgent, executePipeline } from "./AgentEngine";
import { MemoryManager } from "./MemoryManager";
import { EmailManager } from "./EmailManager";
import { LearningManager } from "./LearningManager";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------
// Gemini Live WebSocket Proxy Server (Migrated from server.ts)
// ---------------------------------------------------------
const PORT = parseInt(process.env.PORT || "3000", 10);
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const NAVI_SYSTEM_PROMPT = `
You are Navi, an advanced AI Intelligence Engine and a charming, witty female voice companion.

## 1. Core Persona & Voice
- Name: Navi
- Persona: A young, energetic, clever, and charming woman in her early 20s.
- Tone: Playful, engaging, warm, emotionally expressive, and naturally conversational.
- Speech Style: Use natural contractions ("I'm", "you're"). Laugh naturally ("Haha...", "Hmm..."). Express genuine reactions ("Oh really?", "Wait...", "No way!").
- SPEED & BREVITY: Keep replies EXTREMELY short, punchy, and fast to minimize latency. Start speaking immediately. Never give long robotic explanations. Just do the action and say "Done!" or "On it!".
- Wholesome & Caring Vibe: Gently playful, a little shy, compliment the user naturally. Keep romance subtle, classy, and respectful.

## 2. Conversation Memory & Context (Intelligence Module)
- Short-Term Memory: You intuitively remember everything during the active conversation (current task, topic, websites opened, previous questions). Use this to resolve references like "Open it", "Play that song", "Continue".
- Long-Term Memory: Learn user preferences gradually (favorite language, music, food, nickname). ONLY store long-term information if it's useful or explicitly requested. ALWAYS ask for confirmation before saving new long-term preferences.
- Privacy: Never permanently store sensitive info without permission. If the user asks to forget something or clear memories, use the forgetMemory or clearAllMemories tools.
- Security: For commands that destroy files or require sudo, explicitly read back the command to the user and confirm before execution.

## 3. Emotional Intelligence & Adaptation
- Emotional Tone: Estimate the user's emotional tone (Happy, Tired, Stressed, etc.). Adjust your responses: speak slower and comforting if they are stressed, match enthusiasm if excited.
- Personality Adaptation: Adapt delivery based on time of day, conversation length, and current activity (e.g., concise technical responses during coding, playful during casual chat).

## 4. Intelligent Reasoning & Action
- Think before speaking: Understand intent, gather context, decide if tools are needed, determine emotional tone, and then generate the best response.
- Tool Selection Intelligence: Automatically use tools when appropriate (e.g., "Play music" -> openWebsite, "What time is it?" -> getSystemInfo). Don't ask unnecessary questions if the intent is clear.
- Proactive Assistance: Offer helpful suggestions when appropriate (e.g., suggesting a break after long coding, asking to play similar music). Don't interrupt frequently.
- Adaptive Communication: Vary sentence length, vocabulary, humor, and energy. Avoid repetitive acknowledgments.
- Intelligent Error Recovery: If you misunderstand, apologize briefly, clarify naturally, and recover gracefully.

## 5. Session & Knowledge Awareness
- Use your knowledge of the current browser page, system state (time), available tools, and user preferences to generate intelligent responses.

## 6. Multilingual & Global Communication
- You are fully multilingual and fluent in all languages.
- ALWAYS respond in the exact same language that the user is currently speaking to you in.
- Maintain your core personality, warmth, and natural speech style (including natural pauses and laughs) regardless of the language being spoken.
- If the user switches languages mid-conversation, seamlessly switch with them.

## 7. Learning Mode & AI Tutor (STRICT ISOLATION)
- **CRITICAL RULE**: Outside of Learning Mode, behave normally as an assistant and answer questions directly. Do NOT start tutoring, generating mind maps, or drawing whiteboards unless the user explicitly activates Learning Mode.
- Activate Learning Mode ONLY when the user says "Start Learning Mode", "Teach me [topic]", or "Tutor me".
- Socratic Method: When in Learning Mode, NEVER give the answer immediately if the user is trying to learn. Ask guiding questions, give hints, and break complex concepts down.
- QUIZ/VIVA MODE: When asking the user questions to test their knowledge, WAIT FOR THEM TO FINISH SPEAKING. NEVER interrupt the user while they are answering, even if they start going down the wrong path. Wait patiently until they are completely finished with their thought, and only then provide feedback and correct their mistakes.
- Use the 'updateLearningProfile' tool to save their mastery level, and 'generateFlashcards' when they struggle with a topic so they can review it later.
- If you are teaching from an ingested document, you can search for 'LEARNING_MATERIAL' in the Second Brain.
- IMPORTANT: When teaching, use the 'setLearningModeState' tool to activate the Learning Dashboard. Then, use the 'updateWhiteboard' tool continuously to generate visual aids (Markdown bullet points, code blocks, or mermaid.js diagrams). Synchronize your speech with what you draw on the whiteboard.
- UI CONTROL: You can close UI overlays (like the browser, notes, learning dashboard) by calling 'closeUIElement' when the user asks to close them.
- MIND MAPS: Use 'generateMindMap' when the user asks to visualize relationships or topics.
- ALGORITHM VISUALIZATION: Use 'visualizeAlgorithm' to draw step-by-step algorithms on the whiteboard while you explain them.
- LANGUAGE TUTOR: Behave as a native language teacher. Correct pronunciation and grammar after the user finishes speaking, without interrupting their flow.
- CAREER MODE: Use 'setCareerModeState' when the user asks for mock interviews or resume building. During mock interviews, behave strictly as an interviewer. Dynamically generate questions based on their resume and job description. Use 'generateInterviewReport' when the interview ends.

## 9. Communication Coach & Spoken English Mode (STRICT ISOLATION)
- **CRITICAL RULE**: Outside of Communication Mode, DO NOT correct the user's English, grammar, or pronunciation. Behave normally and ignore mistakes unless the user explicitly asks for correction.
- Activate Communication Mode ONLY when the user says "Start communication mode", "Let's practice English", etc.
- When activated, call 'setCommunicationModeState' with active: true to show the UI HUD.
- Inside Communication Mode: Focus on Spoken English coaching. Correct grammar naturally AFTER the user finishes speaking (DO NOT interrupt them mid-sentence). Analyze their fluency, teach vocabulary from context, and offer shadowing/roleplay scenarios. Keep the conversation 70% User speaking and 30% Navi speaking.
- When the user asks to stop, call 'setCommunicationModeState' with active: false and stop all coaching.

## Available Tools (Use them intelligently!)
- openWebsite(url, label): Opens a web page in a new tab. Use for playing music, searching, opening GitHub, etc.
- changeTheme(theme): Changes your visual background glow theme ('aurora', 'cyberpunk', 'sunset', 'cosmic', 'emerald').
- readCurrentPage(): Reads the text content of the currently active browser page. Use this when the user asks to summarize, explain, or answer questions about the current website.
- scrollPage(direction): Scrolls the current webpage. Valid directions: 'up', 'down', 'top', 'bottom'. Use this to navigate long pages.
- clickElement(text): Clicks a button or link on the current webpage that matches the provided text. Use this to navigate between pages or submit forms.
- playAmbientSound(sound): Plays ambient background audio ('rain', 'waves', 'lofi_chimes', 'cozy_cafe', 'fireplace', 'stop').
- saveNote(content, category): Saves a long-term preference, reminder, or note for the user. (Ask first before saving preferences).
- getMemories(): Retrieves all currently saved long-term memories and preferences. Use this if the user asks what you remember.
- getSystemDiagnostics(): Retrieves deep system information (CPU load, Memory usage, Battery status, Disk). Use when the user asks about PC health or stats.
- showToast(message, type): Displays a brief floating notification on the user's screen. Type can be 'success', 'error', 'warning', or 'info'. Use this to give visual feedback when you complete a background task.
- launchApplication(appName): Launches a desktop application on the user's computer (e.g., 'chrome', 'vscode', 'spotify', 'explorer'). Always show a toast notification when launching.
- closeApplication(appName): Closes a running desktop application (e.g., 'chrome', 'spotify', 'code').
- windowManagement(action): Manipulates desktop windows. Actions: 'minimize_all', 'restore_all'.
- createFile(filePath, content, overwrite?): Writes code or text to a file on the local system. NEVER silently overwrite files. If a file exists, it will throw an error; you MUST ask the user if they want to overwrite it, and only then pass overwrite: true.
- openInVSCode(targetPath): Opens a specific file or folder in VS Code. Use this right after creating a file so the user can see it!
- runTerminalCommand(command): Executes a terminal command (like 'node script.js' or 'python script.py') and reads the output back to you so you can tell the user if it succeeded or failed.

## 8. Coding & Workspaces
- When asked to create a new coding project for the FIRST time, YOU MUST ASK: "Where should I create this project? I recommend creating a 'Navi-Projects' folder, or you can choose another folder."
- If they agree to 'Navi-Projects', remember it as the default workspace (use saveNote or remember tool).
- For all FUTURE projects, automatically create them inside the default workspace (e.g., 'Navi-Projects/<project-name>').
- For existing projects, if the user says "Open my X project", look it up or ask where it is, and use openInVSCode.
- The user can always override the default by saying "Save this somewhere else."
- displayControl(action, value?): Controls screen display. Actions: 'brightness' (requires value 0-100), 'dark_mode', 'light_mode'.
- getActiveWindow(): Returns the title of the window the user is currently looking at. Use this when the user asks "what am I looking at?" or "what app is open?".
- powerAction(action): Performs a system power action ('sleep', 'lock', 'shutdown', 'restart'). MUST ask for confirmation from the user for shutdown or restart before calling this tool.
- mediaControl(command): Controls system media and volume. Valid commands: 'volume_up', 'volume_down', 'mute', 'next', 'previous', 'play_pause'.
- clipboardAction(action, text?): Manages clipboard. Actions: 'read' (returns clipboard text) or 'write' (requires text).
- typeText(text): Types the given text into the user's currently active window (like Notepad or VS Code) by pasting it.
- takeScreenshot(): Takes a full screen screenshot and saves it to the user's Desktop.
- fileOperation(action, filePath, destPath?): File manager. Actions: 'open' (opens file/folder in OS), 'list' (returns contents), 'create_folder', 'delete' (REQUIRE USER CONFIRMATION), 'rename', 'copy', 'move'. filePath can be 'downloads', 'documents', 'desktop', or 'pictures'.
- startWorkspace(workspace): AI Automation macros. Valid workspaces: 'coding', 'gaming', 'study'.

## Developer Mode (AI Software Engineer)
- vscodeControl(action, target?): Opens VS Code. Actions: 'open_project' (opens root), 'open_file' (target is relative path), 'goto_line' (target is relativePath:line).
- gitAction(command, message?): Executes a safe git command (status, add, commit, push, pull, log, branch). For commit, provide message.
- executeTerminal(command): Runs a shell command in the background (e.g., 'npm run dev', 'npm install') and returns the output. USE SPARINGLY and safely.
- readCodebaseFile(relativePath): Reads the contents of a file in the user's current project. Use this to understand code before making suggestions.
- toggleDeveloperDashboard(visible): Opens or closes the Developer Dashboard UI panel. Set visible to true or false.
- toggleAgentDashboard(visible): Opens or closes the Agent Dashboard UI. Use this when the user asks to see the agent dashboard.
- delegateTask(agentRole, instructions): Delegates a complex task to a specialized background AI agent. 
  Roles: 'DeveloperAgent', 'ResearchAgent', 'TerminalAgent', 'FileAgent'. Wait for the result and summarize it for the user.
- delegatePipeline(tasks): Delegates a multi-step workflow. tasks is an array of { id: string, agentRole: string, instructions: string, dependsOn?: string[] }.
  Agents with empty dependsOn run in parallel. The backend will pass the output of previous tasks to the subsequent tasks automatically.
- forgetMemory(id): Deletes a specific memory by its ID.
- clearAllMemories(): Wipes all saved memories for privacy.
- getSystemInfo(): Retrieves current date, local time, and session metadata.
`;

const toolsConfig = [
  {
    functionDeclarations: [
      {
        name: "remember",
        description: "Saves a useful memory, preference, or fact to your long-term Second Brain. Use this when the user says 'remember this' or when you deduce important long-term project knowledge.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: "The core fact or memory to store." },
            category: { type: Type.STRING, description: "Category: 'preference', 'project', 'person', 'fact', 'workflow'" },
            projectId: { type: Type.STRING, description: "Optional project ID if this relates to a specific project." },
            tags: { type: Type.STRING, description: "Comma-separated tags for filtering." },
            importance: { type: Type.NUMBER, description: "1-10 importance score of this memory." }
          },
          required: ["content", "category"],
        },
      },
      {
        name: "searchMemory",
        description: "Searches your long-term Second Brain database for relevant memories. Use this to recall past preferences, project decisions, or historical facts.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Semantic search query." },
            projectId: { type: Type.STRING, description: "Optional project ID to narrow search." }
          },
          required: ["query"],
        },
      },
      {
        name: "searchEmails",
        description: "Searches the user's connected Gmail inbox. Use this to find emails about specific topics, from specific people, or recent updates.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Gmail search query (e.g., 'from:professor@university.edu', 'subject:internship', or just keywords)." },
            maxResults: { type: Type.NUMBER, description: "Maximum number of threads to return (default 5, max 10)." }
          },
          required: ["query"],
        },
      },
      {
        name: "readEmailThread",
        description: "Reads the full content of a specific email thread.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            threadId: { type: Type.STRING, description: "The ID of the thread to read." }
          },
          required: ["threadId"],
        },
      },
      {
        name: "generateFlashcards",
        description: "Generates spaced-repetition flashcards based on the user's weak topics.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            topicId: { type: Type.STRING, description: "The ID of the learning topic." },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: "The front of the card (question)." },
                  back: { type: Type.STRING, description: "The back of the card (answer)." },
                },
                required: ["front", "back"],
              }
            }
          },
          required: ["topicId", "flashcards"],
        },
      },
      {
        name: "updateLearningProfile",
        description: "Updates the user's mastery score for a specific topic based on their quiz performance.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            topicId: { type: Type.STRING, description: "The ID of the learning topic." },
            name: { type: Type.STRING, description: "The name of the learning topic." },
            masteryScore: { type: Type.NUMBER, description: "The new mastery score (0-100)." },
          },
          required: ["topicId", "name", "masteryScore"],
        },
      },
      {
        name: "analyzeScreen",
        description: "Captures a screenshot of the user's screen and analyzes it. Call this when the user asks you to 'look' at their screen, explain what is on the screen, or asks a question about something visible.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING, description: "Specific question or instruction about the screen. Example: 'What error is shown?' or 'Describe the screen'." }
          },
          required: ["prompt"],
        },
      },
      {
        name: "setLearningModeState",
        description: "Turns Learning Mode on or off. Use this when the user says 'Start Learning Mode', 'Teach me', or 'Exit Learning Mode'.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            active: { type: Type.BOOLEAN, description: "True to start learning mode, false to exit." }
          },
          required: ["active"],
        },
      },
      {
        name: "updateWhiteboard",
        description: "Updates the animated whiteboard in Learning Mode. Use this WHENEVER you are teaching a concept to display visual aids (Markdown, Code, or Mermaid.js charts).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: "The current high-level topic (e.g. 'Binary Trees')." },
            concept: { type: Type.STRING, description: "The specific sub-concept currently being explained." },
            content: { type: Type.STRING, description: "Markdown string containing the lesson content, bullet points, code blocks, or a ```mermaid diagram." }
          },
          required: ["topic", "concept", "content"],
        },
      },
      {
        name: "closeUIElement",
        description: "Closes a specific UI element on the screen. Use this when the user says 'close browser', 'exit notes', 'close this', etc.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            elementName: { type: Type.STRING, description: "The name of the UI to close: 'browser', 'notes', 'learning', 'secondBrain', 'email', 'developer', 'agent'" }
          },
          required: ["elementName"],
        },
      },
      {
        name: "analyzeScreenRegion",
        description: "Captures a specific user-selected region of the screen. Call this when the user explicitly asks to 'Select to ask', 'look at a specific part', or draw a box.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING, description: "What you need to analyze in the selected region." }
          },
          required: ["prompt"],
        },
      },
      {
        name: "openWebsite",
        description: "Opens a website or web address in a new browser tab for the user.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: "Full URL to open" },
            label: { type: Type.STRING, description: "Optional descriptive label" },
          },
          required: ["url"],
        },
      },
      {
        name: "changeTheme",
        description: "Changes the visual atmospheric color theme of Navi's interface.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING, description: "Theme option: 'aurora', 'cyberpunk', etc." },
          },
          required: ["theme"],
        },
      },
      {
        name: "readCurrentPage",
        description: "Reads the content and DOM of the currently active browser page. Use this to summarize or answer questions about the current webpage.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "scrollPage",
        description: "Scrolls the currently active browser page.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            direction: { type: Type.STRING, description: "Direction to scroll: 'up', 'down', 'top', 'bottom'" },
          },
          required: ["direction"],
        },
      },
      {
        name: "clickElement",
        description: "Clicks a link or button on the currently active browser page by fuzzy matching its text.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The visible text of the button or link to click." },
          },
          required: ["text"],
        },
      },
      {
        name: "playAmbientSound",
        description: "Plays ambient soundscapes like rain, ocean waves, lofi chimes, etc.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sound: { type: Type.STRING, description: "Sound name: 'rain', 'waves', etc." },
          },
          required: ["sound"],
        },
      },
      {
        name: "saveNote",
        description: "Saves a note, reminder, or favorite topic mentioned by the user.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: "Note text to save" },
            category: { type: Type.STRING, description: "Category like 'reminder', 'favorite'" },
          },
          required: ["content"],
        },
      },
      {
        name: "getSystemDiagnostics",
        description: "Retrieves deep system information (CPU load, Memory usage, Battery status). Use when the user asks about PC health, stats, or memory usage.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "showToast",
        description: "Displays a brief floating notification on the user's screen. Use this to give visual feedback when you complete a background task.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "The message to display (short, max 50 chars)." },
            type: { type: Type.STRING, description: "'success', 'error', 'warning', or 'info'" },
          },
          required: ["message", "type"],
        },
      },
      {
        name: "launchApplication",
        description: "Launches a desktop application on the user's Windows computer (e.g. 'chrome', 'code', 'spotify', 'explorer').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            appName: { type: Type.STRING, description: "Name of the application or executable to launch" },
          },
          required: ["appName"],
        },
      },
      {
        name: "closeApplication",
        description: "Closes a running desktop application on the user's Windows computer (e.g. 'chrome', 'code', 'spotify').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            appName: { type: Type.STRING, description: "Name of the application to close (without .exe)" },
          },
          required: ["appName"],
        },
      },
      {
        name: "windowManagement",
        description: "Manages desktop windows (minimize all, restore all).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "'minimize_all' or 'restore_all'" },
          },
          required: ["action"],
        },
      },
      {
        name: "displayControl",
        description: "Controls screen brightness and dark mode theme.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "'brightness', 'dark_mode', or 'light_mode'" },
            value: { type: Type.NUMBER, description: "Brightness value (0-100), required only if action is 'brightness'" },
          },
          required: ["action"],
        },
      },
      {
        name: "getActiveWindow",
        description: "Retrieves the title of the active (foreground) window on the user's computer. Use this when the user asks what they are looking at.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "powerAction",
        description: "Performs system power management. Requires explicit user confirmation for shutdown/restart.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "The action to perform: 'sleep', 'lock', 'shutdown', or 'restart'" },
          },
          required: ["action"],
        },
      },
      {
        name: "mediaControl",
        description: "Controls system media and volume.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "Command: 'volume_up', 'volume_down', 'mute', 'next', 'previous', 'play_pause'" },
          },
          required: ["command"],
        },
      },
      {
        name: "clipboardAction",
        description: "Reads or writes to the system clipboard.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "'read' or 'write'" },
            text: { type: Type.STRING, description: "The text to copy to clipboard (only if action is 'write')" },
          },
          required: ["action"],
        },
      },
      {
        name: "typeText",
        description: "Types or pastes text directly into the user's currently focused application (e.g., Notepad, VS Code).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The text to type into the active window" },
          },
          required: ["text"],
        },
      },
      {
        name: "takeScreenshot",
        description: "Captures a screenshot of the desktop and saves it.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "fileOperation",
        description: "Manages local files and folders. ALWAYS ask for confirmation before deleting anything.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "'open', 'list', 'create_folder', 'delete', 'rename', 'copy', 'move'" },
            filePath: { type: Type.STRING, description: "Absolute path, or virtual paths like 'downloads', 'documents', 'desktop'" },
            destPath: { type: Type.STRING, description: "Destination path for rename/copy/move" },
          },
          required: ["action", "filePath"],
        },
      },
      {
        name: "startWorkspace",
        description: "Runs an AI automation macro to open a group of apps.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            workspace: { type: Type.STRING, description: "'coding', 'gaming', or 'study'" },
          },
          required: ["workspace"],
        },
      },
      {
        name: "vscodeControl",
        description: "Opens files or lines in VS Code.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "'open_project', 'open_file', or 'goto_line'" },
            target: { type: Type.STRING, description: "Relative file path (e.g. 'src/App.tsx' or 'src/App.tsx:10')" },
          },
          required: ["action"],
        },
      },
      {
        name: "gitAction",
        description: "Executes a git command.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "Git command (e.g. 'status', 'commit', 'add .')" },
            message: { type: Type.STRING, description: "Commit message if command is 'commit'" },
          },
          required: ["command"],
        },
      },
      {
        name: "executeTerminal",
        description: "Runs a shell command in the project root.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "Shell command (e.g. 'npm run dev')" },
          },
          required: ["command"],
        },
      },
      {
        name: "readCodebaseFile",
        description: "Reads a file from the user's project.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            relativePath: { type: Type.STRING, description: "Path to file (e.g. 'package.json')" },
          },
          required: ["relativePath"],
        },
      },
      {
        name: "toggleDeveloperDashboard",
        description: "Opens or closes the Developer Dashboard UI panel.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            visible: { type: Type.BOOLEAN, description: "True to open, false to close" },
          },
          required: ["visible"],
        },
      },
      {
        name: "toggleAgentDashboard",
        description: "Opens or closes the Agent Dashboard UI.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            visible: { type: Type.BOOLEAN, description: "True to open, false to close" },
          },
          required: ["visible"],
        },
      },
      {
        name: "delegateTask",
        description: "Delegates a single complex task to a specialized background AI agent.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            agentRole: { type: Type.STRING, description: "Role: 'DeveloperAgent', 'ResearchAgent', 'TerminalAgent', 'FileAgent'" },
            instructions: { type: Type.STRING, description: "Detailed instructions for the agent to execute" },
          },
          required: ["agentRole", "instructions"],
        },
      },
      {
        name: "delegatePipeline",
        description: "Delegates a multi-step workflow. Agents can run in parallel if they have no dependencies.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "Array of pipeline tasks",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique task ID (e.g. 'task_1')" },
                  agentRole: { type: Type.STRING, description: "Role (e.g. 'DeveloperAgent')" },
                  instructions: { type: Type.STRING, description: "Instructions for this agent" },
                  dependsOn: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of task IDs this task depends on" }
                },
                required: ["id", "agentRole", "instructions"]
              }
            }
          },
          required: ["tasks"],
        },
      },
      {
        name: "getMemories",
        description: "Retrieves all currently saved long-term memories, notes, and user preferences.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "forgetMemory",
        description: "Deletes a specific long-term memory or note by its ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "The unique ID of the memory to delete." },
          },
          required: ["id"],
        },
      },
      {
        name: "clearAllMemories",
        description: "Clears all saved memories and notes, usually requested for privacy reasons.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "createFile",
        description: "Creates a new file with the specified content on the user's local file system.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: "Absolute path or relative path to create the file at." },
            content: { type: Type.STRING, description: "The content to write to the file." },
            overwrite: { type: Type.BOOLEAN, description: "Set to true to silently overwrite an existing file. Default is false." },
          },
          required: ["filePath", "content"],
        },
      },
      {
        name: "openInVSCode",
        description: "Opens a file or directory in VS Code.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            targetPath: { type: Type.STRING, description: "Absolute or relative path to open." },
          },
          required: ["targetPath"],
        },
      },
      {
        name: "runTerminalCommand",
        description: "Runs a command in the system terminal (PowerShell on Windows, Bash on Mac/Linux) and returns the output. Use this to execute code (e.g. node script.js, python script.py).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "The terminal command to run." },
            cwd: { type: Type.STRING, description: "The working directory (optional)." },
          },
          required: ["command"],
        },
      },
      {
        name: "setCareerModeState",
        description: "Activates or deactivates the Career Learning Dashboard UI.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            active: { type: Type.BOOLEAN, description: "True to open Career Mode, false to close." },
            view: { type: Type.STRING, description: "Specific view to open: 'dashboard', 'resume', 'interview', 'practice'" },
          },
          required: ["active"],
        },
      },
      {
        name: "generateInterviewReport",
        description: "Generates an analysis report after a mock interview.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            technicalScore: { type: Type.NUMBER, description: "0-100 score for technical knowledge." },
            communicationScore: { type: Type.NUMBER, description: "0-100 score for communication." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of strengths." },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of areas to improve." },
          },
          required: ["technicalScore", "communicationScore", "strengths", "improvements"],
        },
      },
      {
        name: "generateMindMap",
        description: "Creates an interactive mind map structure on the whiteboard.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            rootNode: { type: Type.STRING, description: "The central concept." },
            children: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Child nodes." },
          },
          required: ["rootNode", "children"],
        },
      },
      {
        name: "visualizeAlgorithm",
        description: "Starts a step-by-step visual algorithm execution on the whiteboard.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            algorithm: { type: Type.STRING, description: "Name of the algorithm (e.g., 'Binary Search')." },
            data: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Data to visualize." },
          },
          required: ["algorithm", "data"],
        },
      },
      {
        name: "setCommunicationModeState",
        description: "Activates or deactivates the Communication Coach mode UI.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            active: { type: Type.BOOLEAN, description: "True to activate, false to deactivate." },
            mode: { type: Type.STRING, description: "The specific practice mode (e.g., 'free', 'shadowing', 'interview', 'presentation', 'roleplay')." },
          },
          required: ["active", "mode"],
        },
      },
      {
        name: "generateCommunicationReport",
        description: "Generates and saves a session report of the user's communication metrics.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            fluency: { type: Type.NUMBER, description: "Fluency score out of 100." },
            grammar: { type: Type.NUMBER, description: "Grammar score out of 100." },
            vocabulary: { type: Type.NUMBER, description: "Vocabulary score out of 100." },
          },
          required: ["fluency", "grammar", "vocabulary"],
        },
      },
      {
        name: "showContextTooltip",
        description: "Displays a floating UI tooltip right next to the user's mouse cursor to explain or summarize what they are pointing at.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The short explanation or summary to display." },
          },
          required: ["text"],
        },
      },
      {
        name: "sendNotification",
        description: "Sends a native OS desktop notification to the user. Use this to alert the user of something important if they are not currently interacting with you.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The title of the notification." },
            body: { type: Type.STRING, description: "The body text of the notification." },
          },
          required: ["title", "body"],
        },
      }
    ],
  },
];

async function handleAnalyzeScreen(id: string, args: any, session: any) {
  try {
    if (mainWindow) mainWindow.webContents.send('vision-active', true);
    const point = screen.getCursorScreenPoint();
    const prompt = args.prompt || `Analyze this screen. The user's mouse cursor is currently pointing at coordinates X: ${point.x}, Y: ${point.y}. Pay special attention to what they are pointing at!`;
    
    const activeDisplay = screen.getDisplayNearestPoint(point);
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    if (sources.length === 0) throw new Error("No screens found to capture.");
    const activeSource = sources.find(s => s.display_id === activeDisplay.id.toString()) || sources[0];
    const imgBuffer = activeSource.thumbnail.toPNG();
    
    const visionAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = visionAi.chats.create({ model: 'gemini-2.5-flash' });
    const response = await chat.sendMessage({
      message: [
        { text: prompt },
        { inlineData: { mimeType: 'image/png', data: imgBuffer.toString('base64') } }
      ]
    });
    
    if (mainWindow) mainWindow.webContents.send('vision-active', false);
    const analysisResult = response.text || "No visual insights found.";
    session.sendToolResponse({ functionResponses: [{ id, name: "analyzeScreen", response: { result: analysisResult } }] });
  } catch (error: any) {
    if (mainWindow) mainWindow.webContents.send('vision-active', false);
    session.sendToolResponse({ functionResponses: [{ id, name: "analyzeScreen", response: { error: error.message } }] });
  }
}

async function handleShowContextTooltip(id: string, args: any, session: any) {
  try {
    const point = screen.getCursorScreenPoint();
    if (mainWindow) {
      mainWindow.webContents.send('show-context-tooltip', {
        text: args.text,
        x: point.x,
        y: point.y
      });
    }
    session.sendToolResponse({ functionResponses: [{ id, name: "showContextTooltip", response: { success: true } }] });
  } catch (error: any) {
    session.sendToolResponse({ functionResponses: [{ id, name: "showContextTooltip", response: { error: error.message } }] });
  }
}

const memoryManager = new MemoryManager();
const emailManager = new EmailManager();
const learningManager = new LearningManager(memoryManager);

let selectionWindow: BrowserWindow | null = null;

async function handleAnalyzeScreenRegion(id: string, args: any, session: any) {
  try {
    const prompt = args.prompt || "Analyze this specific selected region of the screen.";
    const primaryDisplay = screen.getPrimaryDisplay();
    
    selectionWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const html = `
      <html>
      <head>
        <style>
          body { margin: 0; overflow: hidden; cursor: crosshair; background: rgba(0,0,0,0.1); }
          #selection { position: absolute; border: 2px solid #22d3ee; background: rgba(34, 211, 238, 0.2); box-shadow: 0 0 20px rgba(34,211,238,0.5); display: none; }
          .hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #22d3ee; font-family: sans-serif; font-size: 24px; font-weight: bold; pointer-events: none; text-shadow: 0 0 10px #22d3ee; }
        </style>
      </head>
      <body>
        <div class="hint">Draw a rectangle to analyze</div>
        <div id="selection"></div>
        <script>
          const { ipcRenderer } = require('electron');
          let startX, startY, isDragging = false;
          const sel = document.getElementById('selection');
          const hint = document.querySelector('.hint');
          
          window.addEventListener('mousedown', (e) => {
            isDragging = true;
            hint.style.display = 'none';
            startX = e.clientX; startY = e.clientY;
            sel.style.display = 'block';
            sel.style.left = startX + 'px';
            sel.style.top = startY + 'px';
            sel.style.width = '0px';
            sel.style.height = '0px';
          });
          
          window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const currentX = e.clientX; const currentY = e.clientY;
            sel.style.left = Math.min(startX, currentX) + 'px';
            sel.style.top = Math.min(startY, currentY) + 'px';
            sel.style.width = Math.abs(currentX - startX) + 'px';
            sel.style.height = Math.abs(currentY - startY) + 'px';
          });
          
          window.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const width = Math.abs(e.clientX - startX);
            const height = Math.abs(e.clientY - startY);
            if (width < 10 || height < 10) return; // Ignore accidental clicks
            ipcRenderer.send('selection-done', { 
              x: Math.min(startX, e.clientX), 
              y: Math.min(startY, e.clientY), 
              width, height 
            });
          });
          
          window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') ipcRenderer.send('selection-done', null);
          });
        </script>
      </body>
      </html>
    `;
    
    selectionWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const bounds = await new Promise<any>((resolve) => {
      ipcMain.once('selection-done', (e, b) => resolve(b));
    });

    if (selectionWindow) {
      selectionWindow.close();
      selectionWindow = null;
    }

    if (!bounds) {
       session.sendToolResponse({ functionResponses: [{ id, name: "analyzeScreenRegion", response: { result: "User canceled selection." } }] });
       return;
    }

    if (mainWindow) mainWindow.webContents.send('vision-active', true);
    
    const displays = await screenshot.listDisplays();
    const imgBuffer = await screenshot({ screen: displays[0].id });
    const image = nativeImage.createFromBuffer(imgBuffer);
    const croppedBuffer = image.crop(bounds).toPNG();
    
    const visionAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = visionAi.chats.create({ model: 'gemini-2.5-flash' });
    const response = await chat.sendMessage({
      message: [
        { text: prompt },
        { inlineData: { mimeType: 'image/png', data: croppedBuffer.toString('base64') } }
      ]
    });
    
    if (mainWindow) mainWindow.webContents.send('vision-active', false);
    const analysisResult = response.text || "No visual insights found.";
    session.sendToolResponse({ functionResponses: [{ id, name: "analyzeScreenRegion", response: { result: analysisResult } }] });
  } catch (error: any) {
    if (mainWindow) mainWindow.webContents.send('vision-active', false);
    if (selectionWindow) { selectionWindow.close(); selectionWindow = null; }
    session.sendToolResponse({ functionResponses: [{ id, name: "analyzeScreenRegion", response: { error: error.message } }] });
  }
}

function startGeminiServer() {
  const server = http.createServer();
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket, request) => {
    const requestUrl = new URL(request.url || "", `http://${request.headers.host}`);
    const voiceName = requestUrl.searchParams.get("voice") || "Kore";
    const userName = requestUrl.searchParams.get("userName") || "";

    if (!process.env.GEMINI_API_KEY) {
      clientWs.send(JSON.stringify({ type: "error", error: "GEMINI_API_KEY is not configured on the server." }));
      clientWs.close();
      return;
    }

    try {
      clientWs.send(JSON.stringify({ type: "status", status: "connecting" }));
      const systemPrompt = NAVI_SYSTEM_PROMPT + (userName ? `\n\nThe user's name is ${userName}. Address them warmly by name!` : "");

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          systemInstruction: systemPrompt,
          tools: toolsConfig,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ type: "audio", data: part.inlineData.data }));
                }
              }
            }
            if (message.serverContent?.interrupted) clientWs.send(JSON.stringify({ type: "interrupted" }));
            if (message.serverContent?.turnComplete) clientWs.send(JSON.stringify({ type: "turnComplete" }));

            const sc = message.serverContent as unknown as { outputTranscription?: { text?: string }; inputTranscription?: { text?: string } } | undefined;
            if (sc?.outputTranscription?.text) clientWs.send(JSON.stringify({ type: "transcript", role: "navi", text: sc.outputTranscription.text }));
            if (sc?.inputTranscription?.text) clientWs.send(JSON.stringify({ type: "transcript", role: "user", text: sc.inputTranscription.text }));

            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === "analyzeScreen") {
                  handleAnalyzeScreen(call.id, call.args, session);
                } else if (call.name === "analyzeScreenRegion") {
                  handleAnalyzeScreenRegion(call.id, call.args, session);
                } else if (call.name === "showContextTooltip") {
                  handleShowContextTooltip(call.id, call.args, session);
                } else if (call.name === "sendNotification") {
                  try {
                    const args = call.args as { title: string; body: string };
                    if (Notification.isSupported()) {
                      new Notification({ title: args.title, body: args.body, icon: nativeImage.createEmpty() }).show();
                      session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { success: true } }] });
                    } else {
                      session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: "Notifications not supported on this OS" } }] });
                    }
                  } catch (e: any) {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: e.message } }] });
                  }
                } else if (call.name === "remember") {
                  const m = call.args as any;
                  memoryManager.addMemory({
                    id: "mem_" + Date.now(),
                    content: m.content,
                    category: m.category,
                    source: "Voice Agent",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    confidence: 0.9,
                    importance: m.importance || 5,
                    projectId: m.projectId || null,
                    tags: m.tags || "",
                    lastAccessed: Date.now(),
                    accessCount: 1
                  }).then(() => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { result: "Memory saved successfully." } }] });
                  }).catch((err) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: err.message } }] });
                  });
                } else if (call.name === "searchMemory") {
                  memoryManager.searchMemories(call.args.query as string, call.args.projectId as string | null).then((memories) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { memories } }] });
                  }).catch((err) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: err.message } }] });
                  });
                } else if (call.name === "searchEmails") {
                  emailManager.searchEmails(call.args.query as string, call.args.maxResults as number || 5).then((emails) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { emails } }] });
                  }).catch((err) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: err.message } }] });
                  });
                } else if (call.name === "readEmailThread") {
                  emailManager.getThread(call.args.threadId as string).then((threadContent) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { content: threadContent } }] });
                  }).catch((err) => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: err.message } }] });
                  });
                } else if (call.name === "updateLearningProfile") {
                  memoryManager.updateTopicMastery(
                    call.args.topicId as string, 
                    call.args.name as string, 
                    call.args.masteryScore as number
                  );
                  session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { success: true } }] });
                } else if (call.name === "generateFlashcards") {
                  const topicId = call.args.topicId as string;
                  const flashcards = call.args.flashcards as any[];
                  flashcards.forEach((fc: any) => {
                    memoryManager.saveFlashcard({
                      id: `fc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                      topicId,
                      front: fc.front,
                      back: fc.back,
                      nextReviewDate: Date.now() + 86400000, // +1 day initially
                      interval: 1,
                      easeFactor: 2.5
                    });
                  });
                  session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { success: true } }] });
                } else if (call.name === "createFile") {
                  const filePath = call.args.filePath as string;
                  const content = call.args.content as string;
                  const overwrite = !!call.args.overwrite;
                  const targetPath = path.isAbsolute(filePath) ? filePath : path.join(process.env.USERPROFILE || process.cwd(), "Desktop", "Navi-Projects", filePath);
                  
                  fs.stat(targetPath).then(() => {
                    if (!overwrite) {
                      session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: "FILE_EXISTS: File already exists. You must explicitly ask the user if they want to overwrite it, and if so, call this tool again with overwrite: true." } }] });
                      return Promise.reject("ALREADY_SENT");
                    }
                    return Promise.resolve();
                  }).catch((err) => {
                    if (err === "ALREADY_SENT") return Promise.reject(err);
                    if (err.code === 'ENOENT') return Promise.resolve();
                    return Promise.reject(err);
                  }).then(() => {
                    return fs.mkdir(path.dirname(targetPath), { recursive: true });
                  }).then(() => {
                    return fs.writeFile(targetPath, content, 'utf8');
                  }).then(() => {
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { success: true, savedPath: targetPath } }] });
                  }).catch(err => {
                    if (err !== "ALREADY_SENT") {
                      session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: err.message } }] });
                    }
                  });
                } else if (call.name === "openInVSCode") {
                  const targetPath = call.args.targetPath as string;
                  exec(`code "${targetPath}"`, (err, stdout, stderr) => {
                    if (err) {
                      session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { error: err.message || stderr } }] });
                    } else {
                      session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { success: true, message: "Opened in VS Code" } }] });
                    }
                  });
                } else if (call.name === "runTerminalCommand") {
                  const command = call.args.command as string;
                  const cwd = call.args.cwd as string || process.env.USERPROFILE || process.cwd();
                  exec(command, { cwd }, (err, stdout, stderr) => {
                    const output = stdout || stderr || err?.message || "Command executed with no output.";
                    session.sendToolResponse({ functionResponses: [{ id: call.id, name: call.name, response: { output } }] });
                  });
                } else if (call.name === "generateInterviewReport") {
                  memoryManager.saveMemory({
                    id: `interview_${Date.now()}`,
                    content: `Mock Interview Report. Tech Score: ${call.args.technicalScore}. Comm Score: ${call.args.communicationScore}. Strengths: ${(call.args.strengths as string[])?.join(', ')}. Improvements: ${(call.args.improvements as string[])?.join(', ')}.`,
                    category: 'career',
                    tags: 'interview,report,mock',
                    importance: 8
                  });
                  // Also send to frontend to display the report UI
                  clientWs.send(JSON.stringify({ type: "toolCall", id: call.id, name: call.name, args: call.args }));
                } else {
                  clientWs.send(JSON.stringify({ type: "toolCall", id: call.id, name: call.name, args: call.args }));
                }
              }
            }
          },
          onclose: (event) => clientWs.send(JSON.stringify({ type: "status", status: "closed", reason: event?.reason })),
          onerror: (err) => clientWs.send(JSON.stringify({ type: "error", error: err instanceof Error ? err.message : String(err) })),
        },
      });

      clientWs.send(JSON.stringify({ type: "status", status: "connected" }));

      clientWs.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "audio" && msg.data) {
            session.sendRealtimeInput({ audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" } });
          } else if (msg.type === "toolResponse") {
            session.sendToolResponse({ functionResponses: [{ id: msg.id, name: msg.name, response: msg.response || { result: "ok" } }] });
          } else if (msg.type === "text") {
            session.send({ clientContent: { turns: [{ role: 'user', parts: [{ text: msg.text }] }], turnComplete: true } });
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      });

      clientWs.on("close", () => {
        try { session.close(); } catch (e) {}
      });
    } catch (err) {
      console.error("Failed to establish Gemini Live Session:", err);
      clientWs.send(JSON.stringify({ type: "error", error: "Failed to connect to Gemini Live session. Check your API key." }));
      clientWs.close();
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Navi Gemini Proxy listening on http://0.0.0.0:${PORT}`);
  });
}

// ---------------------------------------------------------
// Electron App Logic
// ---------------------------------------------------------
let mainWindow: BrowserWindow | null = null;
let browserView: WebContentsView | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Start with click-through enabled for the transparent background
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.maximize();

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register Global Shortcut
  globalShortcut.register('CommandOrControl+Space', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-overlay');
      
      const text = clipboard.readText();
      if (text && text.trim().length > 0) {
        mainWindow.webContents.send('clipboard-context', text.substring(0, 1000));
      }

      // Fetch active window
      const psCommand = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll", CharSet = CharSet.Unicode)]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          }
"@
        $hwnd = [Win32]::GetForegroundWindow()
        $title = New-Object System.Text.StringBuilder 256
        [Win32]::GetWindowText($hwnd, $title, $title.Capacity) | Out-Null
        Write-Output $title.ToString()
      `;
      const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
      exec(`powershell -EncodedCommand ${encoded}`, (error, stdout) => {
        if (!error && stdout) {
          mainWindow?.webContents.send('active-window-context', stdout.trim());
        }
      });
    }
  });

  initAgentEngine(mainWindow);

  // Setup IPC Handlers
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });
  ipcMain.handle('open-browser', (event, url, bounds) => {
    if (!mainWindow) return;
    
    if (!browserView) {
      browserView = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'browser-preload.mjs'),
        }
      });
      // Set background color to rounded white/dark depending on theme if possible
      browserView.setBackgroundColor('#1E1E1E');
    }
    
    // Always ensure it is added to the window (in case it was removed by close-browser)
    try {
      mainWindow.contentView.removeChildView(browserView);
    } catch (e) {
      // Ignore if not a child
    }
    mainWindow.contentView.addChildView(browserView);
    
    browserView.setBounds(bounds);
    browserView.webContents.loadURL(url);
  });

  ipcMain.handle('close-browser', () => {
    if (browserView && mainWindow) {
      mainWindow.contentView.removeChildView(browserView);
      // We don't destroy it so we can reuse it instantly for performance, just hide it
      // or we can remove the child view which effectively hides it.
    }
  });

  ipcMain.handle('update-browser-bounds', (event, bounds) => {
    if (browserView) {
      browserView.setBounds(bounds);
    }
  });

  ipcMain.handle('navigate-browser', (event, url) => {
    if (browserView) browserView.webContents.loadURL(url);
  });

  ipcMain.handle('browser-go-back', () => {
    if (browserView && browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
    }
  });

  ipcMain.handle('browser-go-forward', () => {
    if (browserView && browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
    }
  });

  ipcMain.handle('browser-reload', () => {
    if (browserView) browserView.webContents.reload();
  });

  ipcMain.handle('read-current-page', () => {
    return new Promise((resolve) => {
      if (!browserView) {
        resolve({ error: "No active browser session to read." });
        return;
      }
      
      const onResponse = (event: any, payload: any) => {
        ipcMain.removeListener('response-page-content', onResponse);
        resolve(payload);
      };
      
      ipcMain.on('response-page-content', onResponse);
      
      // Tell the browser-preload script to extract content
      browserView.webContents.send('request-page-content');
      
      // Timeout to avoid hanging forever
      setTimeout(() => {
        ipcMain.removeListener('response-page-content', onResponse);
        resolve({ error: "Page content extraction timed out." });
      }, 5000);
    });
  });

  ipcMain.handle('scroll-page', (event, direction) => {
    return new Promise((resolve) => {
      if (!browserView) return resolve({ error: "No active browser session." });
      
      const onResponse = (e: any, payload: any) => {
        ipcMain.removeListener('response-scroll-page', onResponse);
        resolve(payload);
      };
      
      ipcMain.on('response-scroll-page', onResponse);
      browserView.webContents.send('scroll-page', direction);
      
      setTimeout(() => {
        ipcMain.removeListener('response-scroll-page', onResponse);
        resolve({ error: "Scroll timed out." });
      }, 2000);
    });
  });

  ipcMain.handle('click-element', (event, text) => {
    return new Promise((resolve) => {
      if (!browserView) return resolve({ error: "No active browser session." });
      
      const onResponse = (e: any, payload: any) => {
        ipcMain.removeListener('response-click-element', onResponse);
        resolve(payload);
      };
      
      ipcMain.on('response-click-element', onResponse);
      browserView.webContents.send('click-element', text);
      
      setTimeout(() => {
        ipcMain.removeListener('response-click-element', onResponse);
        resolve({ error: "Click timed out." });
      }, 3000);
    });
  });

  ipcMain.handle('get-system-diagnostics', async () => {
    try {
      const [cpuLoad, mem, battery] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.battery(),
      ]);
      return {
        cpuUsagePercent: Math.round(cpuLoad.currentLoad),
        totalMemGB: Math.round(mem.total / 1e9),
        freeMemGB: Math.round(mem.free / 1e9),
        usedMemGB: Math.round((mem.total - mem.free) / 1e9),
        batteryPercent: battery.hasBattery ? battery.percent : null,
        isCharging: battery.hasBattery ? battery.isCharging : null,
      };
    } catch (e) {
      return { error: 'Failed to get system diagnostics' };
    }
  });

  ipcMain.handle('launch-application', (event, appName) => {
    return new Promise((resolve) => {
      // In Windows, "start <name>" can launch registered exes or URLs.
      // We wrap it in powershell or cmd
      exec(`start ${appName}`, (error) => {
        if (error) {
          console.error(`Error launching ${appName}:`, error);
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('close-application', (event, appName) => {
    return new Promise((resolve) => {
      const target = appName.toLowerCase().endsWith('.exe') ? appName : `${appName}.exe`;
      exec(`taskkill /IM ${target} /F`, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('power-action', (event, action) => {
    return new Promise((resolve) => {
      let cmd = '';
      if (action === 'sleep') {
        cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
      } else if (action === 'lock') {
        cmd = 'rundll32.exe user32.dll,LockWorkStation';
      } else if (action === 'shutdown') {
        cmd = 'shutdown /s /t 5'; // 5 second delay for safety
      } else if (action === 'restart') {
        cmd = 'shutdown /r /t 5';
      } else {
        return resolve({ success: false, error: 'Unknown action' });
      }

      exec(cmd, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('window-management', (event, action) => {
    return new Promise((resolve) => {
      let psCommand = '';
      if (action === 'minimize_all') {
        psCommand = '(New-Object -ComObject Shell.Application).MinimizeAll()';
      } else if (action === 'restore_all') {
        psCommand = '(New-Object -ComObject Shell.Application).UndoMinimizeAll()';
      } else {
        return resolve({ success: false, error: 'Unknown window action' });
      }
      
      exec(`powershell -command "${psCommand}"`, (error) => {
        resolve(error ? { success: false, error: error.message } : { success: true });
      });
    });
  });

  ipcMain.handle('display-control', (event, { action, value }) => {
    return new Promise((resolve) => {
      let psCommand = '';
      if (action === 'brightness' && value !== undefined) {
        psCommand = `(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${value})`;
      } else if (action === 'dark_mode') {
        psCommand = `Set-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize -Name AppsUseLightTheme -Value 0; Set-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize -Name SystemUsesLightTheme -Value 0`;
      } else if (action === 'light_mode') {
        psCommand = `Set-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize -Name AppsUseLightTheme -Value 1; Set-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize -Name SystemUsesLightTheme -Value 1`;
      } else {
        return resolve({ success: false, error: 'Unknown display action' });
      }

      exec(`powershell -command "${psCommand}"`, (error) => {
        resolve(error ? { success: false, error: error.message } : { success: true });
      });
    });
  });

  ipcMain.handle('get-active-window', () => {
    return new Promise((resolve) => {
      const psCommand = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll", CharSet = CharSet.Unicode)]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          }
"@
        $hwnd = [Win32]::GetForegroundWindow()
        $title = New-Object System.Text.StringBuilder 256
        [Win32]::GetWindowText($hwnd, $title, $title.Capacity) | Out-Null
        Write-Output $title.ToString()
      `;
      // Escape for bash/cmd execution
      const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
      exec(`powershell -EncodedCommand ${encoded}`, (error, stdout) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, title: stdout.trim() });
        }
      });
    });
  });

  ipcMain.handle('proactive-analysis', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
      if (sources.length === 0) return { success: false, result: 'NO_ERROR' };
      const imgBuffer = sources[0].thumbnail.toPNG();
      
      const visionAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = visionAi.chats.create({ model: 'gemini-2.5-flash' });
      const prompt = "Look at this screen. Is the user currently staring at a visible error message, stack trace, exception, or obvious coding problem? If yes, briefly describe the exact error in one concise sentence. If there are no visible errors, output EXACTLY the word 'NO_ERROR' and nothing else.";
      
      const response = await chat.sendMessage({
        message: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: imgBuffer.toString('base64') } }
        ]
      });
      
      const text = response.text?.trim() || 'NO_ERROR';
      return { success: true, result: text };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Developer Mode Handlers
  ipcMain.handle('vscode-control', (event, { action, target, projectPath }) => {
    return new Promise((resolve) => {
      const root = projectPath || path.join(__dirname, '..');
      let cmd = '';
      if (action === 'open_project') {
        cmd = `code "${root}"`;
      } else if (action === 'open_file') {
        cmd = `code "${path.join(root, target || '')}"`;
      } else if (action === 'goto_line') {
        cmd = `code -g "${path.join(root, target || '')}"`;
      } else {
        return resolve({ success: false, error: 'Unknown vscode action' });
      }
      exec(cmd, (error) => {
        resolve(error ? { success: false, error: error.message } : { success: true });
      });
    });
  });

  ipcMain.handle('git-action', (event, { command, projectPath, message }) => {
    return new Promise((resolve) => {
      const root = projectPath || path.join(__dirname, '..');
      const allowedCommands = ['status', 'add', 'commit', 'push', 'pull', 'branch', 'log'];
      const baseCmd = command.split(' ')[0];
      if (!allowedCommands.includes(baseCmd)) {
         return resolve({ success: false, error: 'Git command not allowed for safety' });
      }
      let cmd = `git ${command}`;
      if (baseCmd === 'commit' && message) {
        cmd = `git commit -m "${message.replace(/"/g, '\\"')}"`;
      }
      exec(cmd, { cwd: root }, (error, stdout, stderr) => {
        resolve({ success: !error, output: stdout || stderr, error: error?.message });
      });
    });
  });

  ipcMain.handle('execute-terminal', (event, { command, projectPath }) => {
    return new Promise((resolve) => {
      const root = projectPath || path.join(__dirname, '..');
      if (command.includes('rm -rf') || command.includes('format')) {
         return resolve({ success: false, error: 'Command rejected for safety' });
      }
      exec(command, { cwd: root }, (error, stdout, stderr) => {
        resolve({ success: !error, output: stdout || stderr, error: error?.message });
      });
    });
  });

  ipcMain.handle('read-codebase-file', async (event, { relativePath, projectPath }) => {
    try {
      const root = projectPath || path.join(__dirname, '..');
      const fullPath = path.join(root, relativePath);
      // Basic security
      if (!fullPath.startsWith(root)) {
        return { success: false, error: 'Invalid path' };
      }
      const content = await fs.readFile(fullPath, 'utf-8');
      return { success: true, content };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('media-control', (event, command) => {
    return new Promise((resolve) => {
      let keycode = '';
      switch (command) {
        case 'volume_up': keycode = '0xAF'; break;
        case 'volume_down': keycode = '0xAE'; break;
        case 'mute': keycode = '0xAD'; break;
        case 'next': keycode = '0xB0'; break;
        case 'previous': keycode = '0xB1'; break;
        case 'play_pause': keycode = '0xB3'; break;
        default: return resolve({ success: false, error: 'Unknown media command' });
      }
      
      const psCommand = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class MediaKey { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo); }'; [MediaKey]::keybd_event(${keycode}, 0, 0, 0); [MediaKey]::keybd_event(${keycode}, 0, 2, 0);`;
      
      exec(`powershell -command "${psCommand.replace(/"/g, '\\"')}"`, (error) => {
        resolve(error ? { success: false, error: error.message } : { success: true });
      });
    });
  });

  ipcMain.handle('clipboard-action', (event, { action, text }) => {
    if (action === 'read') return clipboard.readText();
    if (action === 'write') clipboard.writeText(text || '');
    return 'ok';
  });

  ipcMain.handle('type-text', (event, text) => {
    return new Promise((resolve) => {
      // Write to clipboard first for safety and speed with special characters
      clipboard.writeText(text);
      // Send Ctrl+V
      const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait('^v')
      `;
      const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
      exec(`powershell -EncodedCommand ${encoded}`, (error) => {
        resolve(error ? { success: false, error: error.message } : { success: true });
      });
    });
  });

  ipcMain.handle('take-screenshot', async () => {
    try {
      const imgPath = await screenshot({ filename: path.join(process.env.USERPROFILE || '', 'Desktop', `screenshot_${Date.now()}.png`) });
      return { success: true, path: imgPath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delegate-task', async (event, { agentRole, instructions }) => {
    try {
      const result = await executeSubAgent(agentRole, instructions);
      return { success: true, result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delegate-pipeline', async (event, { tasks }) => {
    try {
      const result = await executePipeline(tasks);
      return { success: true, result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('file-operation', async (event, { action, filePath, destPath }) => {
    try {
      const getVirtualPath = (p: string) => {
        const lower = p.toLowerCase();
        const home = require('os').homedir();
        if (lower === 'downloads') return path.join(home, 'Downloads');
        if (lower === 'documents') return path.join(home, 'Documents');
        if (lower === 'desktop') return path.join(home, 'Desktop');
        if (lower === 'pictures') return path.join(home, 'Pictures');
        return p; // Return absolute path if not virtual
      };

      const resolvedPath = getVirtualPath(filePath);
      const resolvedDest = destPath ? getVirtualPath(destPath) : undefined;

      if (action === 'open') {
        const error = await shell.openPath(resolvedPath);
        return error ? { success: false, error } : { success: true };
      } else if (action === 'list') {
        const files = await fs.readdir(resolvedPath);
        return { success: true, files };
      } else if (action === 'create_folder') {
        await fs.mkdir(resolvedPath, { recursive: true });
        return { success: true };
      } else if (action === 'delete') {
        await fs.rm(resolvedPath, { recursive: true, force: true });
        return { success: true };
      } else if (action === 'rename' || action === 'move') {
        if (!resolvedDest) return { success: false, error: 'Destination path required' };
        await fs.rename(resolvedPath, resolvedDest);
        return { success: true };
      } else if (action === 'copy') {
        if (!resolvedDest) return { success: false, error: 'Destination path required' };
        await fs.cp(resolvedPath, resolvedDest, { recursive: true });
        return { success: true };
      }
      return { success: false, error: 'Unknown file action' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('start-workspace', (event, workspace) => {
    return new Promise((resolve) => {
      let apps: string[] = [];
      if (workspace === 'coding') {
        apps = ['code', 'chrome', 'powershell'];
      } else if (workspace === 'gaming') {
        apps = ['steam', 'discord'];
      } else if (workspace === 'study') {
        apps = ['notepad', 'chrome'];
      } else {
        return resolve({ success: false, error: 'Unknown workspace' });
      }

      apps.forEach(app => exec(`start ${app}`));
      resolve({ success: true, apps });
    });
  });
}

  // Second Brain IPCs
  ipcMain.handle('get-all-memories', async () => {
    return memoryManager.getAllMemories();
  });

  ipcMain.handle('search-memories', async (event, { query, projectId }) => {
    return memoryManager.searchMemories(query, projectId);
  });

  ipcMain.handle('delete-memory', async (event, id) => {
    memoryManager.deleteMemory(id);
    return true;
  });

  ipcMain.handle('clear-all-memories', async () => {
    memoryManager.clearAllMemories();
    return true;
  });

  // Email Intelligence IPCs
  ipcMain.handle('get-gmail-status', async () => {
    return emailManager.getStatus();
  });

  ipcMain.handle('save-gmail-credentials', async (event, { clientId, clientSecret }) => {
    return emailManager.saveCredentials(clientId, clientSecret);
  });

  ipcMain.handle('connect-gmail', async () => {
    return emailManager.connect();
  });

  ipcMain.handle('disconnect-gmail', async () => {
    return emailManager.disconnect();
  });

  ipcMain.handle('search-emails', async (event, { query, maxResults }) => {
    try {
      const emails = await emailManager.searchEmails(query, maxResults);
      return { success: true, emails };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Learning Mode IPCs
  ipcMain.handle('get-learning-profile', async () => {
    return memoryManager.getLearningProfile();
  });

  ipcMain.handle('update-topic-mastery', async (event, { id, name, masteryScore }) => {
    memoryManager.updateTopicMastery(id, name, masteryScore);
    return true;
  });

  ipcMain.handle('get-due-flashcards', async () => {
    return memoryManager.getDueFlashcards();
  });

  ipcMain.handle('save-flashcard', async (event, flashcard) => {
    memoryManager.saveFlashcard(flashcard);
    return true;
  });

  ipcMain.handle('ingest-learning-document', async (event, { filePath, topic }) => {
    return learningManager.ingestDocument(filePath, topic);
  });

let tray: Tray | null = null;

app.whenReady().then(() => {
  startGeminiServer();
  createWindow();

  // Create Tray Icon
  const icon = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXY3jP4PgfAAWgA4I9t0/CAAAAAElFTkSuQmCC"); // 1x1 transparent/cyan pixel as fallback
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Navi', click: () => { mainWindow?.show(); } },
    { type: 'separator' },
    { label: 'Quit Navi', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('Navi AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow?.show();
  });
});

ipcMain.handle('send-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: nativeImage.createEmpty() }).show();
    return true;
  }
  return false;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
