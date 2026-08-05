import React, { useEffect, useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  BrainCircuit, 
  Upload, 
  ArrowLeft,
  Activity,
  PlayCircle,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { learningBus } from '../events/LearningBus';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

export const LearningDashboard: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTopic, setUploadTopic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [updateTick, setUpdateTick] = useState(0); // For forcing re-render on bus update

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    const unsubscribe = learningBus.subscribe((v) => {
      setVisible(v);
      setUpdateTick(tick => tick + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (visible && window.electronAPI) {
      loadData();
    }
  }, [visible]);

  useEffect(() => {
    // Render mermaid diagrams whenever content updates
    if (visible && learningBus.content.includes('```mermaid')) {
      setTimeout(() => {
        mermaid.run().catch(e => console.error("Mermaid error:", e));
      }, 100);
    }
  }, [updateTick, visible]);

  const loadData = async () => {
    if (!window.electronAPI) return;
    const p = await window.electronAPI.getLearningProfile();
    const f = await window.electronAPI.getDueFlashcards();
    setProfile(p);
    setFlashcards(f);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTopic || !window.electronAPI) return;
    
    setIsUploading(true);
    try {
      const filePath = (selectedFile as any).path;
      if (filePath) {
        const res = await window.electronAPI.ingestLearningDocument(filePath, uploadTopic);
        if (res.success) {
          alert(`Successfully ingested document into ${res.chunksProcessed} learning chunks!`);
          loadData();
        } else {
          alert(`Failed to ingest: ${res.error}`);
        }
      } else {
        alert("File path not accessible. Use the native file picker in a full build.");
      }
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setUploadTopic('');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans animate-in fade-in duration-500">
      {/* Top Navigation Bar */}
      <div className="h-16 border-b border-white/10 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-cyan-400 w-6 h-6" />
          <h1 className="text-xl font-light text-cyan-50">Navi Learning Mode</h1>
          {learningBus.topic && (
            <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <span className="text-xs text-blue-300 font-medium">Topic:</span>
              <span className="text-sm text-blue-100">{learningBus.topic}</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => learningBus.close()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-sm font-medium border border-red-500/20"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Learning Mode
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Knowledge Graph & Profile */}
        <div className="w-1/4 min-w-[300px] max-w-[350px] border-r border-white/10 bg-slate-900/20 flex flex-col p-6 overflow-y-auto custom-scrollbar">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> 
            Learning Profile
          </h2>
          
          <div className="flex-1 flex flex-col gap-4">
            {profile.length === 0 ? (
              <div className="text-slate-500 text-sm italic">No topics learned yet.</div>
            ) : (
              profile.map((topic, i) => (
                <div key={i} className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-200">{topic.name}</span>
                    <span className="text-xs font-bold text-cyan-400">{Math.round(topic.masteryScore)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${topic.masteryScore}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 mb-6">
            <h3 className="font-medium text-purple-300 mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> Flashcards Due
            </h3>
            <p className="text-2xl font-light text-white mb-4">
              {flashcards.length} <span className="text-sm text-slate-400">cards</span>
            </p>
            <button 
              className="w-full py-2.5 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={flashcards.length === 0}
            >
              <PlayCircle className="w-4 h-4" /> Start Review
            </button>
          </div>

          {/* Moved Document Uploader to bottom of sidebar */}
          <form onSubmit={handleUpload} className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 shrink-0 flex flex-col gap-3">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" /> Upload Notes
            </h3>
            <input 
              type="text" 
              required
              placeholder="Topic name"
              value={uploadTopic}
              onChange={e => setUploadTopic(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
            />
            <input 
              type="file" 
              required
              accept=".pdf,.txt,.md"
              onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-medium file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 outline-none"
            />
            <button 
              type="submit"
              disabled={isUploading || !selectedFile || !uploadTopic}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium transition-colors text-xs flex items-center justify-center gap-2"
            >
              {isUploading ? "Reading..." : "Ingest Material"}
            </button>
          </form>
        </div>

        {/* Right Main Area - Animated Whiteboard */}
        <div className="flex-1 flex flex-col p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-y-auto">
          
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col relative group">
            {learningBus.content ? (
              <div className={`bg-slate-900/60 border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl backdrop-blur-sm prose prose-invert prose-blue max-w-none prose-headings:font-light prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-slate-300 prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-code:text-cyan-300 animate-in slide-in-from-bottom-4 duration-500 ${
                learningBus.mode === 'mindmap' ? 'border-purple-500/50 shadow-purple-500/20' : 
                learningBus.mode === 'algorithm' ? 'border-emerald-500/50 shadow-emerald-500/20' : ''
              }`}>
                {learningBus.concept && (
                  <div className="flex items-center gap-2 mb-6 pb-6 border-b border-white/10">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg font-medium text-yellow-100">{learningBus.concept}</span>
                    {learningBus.mode === 'mindmap' && <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full ml-2 border border-purple-500/30">Interactive Mind Map</span>}
                    {learningBus.mode === 'algorithm' && <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full ml-2 border border-emerald-500/30">Algorithm Visualizer</span>}
                  </div>
                )}
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      if (!inline && match && match[1] === 'mermaid') {
                        return (
                          <div className={`mermaid flex justify-center py-6 bg-slate-950/50 rounded-xl my-6 transition-all duration-1000 ${
                            learningBus.mode === 'mindmap' ? 'scale-105' : ''
                          }`}>
                            {String(children).replace(/\n$/, '')}
                          </div>
                        )
                      }
                      return <code className={className} {...props}>{children}</code>
                    }
                  }}
                >
                  {learningBus.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <BookOpen className="w-20 h-20 text-slate-700 mb-6" />
                <h2 className="text-3xl font-light text-slate-300 mb-4">AI Socratic Whiteboard</h2>
                <p className="text-slate-400 max-w-md text-lg leading-relaxed">
                  "Navi, teach me binary search." <br />
                  <span className="text-sm text-slate-500 mt-2 block">
                    No documents needed. Ask Navi to teach you anything and she will automatically generate lessons, diagrams, and code snippets here while explaining them to you.
                  </span>
                </p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
