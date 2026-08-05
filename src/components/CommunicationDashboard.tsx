import React, { useState, useEffect } from "react";
import { Mic, Activity, CheckCircle2, MessageSquare, Presentation, UserCircle, Briefcase, Zap } from "lucide-react";
import { communicationBus } from "../events/CommunicationBus";

export function CommunicationDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState(communicationBus.mode);
  const [stats, setStats] = useState(communicationBus.stats);

  useEffect(() => {
    const unsubscribe = communicationBus.subscribe((visible) => {
      setIsVisible(visible);
      setMode(communicationBus.mode);
      setStats(communicationBus.stats);
    });
    return unsubscribe;
  }, []);

  if (!isVisible) return null;

  const getModeIcon = () => {
    switch(mode) {
      case 'interview': return <Briefcase className="text-purple-400 w-5 h-5" />;
      case 'presentation': return <Presentation className="text-orange-400 w-5 h-5" />;
      case 'roleplay': return <UserCircle className="text-green-400 w-5 h-5" />;
      case 'shadowing': return <Activity className="text-blue-400 w-5 h-5" />;
      default: return <MessageSquare className="text-cyan-400 w-5 h-5" />;
    }
  };

  const getModeLabel = () => {
    switch(mode) {
      case 'interview': return "Interview Communication";
      case 'presentation': return "Presentation Practice";
      case 'roleplay': return "Roleplay Scenario";
      case 'shadowing': return "Shadowing & Rhythm";
      default: return "Free Conversation";
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex flex-col p-8 pointer-events-none transition-all duration-700 animate-fade-in">
      
      {/* Top Center Floating HUD */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-slate-900/80 border border-cyan-500/30 rounded-full px-6 py-3 flex items-center gap-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-md">
          
          <div className="flex items-center gap-3 border-r border-white/10 pr-6">
            <div className="relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
              <Mic className="text-cyan-400 w-4 h-4 z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-400/80 font-bold tracking-widest uppercase">Communication Mode</span>
              <span className="text-sm font-medium text-white flex items-center gap-2">
                {getModeIcon()} {getModeLabel()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase">Fluency</span>
              <span className="text-lg font-light text-blue-400">{stats.fluency}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase">Grammar</span>
              <span className="text-lg font-light text-emerald-400">{stats.grammar}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase">Vocab</span>
              <span className="text-lg font-light text-purple-400">{stats.vocabulary}%</span>
            </div>
          </div>
          
        </div>
      </div>

      {/* Subtle Bottom Tips */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center text-white/40 text-xs tracking-wide">
        Speak naturally. Navi will correct grammar and pronunciation without interrupting you. <br/>
        Say <strong className="text-white/60">"Stop communication mode"</strong> to exit.
      </div>
    </div>
  );
}
