import React from "react";
import { X, Palette, Check } from "lucide-react";

interface ThemeSelectorModalProps {
  isOpen: boolean;
  activeTheme: string;
  onSelectTheme: (theme: string) => void;
  onClose: () => void;
}

const THEMES = [
  {
    id: "aurora",
    name: "Romantic Aurora",
    color: "from-pink-500 via-purple-500 to-indigo-500",
    desc: "Ethereal magenta and violet glow with soft romantic tones",
  },
  {
    id: "cyberpunk",
    name: "Cyber Neon",
    color: "from-cyan-500 via-blue-500 to-fuchsia-500",
    desc: "Futuristic neon cyan and magenta pulse",
  },
  {
    id: "sunset",
    name: "Warm Sunset",
    color: "from-amber-500 via-orange-500 to-rose-500",
    desc: "Warm golden glow with cozy evening ambiance",
  },
  {
    id: "cosmic",
    name: "Cosmic Purple",
    color: "from-indigo-600 via-purple-600 to-pink-600",
    desc: "Deep space purple and starlight glow",
  },
  {
    id: "emerald",
    name: "Emerald Mint",
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    desc: "Calming mint green and ocean teal vibe",
  },
];

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  activeTheme,
  onSelectTheme,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Interface Atmosphere</h3>
              <p className="text-xs text-slate-400">Choose visual background and orb color theme</p>
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
          {THEMES.map((t) => {
            const isSelected = activeTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTheme(t.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-slate-800 border-pink-500/50 text-white shadow-lg"
                    : "bg-slate-800/40 hover:bg-slate-800 border-white/5 text-slate-300 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${t.color} shrink-0 shadow-md`} />
                  <div>
                    <h4 className="font-bold text-sm text-white">{t.name}</h4>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </div>
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
      </div>
    </div>
  );
};
