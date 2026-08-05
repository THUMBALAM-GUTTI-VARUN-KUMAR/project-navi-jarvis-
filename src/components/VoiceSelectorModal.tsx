import React from "react";
import { X, Radio, Check, Sparkles } from "lucide-react";

interface VoiceSelectorModalProps {
  isOpen: boolean;
  activeVoice: string;
  onSelectVoice: (voice: string) => void;
  onClose: () => void;
}

const VOICES = [
  {
    id: "Kore",
    name: "Kore",
    vibe: "Warm, Witty & Charming",
    description: "Default voice for Navi. Highly expressive, playful, and charming with natural warmth.",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    vibe: "Clear, Energetic & Bright",
    description: "Crisp and lively tone. Perfect for snappy conversations and witty banter.",
  },
  {
    id: "Aoede",
    name: "Aoede",
    vibe: "Melodic, Gentle & Soft",
    description: "Soothing and intimate vocal cadence. Ideal for relaxed late-night chats.",
  },
  {
    id: "Leda",
    name: "Leda",
    vibe: "Confident & Sassy",
    description: "Bold, cheeky, and spirited personality tone with high emotional range.",
  },
];

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  activeVoice,
  onSelectVoice,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Choose Voice Vibe</h3>
              <p className="text-xs text-slate-400">Select Navi's vocal personality style</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {VOICES.map((v) => {
            const isSelected = activeVoice === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  onSelectVoice(v.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 border-pink-500/50 text-white shadow-lg shadow-pink-500/10"
                    : "bg-slate-800/50 hover:bg-slate-800 border-white/5 text-slate-300 hover:text-white"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">{v.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {v.vibe}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{v.description}</p>
                </div>
                {isSelected && (
                  <div className="p-1.5 rounded-full bg-pink-500 text-white shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
          <p className="text-[11px] text-slate-400">
            Changing voice takes effect on the next conversation session.
          </p>
        </div>
      </div>
    </div>
  );
};
