import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  AlertCircle,
  X,
  Volume2,
  Radio,
  StickyNote,
  Terminal,
} from "lucide-react";
import { LiveSession, SessionState, TranscriptItem } from "./modules/LiveSession";
import { ToolLogItem, NoteItem } from "./modules/ToolManager";
import { VoiceOrbCanvas } from "./components/VoiceOrbCanvas";
import { MemoryList } from './components/MemoryList';
import { ToastContainer } from './components/ToastContainer';
import { HeaderBar } from "./components/HeaderBar";
import { ControlBar } from "./components/ControlBar";
import { CaptionsOverlay } from "./components/CaptionsOverlay";
import { VoiceSelectorModal } from "./components/VoiceSelectorModal";
import { ThemeSelectorModal } from "./components/ThemeSelectorModal";
import { AmbientModal } from "./components/AmbientModal";
import { NotesDrawer } from "./components/NotesDrawer";
import { ToolLogsDrawer } from "./components/ToolLogsDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { SmartBrowserContainer } from "./components/SmartBrowserContainer";
import { DeveloperDashboard } from "./components/DeveloperDashboard";
import { AgentDashboard } from "./components/AgentDashboard";
import { VisionOverlay } from "./components/VisionOverlay";
import { SecondBrainDashboard } from "./components/SecondBrainDashboard";
import { EmailDashboard } from "./components/EmailDashboard";
import { LearningDashboard } from "./components/LearningDashboard";
import { CareerDashboard } from "./components/CareerDashboard";
import { CommunicationDashboard } from "./components/CommunicationDashboard";
import { ContextTooltip } from "./components/ContextTooltip";
import { learningBus } from "./events/LearningBus";

export default function App() {
  const [sessionState, setSessionState] = useState<SessionState>("disconnected");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeVoice, setActiveVoice] = useState<string>("Kore");
  const [activeTheme, setActiveTheme] = useState<string>("aurora");
  const [activeAmbientSound, setActiveAmbientSound] = useState<string>("stop");
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("navi_user_name") || "";
  });

  const [inputVolume, setInputVolume] = useState<number>(0);
  const [outputVolume, setOutputVolume] = useState<number>(0);

  const [latestTranscript, setLatestTranscript] = useState<TranscriptItem | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolLogItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Drawer visibility states
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [isAmbientModalOpen, setIsAmbientModalOpen] = useState<boolean>(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState<boolean>(false);
  const [isToolLogsDrawerOpen, setIsToolLogsDrawerOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isIframeModalOpen, setIsIframeModalOpen] = useState<boolean>(false);
  const [iframeUrl, setIframeUrl] = useState<string>("https://www.google.com");
  const [iframeLabel, setIframeLabel] = useState<string>("In-App Browser");

  const [isLearningMode, setIsLearningMode] = useState<boolean>(false);
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false); // Phase 1 Overlay

  const sessionRef = useRef<LiveSession | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Global Shortcut listener
  useEffect(() => {
    if (window.electronAPI) {
      const toggleOverlay = () => {
        setIsOverlayActive(prev => {
          const next = !prev;
          // When active, we want to catch clicks to dismiss, or interact with UI.
          // When inactive, we pass all clicks through.
          if (window.electronAPI && window.electronAPI.setIgnoreMouseEvents) {
            window.electronAPI.setIgnoreMouseEvents(!next, { forward: true });
          }
          
          // Auto connect voice if not connected
          if (next && sessionRef.current && sessionState === "disconnected") {
            sessionRef.current.connect({ voice: activeVoice, userName });
          }

          return next;
        });
      };
      
      window.electronAPI.onToggleOverlay(toggleOverlay);

      // Context Hooks
      const handleActiveWindow = (_event: any, title: string) => {
        if (sessionRef.current && sessionState === "listening") {
          // Send system prompt silently
          sessionRef.current.sendTextMessage(`[System Context: The user's active window/application is currently "${title}". Use this context to better understand their queries if they refer to "this app" or "here".]`);
        }
      };

      const handleClipboard = (_event: any, text: string) => {
        if (sessionRef.current && sessionState === "listening") {
          sessionRef.current.sendTextMessage(`[System Context: The user just copied the following text to their clipboard: "${text}". If they ask a vague question, they are likely referring to this text.]`);
        }
      };

      window.electronAPI.onActiveWindowContext(handleActiveWindow);
      window.electronAPI.onClipboardContext(handleClipboard);
      
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeToggleOverlay();
          window.electronAPI.removeClipboardContext();
          window.electronAPI.removeActiveWindowContext();
        }
      };
    }
  }, [activeVoice, userName, sessionState]);

  // Proactive Analysis Loop (Phase 4)
  useEffect(() => {
    if (sessionState !== "listening" || isOverlayActive) return;

    let isChecking = false;
    const interval = setInterval(async () => {
      if (isChecking || !window.electronAPI) return;
      isChecking = true;
      try {
        const response = await window.electronAPI.proactiveAnalysis();
        if (response.success && response.result !== 'NO_ERROR' && sessionRef.current) {
          sessionRef.current.sendTextMessage(
            `[System Context: PROACTIVE ALERT. You noticed the user is stuck or looking at this error: "${response.result}". Proactively speak up and offer your help immediately!]`
          );
        }
      } catch (e) {
        console.error("Proactive analysis failed", e);
      } finally {
        isChecking = false;
      }
    }, 45000); // Check every 45 seconds

    return () => clearInterval(interval);
  }, [sessionState, isOverlayActive]);

  // Initialize LiveSession instance
  useEffect(() => {
    const unsubLearning = learningBus.subscribe(setIsLearningMode);
    const session = new LiveSession({
      onStateChange: (state) => {
        setSessionState(state);
      },
      onTranscript: (item) => {
        setLatestTranscript(item);
        setTranscripts((prev) => [item, ...prev].slice(0, 50));
      },
      onError: (err) => {
        setErrorMessage(err);
      },
      onThemeChange: (theme) => {
        setActiveTheme(theme);
      },
      onToolExecuted: (log) => {
        setToolLogs((prev) => [log, ...prev]);
      },
      onNotesUpdated: (updatedNotes) => {
        setNotes(updatedNotes);
      },
      onOpenWebsite: (url, label) => {
        setIframeUrl(url);
        if (label) setIframeLabel(label);
        setIsIframeModalOpen(true);
      },
      onCloseUIElement: (elementName) => {
        if (elementName === 'browser' || elementName === 'iframe') setIsIframeModalOpen(false);
        if (elementName === 'notes' || elementName === 'drawer') setIsNotesDrawerOpen(false);
        if (elementName === 'developer' || elementName === 'tools') setIsToolLogsDrawerOpen(false);
        if (elementName === 'voice') setIsVoiceModalOpen(false);
        if (elementName === 'ambient') setIsAmbientModalOpen(false);
      },
      onAmbientSoundChange: (sound) => {
        setActiveAmbientSound(sound);
      },
    });

    sessionRef.current = session;
    setNotes(session.getToolManager().getNotes());

    return () => {
      unsubLearning();
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Poll audio volume levels for animated voice orb
  useEffect(() => {
    const updateLevels = () => {
      if (sessionRef.current) {
        const levels = sessionRef.current.getAudioLevels();
        setInputVolume(levels.inputVolume);
        setOutputVolume(levels.outputVolume);
      }
      animFrameRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleToggleSession = () => {
    if (!sessionRef.current) return;

    if (sessionState === "disconnected") {
      setErrorMessage(null);
      sessionRef.current.connect({
        voice: activeVoice,
        userName: userName,
      });
    } else {
      sessionRef.current.disconnect();
    }
  };

  const handleToggleMute = () => {
    if (!sessionRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    sessionRef.current.setMuted(newMuted);
  };

  const handleSelectVoice = (voice: string) => {
    setActiveVoice(voice);
    if (sessionState !== "disconnected" && sessionRef.current) {
      sessionRef.current.disconnect();
      setTimeout(() => {
        if (sessionRef.current) {
          sessionRef.current.connect({ voice, userName });
        }
      }, 300);
    }
  };

  const handleSelectTheme = (theme: string) => {
    setActiveTheme(theme);
  };

  const handleSelectAmbientSound = (sound: string) => {
    setActiveAmbientSound(sound);
    if (sessionRef.current) {
      sessionRef.current.getToolManager().executeTool("ambient", "playAmbientSound", { sound });
    }
  };

  const handleDeleteNote = (id: string) => {
    if (sessionRef.current) {
      sessionRef.current.getToolManager().deleteNote(id);
    }
  };

  const handleSaveUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("navi_user_name", name);
  };

  // Background gradient map based on theme
  const themeBackgrounds: Record<string, string> = {
    aurora: "from-slate-950 via-purple-950/40 to-slate-950",
    cyberpunk: "from-slate-950 via-cyan-950/40 to-slate-950",
    sunset: "from-slate-950 via-amber-950/40 to-slate-950",
    cosmic: "from-slate-950 via-indigo-950/40 to-slate-950",
    emerald: "from-slate-950 via-teal-950/40 to-slate-950",
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${
        isOverlayActive 
          ? `bg-slate-950/80 bg-gradient-to-b ${themeBackgrounds[activeTheme] || themeBackgrounds.aurora} pointer-events-auto backdrop-blur-md` 
          : "bg-transparent pointer-events-none"
      } text-white font-sans select-none flex flex-col justify-between transition-all duration-700`}
    >
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-700 ${isOverlayActive ? 'opacity-100' : 'opacity-0'}`}>
        <HeaderBar
          state={sessionState}
          activeVoice={activeVoice}
          activeTheme={activeTheme}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenIframeModal={() => setIsIframeModalOpen(true)}
        />

      {errorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-md w-[90%] bg-red-950/90 border border-red-500/50 backdrop-blur-xl text-red-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-xs font-medium leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-lg hover:bg-red-900/50 text-red-400 hover:text-red-200 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLearningMode ? (
        <LearningDashboard />
      ) : (
        <main className="relative flex-1 w-full h-full flex flex-col items-center justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 blur-sm scale-105"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')",
              opacity: isLearningMode ? 0 : 0.15,
            }}
          />
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <VoiceOrbCanvas
              state={sessionState}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
              theme={activeTheme}
            />
          </div>

          {sessionState === "disconnected" && (
            <div className="relative z-10 text-center px-4 max-w-sm space-y-3 pointer-events-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-lg text-xs text-pink-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>Tap Orb below to wake Navi</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                Meet Navi
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                Your witty, charming, and smart real-time AI voice companion.
              </p>

              <div className="pt-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Try asking once connected:
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-slate-300">
                    "Hi Navi, how are you today?"
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-slate-300">
                    "Can you open Wikipedia?"
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-slate-300">
                    "Play some ambient rain sound"
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {!isLearningMode && (
        <CaptionsOverlay latestTranscript={latestTranscript} state={sessionState} />
      )}

      {!isLearningMode && (
        <ControlBar
          state={sessionState}
          isMuted={isMuted}
          activeVoice={activeVoice}
          activeAmbientSound={activeAmbientSound}
          noteCount={notes.length}
          toolLogCount={toolLogs.length}
          onToggleSession={handleToggleSession}
          onToggleMute={handleToggleMute}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          onOpenAmbientModal={() => setIsAmbientModalOpen(true)}
          onOpenNotesDrawer={() => setIsNotesDrawerOpen(true)}
          onOpenToolLogsDrawer={() => setIsToolLogsDrawerOpen(true)}
        />
      )}

      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        activeVoice={activeVoice}
        onSelectVoice={handleSelectVoice}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        activeTheme={activeTheme}
        onSelectTheme={handleSelectTheme}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <AmbientModal
        isOpen={isAmbientModalOpen}
        activeSound={activeAmbientSound}
        onSelectSound={handleSelectAmbientSound}
        onClose={() => setIsAmbientModalOpen(false)}
      />

      <NotesDrawer
        isOpen={isNotesDrawerOpen}
        notes={notes}
        onDeleteNote={handleDeleteNote}
        onClose={() => setIsNotesDrawerOpen(false)}
      />

      <ToolLogsDrawer
        isOpen={isToolLogsDrawerOpen}
        logs={toolLogs}
        onClose={() => setIsToolLogsDrawerOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        userName={userName}
        onSaveUserName={handleSaveUserName}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <SmartBrowserContainer
        isOpen={isIframeModalOpen}
        initialUrl={iframeUrl}
        initialLabel={iframeLabel}
        onClose={() => setIsIframeModalOpen(false)}
      />

      <DeveloperDashboard />
      <AgentDashboard />
      <SecondBrainDashboard />
      <EmailDashboard />
      <LearningDashboard />
      <CareerDashboard />
      <CommunicationDashboard />
      <VisionOverlay />
      <ContextTooltip />

      </div> {/* Close overlay wrapper */}

      <ToastContainer />
    </div>
  );
}
