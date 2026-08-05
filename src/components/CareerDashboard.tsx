import React, { useState, useEffect } from "react";
import { X, Briefcase, FileText, CheckCircle, Target, TrendingUp, Presentation } from "lucide-react";
import { careerBus } from "../events/CareerBus";

export function CareerDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [view, setView] = useState<'dashboard' | 'resume' | 'interview' | 'practice'>('dashboard');

  useEffect(() => {
    const unsubscribe = careerBus.subscribe((visible) => {
      setIsVisible(visible);
      setView(careerBus.view);
    });
    return unsubscribe;
  }, []);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in">
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
          <div className="flex items-center gap-3 text-cyan-400">
            <Briefcase size={24} />
            <h2 className="text-xl font-semibold tracking-wide">Career Intelligence</h2>
          </div>
          <button
            onClick={() => careerBus.close()}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {view === 'dashboard' && (
            <div className="grid grid-cols-3 gap-6 h-full">
              <div className="col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Target size={18} className="text-emerald-400" /> Target Roles
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">Frontend Developer</span>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">Fullstack Engineer</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex-1">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyan-400" /> Interview Readiness
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">Technical</span>
                        <span className="text-cyan-400">82%</span>
                      </div>
                      <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 w-[82%]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">Communication</span>
                        <span className="text-purple-400">75%</span>
                      </div>
                      <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[75%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-4">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Presentation size={18} className="text-purple-400" /> Active Mock Interview
                  </h3>
                  <p className="text-white/60 text-sm">Say <strong>"Navi, start a mock interview for Frontend Developer"</strong> to begin.</p>
                  <div className="mt-auto pt-4 border-t border-white/10">
                    <button onClick={() => careerBus.open('interview')} className="w-full py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors text-sm font-medium">
                      View Active Session
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-4">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" /> Resume Builder
                  </h3>
                  <p className="text-white/60 text-sm">Say <strong>"Navi, let's review my resume"</strong>.</p>
                  <div className="mt-auto pt-4 border-t border-white/10">
                    <button onClick={() => careerBus.open('resume')} className="w-full py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors text-sm font-medium">
                      Open Builder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'interview' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-32 h-32 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
              <h2 className="text-2xl font-bold text-white">Mock Interview in Progress</h2>
              <p className="text-white/70 max-w-md">Navi is currently acting as your interviewer. Speak naturally. She will evaluate your responses and adapt the questions.</p>
              <button onClick={() => careerBus.open('dashboard')} className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                Back to Dashboard
              </button>
            </div>
          )}

          {view === 'resume' && (
            <div className="flex flex-col h-full bg-black/40 rounded-lg p-6 border border-white/5">
               <h2 className="text-xl text-white mb-6">Resume Analysis Pipeline</h2>
               <div className="space-y-4">
                 <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                   <CheckCircle className="text-emerald-400" />
                   <div>
                     <p className="text-white font-medium">Structure & Clarity</p>
                     <p className="text-emerald-400/70 text-sm">Looks good. ATS compatible.</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                   <AlertCircle className="text-yellow-400" />
                   <div>
                     <p className="text-white font-medium">Impact Formatting</p>
                     <p className="text-yellow-400/70 text-sm">Consider quantifying your achievements in the Experience section.</p>
                   </div>
                 </div>
               </div>
               <button onClick={() => careerBus.open('dashboard')} className="mt-auto self-start px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
