import React from "react";
import { X, StickyNote, Trash2, Calendar, Sparkles } from "lucide-react";
import { NoteItem } from "../modules/ToolManager";

interface NotesDrawerProps {
  isOpen: boolean;
  notes: NoteItem[];
  onDeleteNote: (id: string) => void;
  onClose: () => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  notes,
  onDeleteNote,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Navi's Saved Memory</h3>
              <p className="text-xs text-slate-400">Notes & reminders saved during conversation</p>
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
          {notes.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Sparkles className="w-6 h-6 text-amber-400/50" />
              </div>
              <p className="text-sm font-medium text-slate-300 mb-1">No notes saved yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Ask Navi to remember something like "Navi, save a note that my favorite color is teal" and she will store it here!
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 hover:border-amber-500/30 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {note.category || "General"}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">{note.content}</p>
                </div>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all shrink-0"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
