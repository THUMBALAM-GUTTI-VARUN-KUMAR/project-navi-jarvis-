import React from "react";
import { Sparkles, Settings, Palette, Radio, Globe } from "lucide-react";
import { SessionState } from "../modules/LiveSession";

interface HeaderBarProps {
  state: SessionState;
  activeVoice: string;
  activeTheme: string;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenIframeModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  activeVoice,
  activeTheme,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenIframeModal,
}) => {
  const getStatusBadge = () => {
    switch (state) {
      case "connecting":
        return {
          text: "Connecting to Navi...",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          dot: "bg-amber-400 animate-ping",
        };
      case "listening":
        return {
          text: "Navi is listening...",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          dot: "bg-emerald-400 animate-pulse",
        };
      case "speaking":
        return {
          text: "Navi is speaking...",
          color: "bg-pink-500/20 text-pink-300 border-pink-500/30",
          dot: "bg-pink-400 animate-bounce",
        };
      default:
        return {
          text: "Tap center orb to start",
          color: "bg-slate-800/60 text-slate-400 border-slate-700/50",
          dot: "bg-slate-500",
        };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-6 flex items-center justify-between">
      {/* App Branding */}
      <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-xl">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-white text-base">Navi</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              AI Voice
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Charming Voice Companion</p>
        </div>
      </div>

      {/* Center Status Badge */}
      <div className="hidden md:flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md transition-all duration-300 ${status.color}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          <span>{status.text}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* In-App Iframe Browser Button */}
        <button
          onClick={onOpenIframeModal}
          className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-xl shadow-lg flex items-center gap-2 text-xs"
          title="Open In-App Web Browser Iframe"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Browser</span>
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={onOpenThemeModal}
          className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-xl shadow-lg flex items-center gap-2 text-xs"
          title="Change Theme Atmosphere"
        >
          <Palette className="w-4 h-4 text-pink-400" />
          <span className="hidden sm:inline capitalize">{activeTheme}</span>
        </button>

        {/* Voice Badge / Selector */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 backdrop-blur-xl text-xs">
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="text-slate-400">Voice:</span>
          <span className="font-semibold text-white">{activeVoice}</span>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettingsModal}
          className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-xl shadow-lg"
          title="Settings & Info"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
