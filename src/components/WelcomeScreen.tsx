import React, { useState } from 'react';
import { Key, ArrowRight, ExternalLink } from 'lucide-react';

interface WelcomeScreenProps {
  onSave: (key: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    
    setIsSaving(true);
    // Add a tiny delay for UX so it feels like it's saving
    setTimeout(() => {
      onSave(apiKey.trim());
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-black/40 border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <Key className="w-8 h-8 text-cyan-400" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome to Navi</h2>
          <p className="text-white/60 mb-8 max-w-sm">
            To power Navi's intelligence engine, please provide your Gemini API key. It will be stored securely on your local machine.
          </p>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative mb-6">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!apiKey.trim() || isSaving}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Save & Initialize <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-6 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            Get a free Gemini API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
