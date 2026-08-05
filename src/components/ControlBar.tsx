import React from "react";
import { Mic, MicOff, Volume2, Radio, StickyNote, Terminal, Power, Brain, Mail, GraduationCap } from "lucide-react";
import { secondBrainBus } from "../events/SecondBrainBus";
import { emailBus } from "../events/EmailBus";
import { learningBus } from "../events/LearningBus";
import { SessionState } from "../modules/LiveSession";

interface ControlBarProps {
  state: SessionState;
  isMuted: boolean;
  activeVoice: string;
  activeAmbientSound: string;
  noteCount: number;
  toolLogCount: number;
  onToggleSession: () => void;
  onToggleMute: () => void;
  onOpenVoiceModal: () => void;
  onOpenAmbientModal: () => void;
  onOpenNotesDrawer: () => void;
  onOpenToolLogsDrawer: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  state,
  isMuted,
  activeVoice,
  activeAmbientSound,
  noteCount,
  toolLogCount,
  onToggleSession,
  onToggleMute,
  onOpenVoiceModal,
  onOpenAmbientModal,
  onOpenNotesDrawer,
  onOpenToolLogsDrawer,
}) => {
  const isConnected = state === "listening" || state === "speaking" || state === "connecting";

  return (
    <div className="absolute bottom-6 left-0 right-0 z-30 px-4 flex justify-center pointer-events-auto">
      <div className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-purple-950/40">
        {/* Voice Selector */}
        <button
          onClick={onOpenVoiceModal}
          className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          title="Choose Navi Voice"
        >
          <Radio className="w-4 h-4 text-purple-400" />
          <span className="hidden md:inline">{activeVoice}</span>
        </button>

        {/* Ambient Sounds */}
        <button
          onClick={onOpenAmbientModal}
          className={`p-3 sm:px-4 sm:py-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-medium ${
            activeAmbientSound !== "stop"
              ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/20"
              : "bg-slate-800/60 hover:bg-slate-700/80 border-white/5 text-slate-300 hover:text-white"
          }`}
          title="Ambient Soundscape Generator"
        >
          <Volume2 className="w-4 h-4 text-pink-400" />
          <span className="hidden md:inline capitalize">
            {activeAmbientSound === "stop" ? "Ambient" : activeAmbientSound}
          </span>
        </button>

        {/* Main Center Microphone / Orb Toggle Power Button */}
        <div className="relative group mx-1">
          <div
            className={`absolute -inset-2 rounded-full blur-md opacity-75 transition duration-500 group-hover:opacity-100 ${
              isConnected
                ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse"
                : "bg-gradient-to-r from-slate-600 to-slate-800"
            }`}
          />
          <button
            onClick={onToggleSession}
            disabled={state === "connecting"}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
              isConnected
                ? "bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 text-white shadow-pink-500/50"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10"
            }`}
            title={isConnected ? "Disconnect Navi Session" : "Start Navi Voice Session"}
          >
            {state === "connecting" ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isConnected ? (
              <Power className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-pink-400 group-hover:text-pink-300" />
            )}
          </button>
        </div>

        {/* Microphone Mute Toggle */}
        <button
          onClick={onToggleMute}
          disabled={!isConnected}
          className={`p-3 sm:px-4 sm:py-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-medium ${
            !isConnected
              ? "opacity-40 cursor-not-allowed bg-slate-800/40 border-white/5 text-slate-500"
              : isMuted
              ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse"
              : "bg-slate-800/60 hover:bg-slate-700/80 border-white/5 text-slate-300 hover:text-white"
          }`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span className="hidden md:inline">{isMuted ? "Muted" : "Mic On"}</span>
        </button>

        {/* Notes Button */}
        <button
          onClick={onOpenNotesDrawer}
          className="relative p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          title="Scratchpad & Notes"
        >
          <StickyNote className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Notes</span>
          {noteCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
              {noteCount}
            </span>
          )}
        </button>

        {/* Second Brain Button */}
        <button
          onClick={() => secondBrainBus.toggle()}
          className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          title="Second Brain Dashboard"
        >
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Brain</span>
        </button>

        {/* Email Intelligence Button */}
        <button
          onClick={() => emailBus.toggle()}
          className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          title="Email Intelligence"
        >
          <Mail className="w-4 h-4 text-blue-400" />
          <span className="hidden md:inline">Email</span>
        </button>

        {/* Learning Mode Tutor Button */}
        <button
          onClick={() => learningBus.open()}
          className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 border border-cyan-500/20 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          title="Start Learning Mode"
        >
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline text-cyan-100">Tutor</span>
        </button>

        {/* Tool Call Activity Log Drawer */}
        <button
          onClick={onOpenToolLogsDrawer}
          className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium relative"
          title="Browser Tool Actions Executed"
        >
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Tools</span>
          {toolLogCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {toolLogCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
