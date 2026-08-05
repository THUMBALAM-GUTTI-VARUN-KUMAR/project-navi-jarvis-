/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    getApiKey: () => Promise<string>;
    saveApiKey: (key: string) => Promise<{success: boolean}>;
    openBrowser: any;
    closeBrowser: any;
    updateBrowserBounds: any;
    navigateBrowser: any;
    goBack: any;
    goForward: any;
    reload: any;
    readCurrentPage: any;
    scrollPage: any;
    clickElement: any;
    getSystemDiagnostics: any;
    launchApplication: any;
    closeApplication: any;
    windowManagement: any;
    displayControl: any;
    getActiveWindow: any;
    vscodeControl: any;
    gitAction: any;
    delegateTask: any;
    delegatePipeline: any;
    
    // Second Brain
    getAllMemories: () => Promise<any[]>;
    searchMemories: (args: { query: string; projectId: string | null }) => Promise<any[]>;
    deleteMemory: (id: string) => Promise<boolean>;
    clearAllMemories: () => Promise<boolean>;
    // Email IPCs
    getGmailStatus: () => Promise<{ hasCredentials: boolean; isAuthenticated: boolean }>;
    saveGmailCredentials: (clientId: string, clientSecret: string) => Promise<{ success: boolean; error?: string }>;
    connectGmail: () => Promise<{ success: boolean; error?: string }>;
    disconnectGmail: () => Promise<{ success: boolean; error?: string }>;
    searchEmails: (query: string, maxResults?: number) => Promise<{ success: boolean; emails?: any[]; error?: string }>;

    // Learning IPCs
    getLearningProfile: () => Promise<any[]>;
    updateTopicMastery: (id: string, name: string, masteryScore: number) => Promise<boolean>;
    getDueFlashcards: () => Promise<any[]>;
    saveFlashcard: (flashcard: any) => Promise<boolean>;
    ingestLearningDocument: (filePath: string, topic: string) => Promise<{ success: boolean; chunksProcessed: number; error?: string }>;

    onAgentEvent: (callback: (event: any, payload: any) => void) => void;
    removeAgentEvent: () => void;
    onVisionActive: (callback: (event: any, isActive: boolean) => void) => void;
    removeVisionActive: () => void;
    onActiveWindowContext: (callback: (event: any, title: string) => void) => void;
    removeActiveWindowContext: () => void;
    onContextTooltip: (callback: (event: any, payload: { text: string; x: number; y: number }) => void) => void;
    removeContextTooltip: () => void;
    onToggleOverlay: (callback: () => void) => void;
    removeToggleOverlay: () => void;
    onClipboardContext: (callback: (event: any, text: string) => void) => void;
    removeClipboardContext: () => void;
    setIgnoreMouseEvents: (ignore: boolean, options?: any) => void;
    proactiveAnalysis: () => Promise<{ success: boolean; result?: string; error?: string }>;
    executeTerminal: any;
    readCodebaseFile: any;
    powerAction: any;
    mediaControl: any;
    clipboardAction: any;
    typeText: any;
    takeScreenshot: any;
    fileOperation: any;
    startWorkspace: any;
  };
}
