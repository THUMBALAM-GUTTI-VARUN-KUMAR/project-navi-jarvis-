import React from "react";
import { X, Terminal, CheckCircle2, XCircle, Globe, Palette, Volume2, StickyNote, Clock } from "lucide-react";
import { ToolLogItem } from "../modules/ToolManager";

interface ToolLogsDrawerProps {
  isOpen: boolean;
  logs: ToolLogItem[];
  onClose: () => void;
}

export const ToolLogsDrawer: React.FC<ToolLogsDrawerProps> = ({
  isOpen,
  logs,
  onClose,
}) => {
  if (!isOpen) return null;

  const getToolIcon = (name: string) => {
    switch (name) {
      case "openWebsite":
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case "changeTheme":
        return <Palette className="w-4 h-4 text-pink-400" />;
      case "playAmbientSound":
        return <Volume2 className="w-4 h-4 text-purple-400" />;
      case "saveNote":
        return <StickyNote className="w-4 h-4 text-amber-400" />;
      default:
        return <Terminal className="w-4 h-4 text-emerald-400" />;
    }
  };

  const isSuccess = (result: unknown): boolean => {
    if (result && typeof result === "object") {
      return (result as Record<string, unknown>).success === true;
    }
    return false;
  };

  const getErrorMessage = (result: unknown): string => {
    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      return typeof r.error === "string" ? r.error : "Unknown error";
    }
    return "Unknown error";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Browser Tool Activity</h3>
              <p className="text-xs text-slate-400">Function calls executed by Navi in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Terminal className="w-6 h-6 text-cyan-400/50" />
              </div>
              <p className="text-sm font-medium text-slate-300 mb-1">No tools executed yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Navi can open websites, change visual themes, play ambient sounds, and save notes during conversation.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const success = isSuccess(log.result);
              return (
                <div
                  key={log.id + "_" + log.timestamp}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 space-y-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getToolIcon(log.name)}
                      <span className="font-bold text-white">{log.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-300">
                    <span className="text-slate-500 font-semibold block mb-0.5">Arguments:</span>
                    <pre className="overflow-x-auto font-mono text-[10px] text-cyan-300">
                      {JSON.stringify(log.args, null, 2)}
                    </pre>
                  </div>

                  {success ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Result: Executed successfully</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Error: {getErrorMessage(log.result)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
