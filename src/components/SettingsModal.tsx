import React, { useState } from "react";
import { X, Settings, User, Mic, Volume2, CheckCircle, ShieldCheck, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  userName: string;
  onSaveUserName: (name: string) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  userName,
  onSaveUserName,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(userName);
  const [audioTestState, setAudioTestState] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveUserName(nameInput.trim());
    onClose();
  };

  const handleTestAudio = () => {
    setAudioTestState(true);
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      setTimeout(() => setAudioTestState(false), 800);
    } catch (e) {
      setAudioTestState(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-white/10">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Navi Settings</h3>
              <p className="text-xs text-slate-400">Preferences & Audio System Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Nickname Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            Your Name / Nickname
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="e.g. Alex"
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 text-sm"
          />
          <p className="text-[11px] text-slate-500">
            Navi will address you by name during voice sessions.
          </p>
        </div>

        {/* Audio Output Diagnostic Test */}
        <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200">Audio Playback Test</span>
            </div>
            <button
              onClick={handleTestAudio}
              disabled={audioTestState}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition-all"
            >
              {audioTestState ? "Testing..." : "Test Audio"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Click to verify your speakers/headphones can play Web Audio output.
          </p>
        </div>

        {/* Gemini Live Spec & Health */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gemini Live API Bridge Spec</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="p-2 rounded-xl bg-slate-900 border border-white/5">
              <span className="text-slate-500 block">Model:</span>
              <span className="text-slate-200 font-mono text-[10px]">gemini-3.1-flash-live</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-white/5">
              <span className="text-slate-500 block">Streaming Rate:</span>
              <span className="text-slate-200 font-mono text-[10px]">16kHz In / 24kHz Out</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
