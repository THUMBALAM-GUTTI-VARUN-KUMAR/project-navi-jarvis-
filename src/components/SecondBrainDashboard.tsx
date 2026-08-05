import React, { useEffect, useState, useMemo } from 'react';
import { Brain, Search, Trash2, Tag, Calendar, Database, X } from 'lucide-react';
import { secondBrainBus } from '../events/SecondBrainBus';

export interface Memory {
  id: string;
  content: string;
  category: string;
  source: string;
  createdAt: number;
  importance: number;
  projectId: string | null;
  tags: string;
}

export const SecondBrainDashboard: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchMemories = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getAllMemories();
      setMemories(data);
    }
  };

  useEffect(() => {
    const unsubscribe = secondBrainBus.subscribe(setVisible);
    fetchMemories();
    const interval = setInterval(fetchMemories, 5000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMemories();
      return;
    }
    setIsSearching(true);
    if (window.electronAPI) {
      const results = await window.electronAPI.searchMemories({ query: searchQuery, projectId: null });
      setMemories(results);
    }
    setIsSearching(false);
  };

  const handleDelete = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteMemory(id);
      fetchMemories();
    }
  };

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear your entire Second Brain?")) {
      if (window.electronAPI) {
        await window.electronAPI.clearAllMemories();
        fetchMemories();
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="absolute top-0 right-0 w-[500px] h-full bg-black/80 backdrop-blur-3xl border-l border-white/10 text-white p-6 font-sans flex flex-col z-50 shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Brain className="text-cyan-400" size={28} />
          <h2 className="text-2xl font-light tracking-wide text-cyan-50">Second Brain</h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleClear}
            className="text-red-400/80 hover:text-red-400 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-2"
          >
            <Trash2 size={14} /> Clear
          </button>
          <button 
            onClick={() => secondBrainBus.toggle()}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-cyan-400/50" size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Semantic search across all memories..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-cyan-50 placeholder-white/30 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-inner"
        />
        {isSearching && (
          <div className="absolute right-3 top-3 text-cyan-400 text-xs animate-pulse">Searching...</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30">
            <Database size={48} className="mb-4 opacity-20" />
            <p>Your Second Brain is empty.</p>
            <p className="text-xs mt-2">Tell Navi to "remember this" to start building memory.</p>
          </div>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="group relative bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2 items-center">
                  <span className="px-2 py-1 bg-cyan-400/10 text-cyan-300 text-xs rounded-full uppercase tracking-wider font-semibold border border-cyan-400/20">
                    {memory.category}
                  </span>
                  {memory.projectId && (
                    <span className="px-2 py-1 bg-purple-400/10 text-purple-300 text-xs rounded-full uppercase tracking-wider border border-purple-400/20">
                      {memory.projectId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-white/30 text-xs">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(memory.createdAt).toLocaleDateString()}</span>
                  <button 
                    onClick={() => handleDelete(memory.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-white/90 text-sm leading-relaxed mb-4">{memory.content}</p>
              {memory.tags && (
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-white/30" />
                  <span className="text-xs text-white/40">{memory.tags}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
