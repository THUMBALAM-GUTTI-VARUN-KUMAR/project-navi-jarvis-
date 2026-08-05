import React, { useEffect, useState } from 'react';
import { dashboardBus } from '../events/DashboardBus';
import { Terminal, GitBranch, Cpu, Activity, Clock, Folder } from 'lucide-react';

interface SystemStats {
  cpuUsagePercent: number;
  totalMemGB: number;
  freeMemGB: number;
  usedMemGB: number;
}

export const DeveloperDashboard: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [gitBranch, setGitBranch] = useState<string>('N/A');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '> Navi Developer Mode Activated...',
    '> Connecting to background terminal...',
    '> Fetching system diagnostics...',
  ]);

  useEffect(() => {
    const unsubscribe = dashboardBus.subscribe(setVisible);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (visible && window.electronAPI) {
      const fetchStats = async () => {
        try {
          if (window.electronAPI.getSystemDiagnostics) {
            const res = await window.electronAPI.getSystemDiagnostics();
            if (!res.error) setStats(res);
          }
          if (window.electronAPI.gitAction) {
             const res = await window.electronAPI.gitAction({ command: 'branch --show-current' });
             if (res.success && res.output) setGitBranch(res.output.trim());
          }
        } catch (e) {}
      };
      fetchStats();
      interval = setInterval(fetchStats, 5000); // refresh every 5 seconds
    }
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 bottom-0 w-[400px] bg-black/50 backdrop-blur-xl border-r border-white/10 shadow-[0_0_80px_rgba(100,50,255,0.15)] flex flex-col z-40 transform transition-transform duration-500 ease-out translate-x-0 animate-in slide-in-from-left">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 flex items-center gap-2 relative z-10">
          <Terminal size={20} className="text-blue-400" />
          Developer Dashboard
        </h2>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 relative z-10">
           <Folder size={12} className="shrink-0" />
           <span className="truncate">Navi OS Workspace</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col relative z-10">
        
        {/* Git Status */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 shadow-inner">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span className="flex items-center gap-2"><GitBranch size={14} className="text-purple-400"/> Git Branch</span>
            <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded text-xs font-mono border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">{gitBranch}</span>
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
             <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1 text-xs text-slate-400"><Cpu size={12}/> CPU Usage</span>
                <span className="text-2xl font-semibold text-blue-300">{stats?.cpuUsagePercent || 0}%</span>
                <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${stats?.cpuUsagePercent || 0}%` }} />
                </div>
             </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
             <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1 text-xs text-slate-400"><Activity size={12}/> RAM Usage</span>
                <span className="text-2xl font-semibold text-purple-300">
                  {stats ? `${Math.round((stats.usedMemGB / stats.totalMemGB) * 100)}%` : '0%'}
                </span>
                <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${stats ? (stats.usedMemGB / stats.totalMemGB) * 100 : 0}%` }} />
                </div>
             </div>
          </div>
        </div>

        {/* Live Terminal Output Mockup */}
        <div className="bg-[#0a0a0f] rounded-xl flex-1 border border-white/10 shadow-inner flex flex-col overflow-hidden relative min-h-[250px]">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 pointer-events-none" />
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
             <span className="text-xs text-slate-400 font-mono flex items-center gap-2 tracking-wider"><Clock size={12}/> TERMINAL</span>
             <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
             </div>
          </div>
          <div className="p-5 font-mono text-[10px] sm:text-xs text-slate-300 space-y-2 overflow-y-auto z-10 opacity-80 leading-relaxed">
            {terminalLogs.map((log, i) => (
               <div key={i} className="text-blue-300/80">
                 {log}
               </div>
            ))}
            <div className="animate-pulse text-purple-400 mt-2">_</div>
          </div>
        </div>

      </div>
    </div>
  );
};
