import React from "react";
import { X, Volume2, CloudRain, Waves, Sparkles, Coffee, Flame, VolumeX } from "lucide-react";

interface AmbientModalProps {
  isOpen: boolean;
  activeSound: string;
  onSelectSound: (sound: string) => void;
  onClose: () => void;
}

const AMBIENTS = [
  { id: "rain", name: "Gentle Rain", icon: CloudRain, desc: "Soothing soft rainfall soundscape" },
  { id: "waves", name: "Ocean Waves", icon: Waves, desc: "Rhythmic rolling sea shore waves" },
  { id: "lofi_chimes", name: "Lofi Chimes", icon: Sparkles, desc: "Relaxing pentatonic musical chimes" },
  { id: "cozy_cafe", name: "Cozy Cafe", icon: Coffee, desc: "Warm ambient coffee shop background" },
  { id: "fireplace", name: "Crackling Fire", icon: Flame, desc: "Comforting fireplace crackle" },
  { id: "stop", name: "Mute Ambient", icon: VolumeX, desc: "Turn off background ambient audio" },
];

export const AmbientModal: React.FC<AmbientModalProps> = ({
  isOpen,
  activeSound,
  onSelectSound,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ambient Sound Generator</h3>
              <p className="text-xs text-slate-400">Play procedural background audio during chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AMBIENTS.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSound === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSound(item.id);
                  onClose();
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10"
                    : "bg-slate-800/40 hover:bg-slate-800 border-white/5 text-slate-300 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${isSelected ? "text-purple-300" : "text-slate-400"}`} />
                  {isSelected && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white mb-0.5">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
