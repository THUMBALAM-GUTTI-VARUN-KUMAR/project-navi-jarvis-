/**
 * ToolManager
 * Executes browser-side function calls requested by Navi and formats responses.
 */

import { AmbientAudioEngine } from "./AmbientAudioEngine";
import { toastBus, ToastType } from "./ToastEventBus";

export interface ToolLogItem {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: number;
}

export interface NoteItem {
  id: string;
  content: string;
  category?: string;
  createdAt: number;
}

export class ToolManager {
  private toolLogs: ToolLogItem[] = [];
  private notes: NoteItem[] = [];
  private ambientEngine: AmbientAudioEngine;
  private onThemeChangeCallback?: (theme: string) => void;
  private onToolExecutedCallback?: (log: ToolLogItem) => void;
  private onNotesUpdatedCallback?: (notes: NoteItem[]) => void;
  private onOpenWebsiteCallback?: (url: string, label?: string) => void;
  private onAmbientSoundChangeCallback?: (sound: string) => void;
  private onLearningModeToggleCallback?: (active: boolean) => void;
  private onCloseUIElementCallback?: (elementName: string) => void;

  constructor() {
    this.ambientEngine = new AmbientAudioEngine();
    this.loadNotesFromStorage();
  }

  public setCallbacks(callbacks: {
    onThemeChange?: (theme: string) => void;
    onToolExecuted?: (log: ToolLogItem) => void;
    onNotesUpdated?: (notes: NoteItem[]) => void;
    onOpenWebsite?: (url: string, label?: string) => void;
    onAmbientSoundChange?: (sound: string) => void;
    onLearningModeToggle?: (active: boolean) => void;
    onCloseUIElement?: (elementName: string) => void;
  }): void {
    if (callbacks.onThemeChange) this.onThemeChangeCallback = callbacks.onThemeChange;
    if (callbacks.onToolExecuted) this.onToolExecutedCallback = callbacks.onToolExecuted;
    if (callbacks.onNotesUpdated) this.onNotesUpdatedCallback = callbacks.onNotesUpdated;
    if (callbacks.onOpenWebsite) this.onOpenWebsiteCallback = callbacks.onOpenWebsite;
    if (callbacks.onAmbientSoundChange) this.onAmbientSoundChangeCallback = callbacks.onAmbientSoundChange;
    if (callbacks.onLearningModeToggle) this.onLearningModeToggleCallback = callbacks.onLearningModeToggle;
    if (callbacks.onCloseUIElement) this.onCloseUIElementCallback = callbacks.onCloseUIElement;
  }

  public async executeTool(
    id: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let result: Record<string, unknown> = { success: true };

    try {
      switch (name) {
        case 'openWebsite': {
          const url = (args.url as string) || '';
          const label = (args.label as string) || url;
          if (url) {
            let formattedUrl = url;
            if (!/^https?:\/\//i.test(formattedUrl)) {
              formattedUrl = 'https://' + formattedUrl;
            }
            if (this.onOpenWebsiteCallback) {
              this.onOpenWebsiteCallback(formattedUrl, label);
            } else {
              window.open(formattedUrl, '_blank', 'noopener,noreferrer');
            }
            result = { success: true, openedUrl: formattedUrl, label };
          } else {
            result = { success: false, error: 'No URL provided' };
          }
          break;
        }

        case 'readCurrentPage': {
          if (window.electronAPI && window.electronAPI.readCurrentPage) {
            const pageData = await window.electronAPI.readCurrentPage();
            result = { success: true, pageData };
          } else {
            result = { success: false, error: 'Electron API is not available to read the page.' };
          }
          break;
        }

        case 'scrollPage': {
          const direction = (args.direction as string) || 'down';
          if (window.electronAPI && window.electronAPI.scrollPage) {
            const scrollResult = await window.electronAPI.scrollPage(direction);
            result = { success: true, scrollResult };
          } else {
            result = { success: false, error: 'Electron API is not available.' };
          }
          break;
        }

        case 'clickElement': {
          const text = (args.text as string) || '';
          if (window.electronAPI && window.electronAPI.clickElement) {
            const clickResult = await window.electronAPI.clickElement(text);
            result = { success: true, clickResult };
          } else {
            result = { success: false, error: 'Electron API is not available.' };
          }
          break;
        }

        case 'changeTheme': {
          const theme = ((args.theme as string) || 'aurora').toLowerCase();
          const validThemes = ['aurora', 'cyberpunk', 'sunset', 'cosmic', 'emerald'];
          const selectedTheme = validThemes.includes(theme) ? theme : 'aurora';
          
          if (this.onThemeChangeCallback) {
            this.onThemeChangeCallback(selectedTheme);
          }
          result = { success: true, theme: selectedTheme };
          break;
        }

        case 'playAmbientSound': {
          const sound = ((args.sound as string) || 'rain').toLowerCase();
          this.ambientEngine.play(sound);
          // Notify App so the ambient button stays in sync
          if (this.onAmbientSoundChangeCallback) {
            this.onAmbientSoundChangeCallback(sound);
          }
          result = { success: true, sound, isPlaying: sound !== 'stop' };
          break;
        }

        case 'saveNote': {
          const content = (args.content as string) || '';
          const category = (args.category as string) || 'general';
          if (content) {
            const note: NoteItem = {
              id: 'note_' + Date.now(),
              content,
              category,
              createdAt: Date.now(),
            };
            this.notes.unshift(note);
            this.saveNotesToStorage();
            if (this.onNotesUpdatedCallback) {
              this.onNotesUpdatedCallback(this.notes);
            }
            result = { success: true, savedNote: note };
          } else {
            result = { success: false, error: 'Empty note content' };
          }
          break;
        }

        case 'setLearningModeState': {
          const active = !!args.active;
          if (this.onLearningModeToggleCallback) {
            this.onLearningModeToggleCallback(active);
          }
          result = { success: true, active };
          break;
        }

        case 'updateWhiteboard': {
          import('../events/LearningBus').then(({ learningBus }) => {
            learningBus.updateWhiteboard(
              (args.topic as string) || 'Learning',
              (args.concept as string) || '',
              (args.content as string) || ''
            );
          });
          result = { success: true };
          break;
        }

        case 'generateMindMap': {
          import('../events/LearningBus').then(({ learningBus }) => {
            learningBus.generateMindMap(
              (args.rootNode as string) || 'Concept',
              (args.children as string[]) || []
            );
          });
          result = { success: true };
          break;
        }

        case 'visualizeAlgorithm': {
          import('../events/LearningBus').then(({ learningBus }) => {
            learningBus.visualizeAlgorithm(
              (args.algorithm as string) || 'Algorithm',
              (args.data as number[]) || []
            );
          });
          result = { success: true };
          break;
        }

        case 'closeUIElement': {
          const elementName = (args.elementName as string)?.toLowerCase();
          if (this.onCloseUIElementCallback) {
            this.onCloseUIElementCallback(elementName);
          }
          result = { success: true, closed: elementName };
          break;
        }

        case 'setCareerModeState': {
          const active = !!args.active;
          const view = args.view as string;
          import('../events/CareerBus').then(({ careerBus }) => {
            if (active) {
              careerBus.open(view);
            } else {
              careerBus.close();
            }
          });
          result = { success: true };
          break;
        }

        case 'setCommunicationModeState': {
          const active = !!args.active;
          const mode = args.mode as string;
          import('../events/CommunicationBus').then(({ communicationBus }) => {
            if (active) {
              communicationBus.open(mode);
            } else {
              communicationBus.close();
            }
          });
          
          if (active) {
            result = { 
              success: true, 
              system_instruction: "CRITICAL SYSTEM OVERRIDE: Communication Mode is now ACTIVE. You MUST now strictly behave as an English Communication Coach. Correct the user's grammar, pronunciation, and vocabulary AFTER they finish speaking. Do NOT behave as a normal AI assistant until this mode is deactivated."
            };
          } else {
            result = { 
              success: true, 
              system_instruction: "Communication Mode DEACTIVATED. You are now back to normal assistant mode. Stop correcting English."
            };
          }
          break;
        }

        case 'generateCommunicationReport': {
          const fluency = (args.fluency as number) || 100;
          const grammar = (args.grammar as number) || 100;
          const vocabulary = (args.vocabulary as number) || 100;
          
          import('../events/CommunicationBus').then(({ communicationBus }) => {
            communicationBus.updateStats(fluency, grammar, vocabulary);
          });
          
          toastBus.show('Communication Session Report Saved', 'success', 5000);
          result = { success: true };
          break;
        }

        case 'generateInterviewReport': {
          import('../events/CareerBus').then(({ careerBus }) => {
            careerBus.open('dashboard');
          });
          // Also toast it
          toastBus.show('Interview Report Generated & Saved to Memory', 'success', 5000);
          result = { success: true };
          break;
        }

        case 'getSystemDiagnostics': {
          if (window.electronAPI && window.electronAPI.getSystemDiagnostics) {
            const diag = await window.electronAPI.getSystemDiagnostics();
            result = { success: true, diagnostics: diag };
          } else {
            result = { success: false, error: 'Diagnostics not available' };
          }
          break;
        }

        case 'showToast': {
          const message = (args.message as string) || '';
          const type = (args.type as ToastType) || 'info';
          toastBus.show(message, type, 4000);
          result = { success: true };
          break;
        }

        case 'launchApplication': {
          const appName = args.appName as string;
          if (appName && window.electronAPI && window.electronAPI.launchApplication) {
            toastBus.show(`Launching ${appName}...`, 'info');
            const res = await window.electronAPI.launchApplication(appName);
            result = res.success ? { success: true, message: `Launched ${appName}` } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid appName or API missing' };
          }
          break;
        }

        case 'closeApplication': {
          const appName = args.appName as string;
          if (appName && window.electronAPI && window.electronAPI.closeApplication) {
            toastBus.show(`Closing ${appName}...`, 'warning');
            const res = await window.electronAPI.closeApplication(appName);
            result = res.success ? { success: true, message: `Closed ${appName}` } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid appName or API missing' };
          }
          break;
        }

        case 'windowManagement': {
          const action = args.action as string;
          if (action && window.electronAPI && window.electronAPI.windowManagement) {
            toastBus.show(`Window action: ${action.replace('_', ' ')}`, 'info');
            const res = await window.electronAPI.windowManagement(action);
            result = res.success ? { success: true } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid action or API missing' };
          }
          break;
        }

        case 'displayControl': {
          const action = args.action as string;
          const value = args.value as number;
          if (action && window.electronAPI && window.electronAPI.displayControl) {
            toastBus.show(`Display: ${action.replace('_', ' ')}`, 'info');
            const res = await window.electronAPI.displayControl({ action, value });
            result = res.success ? { success: true } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid action or API missing' };
          }
          break;
        }

        case 'getActiveWindow': {
          if (window.electronAPI && window.electronAPI.getActiveWindow) {
            const res = await window.electronAPI.getActiveWindow();
            result = res.success ? { success: true, activeWindow: res.title } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'API missing' };
          }
          break;
        }

        case 'vscodeControl': {
          const action = args.action as string;
          const target = args.target as string;
          if (action && window.electronAPI && window.electronAPI.vscodeControl) {
            toastBus.show(`VS Code: ${action.replace('_', ' ')}`, 'info');
            const res = await window.electronAPI.vscodeControl({ action, target });
            result = res.success ? { success: true } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid action or API missing' };
          }
          break;
        }

        case 'gitAction': {
          const command = args.command as string;
          const message = args.message as string;
          if (command && window.electronAPI && window.electronAPI.gitAction) {
            toastBus.show(`Git: ${command}`, 'info');
            const res = await window.electronAPI.gitAction({ command, message });
            result = res.success ? { success: true, output: res.output } : { success: false, error: res.error, output: res.output };
          } else {
            result = { success: false, error: 'Invalid command or API missing' };
          }
          break;
        }

        case 'executeTerminal': {
          const command = args.command as string;
          if (command && window.electronAPI && window.electronAPI.executeTerminal) {
            toastBus.show(`Terminal: ${command}`, 'warning');
            const res = await window.electronAPI.executeTerminal({ command });
            result = res.success ? { success: true, output: res.output } : { success: false, error: res.error, output: res.output };
          } else {
            result = { success: false, error: 'Invalid command or API missing' };
          }
          break;
        }

        case 'readCodebaseFile': {
          const relativePath = args.relativePath as string;
          if (relativePath && window.electronAPI && window.electronAPI.readCodebaseFile) {
            const res = await window.electronAPI.readCodebaseFile({ relativePath });
            result = res.success ? { success: true, content: res.content } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid path or API missing' };
          }
          break;
        }

        case 'toggleDeveloperDashboard': {
          const visible = args.visible as boolean;
          if (visible !== undefined) {
             const { dashboardBus } = await import('../events/DashboardBus');
             dashboardBus.toggle(visible);
             toastBus.show(visible ? 'Developer Dashboard Opened' : 'Developer Dashboard Closed', 'success');
             result = { success: true };
          } else {
             result = { success: false, error: 'Missing visible parameter' };
          }
          break;
        }

        case 'toggleAgentDashboard': {
          const visible = args.visible as boolean;
          if (visible !== undefined) {
             const { agentBus } = await import('../events/AgentBus');
             agentBus.toggle(visible);
             toastBus.show(visible ? 'Agent Dashboard Opened' : 'Agent Dashboard Closed', 'success');
             result = { success: true };
          } else {
             result = { success: false, error: 'Missing visible parameter' };
          }
          break;
        }

        case 'delegateTask': {
          const agentRole = args.agentRole as string;
          const instructions = args.instructions as string;
          if (agentRole && instructions && window.electronAPI && window.electronAPI.delegateTask) {
            toastBus.show(`Delegating to ${agentRole}...`, 'info');
            const res = await window.electronAPI.delegateTask({ agentRole, instructions });
            result = res.success ? { success: true, result: res.result } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Missing arguments or API' };
          }
          break;
        }

        case 'delegatePipeline': {
          const tasks = args.tasks as any[];
          if (tasks && window.electronAPI && window.electronAPI.delegatePipeline) {
            toastBus.show(`Executing pipeline of ${tasks.length} agents...`, 'info');
            const res = await window.electronAPI.delegatePipeline({ tasks });
            result = res.success ? { success: true, result: res.result } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Missing tasks or API' };
          }
          break;
        }

        case 'powerAction': {
          const action = args.action as string;
          if (action && window.electronAPI && window.electronAPI.powerAction) {
            toastBus.show(`Executing power action: ${action}`, 'warning');
            const res = await window.electronAPI.powerAction(action);
            result = res.success ? { success: true } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid action or API missing' };
          }
          break;
        }

        case 'mediaControl': {
          const command = args.command as string;
          if (command && window.electronAPI && window.electronAPI.mediaControl) {
            toastBus.show(`Media: ${command.replace('_', ' ')}`, 'info');
            const res = await window.electronAPI.mediaControl(command);
            result = res.success ? { success: true } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'API missing' };
          }
          break;
        }

        case 'clipboardAction': {
          const action = args.action as string;
          if (action && window.electronAPI && window.electronAPI.clipboardAction) {
            const res = await window.electronAPI.clipboardAction({ action, text: args.text });
            if (res.success) {
              toastBus.show(`Clipboard ${action} successful`, 'success');
              result = { success: true, text: res.text };
            } else {
              result = { success: false, error: res.error };
            }
          } else {
            result = { success: false, error: 'API missing' };
          }
          break;
        }

        case 'typeText': {
          const text = args.text as string;
          if (text && window.electronAPI && window.electronAPI.typeText) {
            toastBus.show('Typing...', 'info');
            const res = await window.electronAPI.typeText(text);
            result = res.success ? { success: true } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Missing text or API' };
          }
          break;
        }

        case 'takeScreenshot': {
          if (window.electronAPI && window.electronAPI.takeScreenshot) {
            toastBus.show('Capturing screenshot...', 'info');
            const res = await window.electronAPI.takeScreenshot();
            if (res.success) {
              toastBus.show('Screenshot saved to Desktop', 'success');
              result = { success: true, path: res.path };
            } else {
              toastBus.show('Screenshot failed', 'error');
              result = { success: false, error: res.error };
            }
          } else {
            result = { success: false, error: 'API missing' };
          }
          break;
        }

        case 'fileOperation': {
          const action = args.action as string;
          const filePath = args.filePath as string;
          const destPath = args.destPath as string;
          if (action && filePath && window.electronAPI && window.electronAPI.fileOperation) {
            toastBus.show(`File action: ${action}`, 'warning');
            const res = await window.electronAPI.fileOperation({ action, filePath, destPath });
            result = res.success ? { success: true, ...res } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Missing arguments or API' };
          }
          break;
        }

        case 'startWorkspace': {
          const workspace = args.workspace as string;
          if (workspace && window.electronAPI && window.electronAPI.startWorkspace) {
            toastBus.show(`Starting ${workspace} workspace...`, 'success');
            const res = await window.electronAPI.startWorkspace(workspace);
            result = res.success ? { success: true, apps: res.apps } : { success: false, error: res.error };
          } else {
            result = { success: false, error: 'Invalid workspace or API missing' };
          }
          break;
        }

        case 'getMemories': {
          result = { success: true, memories: this.notes };
          break;
        }

        case 'forgetMemory': {
          const id = args.id as string;
          if (id) {
            const initialLength = this.notes.length;
            this.deleteNote(id);
            if (this.notes.length < initialLength) {
              result = { success: true, message: `Memory ${id} forgotten.` };
            } else {
              result = { success: false, error: `Memory with id ${id} not found.` };
            }
          } else {
            result = { success: false, error: 'No memory id provided.' };
          }
          break;
        }

        case 'clearAllMemories': {
          this.notes = [];
          this.saveNotesToStorage();
          if (this.onNotesUpdatedCallback) {
            this.onNotesUpdatedCallback(this.notes);
          }
          result = { success: true, message: 'All memories cleared successfully.' };
          break;
        }

        case 'getSystemInfo': {
          const now = new Date();
          result = {
            success: true,
            localTime: now.toLocaleTimeString(),
            localDate: now.toLocaleDateString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            currentTheme: 'active',
            ambientSound: this.ambientEngine.getCurrentSound(),
          };
          break;
        }

        default: {
          result = { success: true, message: `Tool ${name} called successfully` };
        }
      }
    } catch (err) {
      result = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const logItem: ToolLogItem = {
      id,
      name,
      args,
      result,
      timestamp: Date.now(),
    };

    this.toolLogs.unshift(logItem);

    if (this.onToolExecutedCallback) {
      this.onToolExecutedCallback(logItem);
    }

    return result;
  }

  public getLogs(): ToolLogItem[] {
    return this.toolLogs;
  }

  public getNotes(): NoteItem[] {
    return this.notes;
  }

  public deleteNote(noteId: string): void {
    this.notes = this.notes.filter((n) => n.id !== noteId);
    this.saveNotesToStorage();
    if (this.onNotesUpdatedCallback) {
      this.onNotesUpdatedCallback(this.notes);
    }
  }

  public stopAmbientSound(): void {
    this.ambientEngine.stop();
  }

  public getCurrentAmbientSound(): string {
    return this.ambientEngine.getCurrentSound();
  }

  private saveNotesToStorage(): void {
    try {
      localStorage.setItem('navi_notes', JSON.stringify(this.notes));
    } catch (e) {
      // ignore
    }
  }

  private loadNotesFromStorage(): void {
    try {
      const stored = localStorage.getItem('navi_notes');
      if (stored) {
        this.notes = JSON.parse(stored);
      }
    } catch (e) {
      this.notes = [];
    }
  }
}
