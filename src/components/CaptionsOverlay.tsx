import React, { useEffect, useState } from "react";
import { Sparkles, User } from "lucide-react";
import { TranscriptItem, SessionState } from "../modules/LiveSession";

interface CaptionsOverlayProps {
  latestTranscript: TranscriptItem | null;
  state: SessionState;
}

export const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({
  latestTranscript,
  state,
}) => {
  const [visibleText, setVisibleText] = useState<string>("");
  const [role, setRole] = useState<"user" | "navi">("navi");

  useEffect(() => {
    if (latestTranscript) {
      setVisibleText(latestTranscript.text);
      setRole(latestTranscript.role);
    }
  }, [latestTranscript]);

  if (!visibleText && state === "disconnected") {
    return null;
  }

  return (
    <div className="absolute bottom-28 sm:bottom-32 left-0 right-0 z-20 px-4 flex justify-center pointer-events-none">
      <div className="max-w-xl w-full bg-slate-950/80 backdrop-blur-2xl border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              role === "navi"
                ? "bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20"
                : "bg-slate-800 text-slate-300 border border-white/10"
            }`}
          >
            {role === "navi" ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-bold tracking-wider uppercase ${role === "navi" ? "text-pink-400" : "text-indigo-400"}`}>
                {role === "navi" ? "Navi" : "You"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Real-time Subtitle</span>
            </div>
            <p className="text-sm text-slate-100 font-medium leading-relaxed italic">
              "{visibleText || (state === "listening" ? "Listening..." : "Connected")}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
