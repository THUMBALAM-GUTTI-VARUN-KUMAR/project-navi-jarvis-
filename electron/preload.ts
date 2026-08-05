import { contextBridge, ipcRenderer } from 'electron';

export interface BrowserViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  openBrowser: (url: string, bounds: BrowserViewBounds) => ipcRenderer.invoke('open-browser', url, bounds),
  closeBrowser: () => ipcRenderer.invoke('close-browser'),
  updateBrowserBounds: (bounds: BrowserViewBounds) => ipcRenderer.invoke('update-browser-bounds', bounds),
  navigateBrowser: (url: string) => ipcRenderer.invoke('navigate-browser', url),
  goBack: () => ipcRenderer.invoke('browser-go-back'),
  goForward: () => ipcRenderer.invoke('browser-go-forward'),
  reload: () => ipcRenderer.invoke('browser-reload'),
  readCurrentPage: () => ipcRenderer.invoke('read-current-page'),
  scrollPage: (direction: string) => ipcRenderer.invoke('scroll-page', direction),
  clickElement: (text: string) => ipcRenderer.invoke('click-element', text),
  getSystemDiagnostics: () => ipcRenderer.invoke('get-system-diagnostics'),
  launchApplication: (appName: string) => ipcRenderer.invoke('launch-application', appName),
  closeApplication: (appName: string) => ipcRenderer.invoke('close-application', appName),
  windowManagement: (action: string) => ipcRenderer.invoke('window-management', action),
  displayControl: (args: any) => ipcRenderer.invoke('display-control', args),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  vscodeControl: (args: any) => ipcRenderer.invoke('vscode-control', args),
  gitAction: (args: any) => ipcRenderer.invoke('git-action', args),
  executeTerminal: (args: any) => ipcRenderer.invoke('execute-terminal', args),
  readCodebaseFile: (args: any) => ipcRenderer.invoke('read-codebase-file', args),
  powerAction: (action: string) => ipcRenderer.invoke('power-action', action),
  mediaControl: (command: string) => ipcRenderer.invoke('media-control', command),
  clipboardAction: (args: any) => ipcRenderer.invoke('clipboard-action', args),
  typeText: (text: string) => ipcRenderer.invoke('type-text', text),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  fileOperation: (args: any) => ipcRenderer.invoke('file-operation', args),
  startWorkspace: (workspace: string) => ipcRenderer.invoke('start-workspace', workspace),
  delegateTask: (args: any) => ipcRenderer.invoke('delegate-task', args),
  delegatePipeline: (args: any) => ipcRenderer.invoke('delegate-pipeline', args),
  
  // Second Brain
  getAllMemories: () => ipcRenderer.invoke('get-all-memories'),
  searchMemories: (args: any) => ipcRenderer.invoke('search-memories', args),
  deleteMemory: (id: string) => ipcRenderer.invoke('delete-memory', id),
  clearAllMemories: () => ipcRenderer.invoke('clear-all-memories'),

  // Email Intelligence IPCs
  getGmailStatus: () => ipcRenderer.invoke('get-gmail-status'),
  saveGmailCredentials: (clientId: string, clientSecret: string) => ipcRenderer.invoke('save-gmail-credentials', { clientId, clientSecret }),
  connectGmail: () => ipcRenderer.invoke('connect-gmail'),
  disconnectGmail: () => ipcRenderer.invoke('disconnect-gmail'),
  searchEmails: (query: string, maxResults?: number) => ipcRenderer.invoke('search-emails', { query, maxResults }),
  
  // Learning IPCs
  getLearningProfile: () => ipcRenderer.invoke('get-learning-profile'),
  updateTopicMastery: (id: string, name: string, masteryScore: number) => ipcRenderer.invoke('update-topic-mastery', { id, name, masteryScore }),
  getDueFlashcards: () => ipcRenderer.invoke('get-due-flashcards'),
  saveFlashcard: (flashcard: any) => ipcRenderer.invoke('save-flashcard', flashcard),
  ingestLearningDocument: (filePath: string, topic: string) => ipcRenderer.invoke('ingest-learning-document', { filePath, topic }),

  onAgentEvent: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('agent-event', callback);
  },
  removeAgentEvent: () => {
    ipcRenderer.removeAllListeners('agent-event');
  },
  onVisionActive: (callback: (event: any, isActive: boolean) => void) => {
    ipcRenderer.on('vision-active', callback);
  },
  removeVisionActive: () => {
    ipcRenderer.removeAllListeners('vision-active');
  },
  onContextTooltip: (callback: (event: any, payload: { text: string; x: number; y: number }) => void) => {
    ipcRenderer.on('show-context-tooltip', callback);
  },
  removeContextTooltip: () => {
    ipcRenderer.removeAllListeners('show-context-tooltip');
  },
  onActiveWindowContext: (callback: (event: any, title: string) => void) => {
    ipcRenderer.on('active-window-context', callback);
  },
  removeActiveWindowContext: () => {
    ipcRenderer.removeAllListeners('active-window-context');
  },
  onToggleOverlay: (callback: () => void) => {
    ipcRenderer.on('toggle-overlay', callback);
  },
  removeToggleOverlay: () => {
    ipcRenderer.removeAllListeners('toggle-overlay');
  },
  onClipboardContext: (callback: (event: any, text: string) => void) => {
    ipcRenderer.on('clipboard-context', callback);
  },
  removeClipboardContext: () => {
    ipcRenderer.removeAllListeners('clipboard-context');
  },
  setIgnoreMouseEvents: (ignore: boolean, options?: any) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  proactiveAnalysis: () => ipcRenderer.invoke('proactive-analysis'),
});
