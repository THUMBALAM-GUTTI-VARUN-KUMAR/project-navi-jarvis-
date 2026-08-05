import React, { useEffect, useState } from 'react';
import { agentBus, AgentEventData } from '../events/AgentBus';
import { Network, Cpu, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [agents, setAgents] = useState<Record<string, AgentEventData>>({});
  const [pipeline, setPipeline] = useState<any[] | null>(null);

  useEffect(() => {
    const unsubVis = agentBus.subscribe(setVisible);
    const unsubEvents = agentBus.subscribeEvents((event) => {
      if (event.type === 'pipeline-started' && event.tasks) {
        setPipeline(event.tasks);
        setAgents({});
      } else if (event.id) {
        setAgents(prev => ({
          ...prev,
          [event.id]: event
        }));
      }
    });
    return () => {
      unsubVis();
      unsubEvents();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[450px] bg-[#0a0a0f]/90 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_100px_rgba(0,255,200,0.1)] flex flex-col z-50 transform transition-transform duration-500 ease-out animate-in slide-in-from-right">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-l from-emerald-500/10 to-teal-500/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-2 relative z-10">
          <Network size={20} className="text-emerald-400" />
          Autonomous Agent Network
        </h2>
        <p className="text-xs text-slate-400 mt-2 relative z-10 flex items-center gap-2">
          <Cpu size={12} className="animate-pulse text-teal-400" /> System Orchestration Active
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        
        {/* Network Graph Visualizer */}
        {pipeline && (
          <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-6 overflow-hidden">
            <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider flex justify-between items-center">
              <span>Pipeline Execution Graph</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded">Active</span>
            </h3>
            <div className="flex flex-col gap-4">
              {pipeline.map((task, idx) => {
                const agentStatus = agents[task.id];
                const isDone = agentStatus?.type === 'complete';
                const isRunning = agentStatus?.type === 'start' || agentStatus?.type === 'progress';
                const hasError = agentStatus?.type === 'error';
                
                return (
                  <div key={task.id} className="flex flex-col relative">
                    {idx < pipeline.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-white/10" />
                    )}
                    <div className="flex items-center gap-3 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                        isRunning ? 'bg-teal-500/20 border-teal-500 text-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]' :
                        hasError ? 'bg-red-500/20 border-red-500 text-red-400' :
                        'bg-white/5 border-white/10 text-slate-500'
                      }`}>
                        {isDone ? <CheckCircle2 size={14} /> : isRunning ? <Loader2 size={14} className="animate-spin" /> : hasError ? <AlertCircle size={14} /> : <Network size={14} />}
                      </div>
                      <div className={`flex-1 bg-white/5 rounded p-3 border transition-colors ${isRunning ? 'border-teal-500/30 bg-teal-500/5' : 'border-white/5'}`}>
                        <div className="flex justify-between">
                          <div className="text-sm font-medium text-slate-200">{task.agentRole}</div>
                          <div className="text-[10px] font-mono text-slate-500">{task.id}</div>
                        </div>
                        {task.dependsOn && task.dependsOn.length > 0 && (
                           <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                             <Network size={10} /> Waits for: {task.dependsOn.join(', ')}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Object.values(agents).length === 0 && !pipeline ? (
          <div className="text-center text-slate-500 text-sm mt-10">
            No agents currently running.
          </div>
        ) : (
          Object.values(agents).reverse().map((agent) => (
            <div key={agent.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-lg transition-all">
              {agent.type === 'progress' || agent.type === 'start' ? (
                <div className="absolute top-0 left-0 h-1 bg-emerald-500 animate-pulse w-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              ) : null}
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {agent.type === 'complete' && <CheckCircle2 size={16} className="text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-full" />}
                  {agent.type === 'error' && <AlertCircle size={16} className="text-red-400" />}
                  {(agent.type === 'start' || agent.type === 'progress') && <Loader2 size={16} className="text-teal-400 animate-spin" />}
                  <span className="font-semibold text-slate-200">{agent.role}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5">{agent.id.split('-').pop()}</span>
              </div>
              
              <div className="text-xs text-slate-400 bg-black/20 p-2.5 rounded border border-white/5 flex flex-col gap-2">
                <span className="font-mono text-emerald-300/80">&gt; {agent.status}</span>
                {agent.type === 'complete' && agent.result && (
                  <span className="text-slate-500 line-clamp-3 mt-1 italic">
                    "{agent.result}"
                  </span>
                )}
              </div>

              {agent.error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                  {agent.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
