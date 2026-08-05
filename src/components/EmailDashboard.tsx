import React, { useEffect, useState } from 'react';
import { Mail, Search, X, Inbox, ShieldAlert, Key, Loader, ExternalLink } from 'lucide-react';
import { emailBus } from '../events/EmailBus';

interface EmailSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
}

export const EmailDashboard: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = emailBus.subscribe(setVisible);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (visible && window.electronAPI) {
      checkStatus();
    }
  }, [visible]);

  const checkStatus = async () => {
    if (!window.electronAPI) return;
    const status = await window.electronAPI.getGmailStatus();
    setHasCredentials(status.hasCredentials);
    setIsAuthenticated(status.isAuthenticated);
    if (status.isAuthenticated) {
      fetchRecent();
    }
  };

  const handleSaveCredentials = async () => {
    if (!clientId || !clientSecret) return;
    if (window.electronAPI) {
      await window.electronAPI.saveGmailCredentials(clientId, clientSecret);
      setHasCredentials(true);
    }
  };

  const handleConnect = async () => {
    if (!window.electronAPI) return;
    setIsConnecting(true);
    try {
      const res = await window.electronAPI.connectGmail();
      if (res.success) {
        setIsAuthenticated(true);
        fetchRecent();
      } else {
        alert("Connection failed: " + res.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.disconnectGmail();
    setIsAuthenticated(false);
    setEmails([]);
  };

  const fetchRecent = async () => {
    if (!window.electronAPI) return;
    setIsSearching(true);
    try {
      const res = await window.electronAPI.searchEmails('in:inbox', 5);
      if (res.success && res.emails) {
        setEmails(res.emails);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !window.electronAPI) return;
    setIsSearching(true);
    try {
      const res = await window.electronAPI.searchEmails(searchQuery, 10);
      if (res.success && res.emails) {
        setEmails(res.emails);
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="absolute top-0 right-0 w-[500px] h-full bg-black/80 backdrop-blur-3xl border-l border-white/10 text-white p-6 font-sans flex flex-col z-50 shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Mail className="text-blue-400" size={28} />
          <h2 className="text-2xl font-light tracking-wide text-blue-50">Email Intelligence</h2>
        </div>
        <button 
          onClick={() => emailBus.toggle()}
          className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {!hasCredentials ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Key className="w-16 h-16 text-slate-500 mb-6" />
          <h3 className="text-xl font-medium mb-2">OAuth Required</h3>
          <p className="text-sm text-slate-400 mb-8 max-w-sm">
            To securely connect to Gmail, Navi requires a Google Cloud OAuth Client ID. 
            Your credentials are encrypted and stored locally.
          </p>
          <div className="w-full max-w-sm flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
            />
            <input 
              type="password" 
              placeholder="Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
            />
            <button 
              onClick={handleSaveCredentials}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              Save Credentials
            </button>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center justify-center gap-1 mt-4">
              Get Credentials <ExternalLink size={12} />
            </a>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <ShieldAlert className="w-16 h-16 text-yellow-500 mb-6" />
          <h3 className="text-xl font-medium mb-2">Ready to Connect</h3>
          <p className="text-sm text-slate-400 mb-8 max-w-sm">
            Navi will now request access to view and manage your emails.
          </p>
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full max-w-xs bg-white text-black hover:bg-slate-200 rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? <Loader className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
            {isConnecting ? "Authenticating..." : "Connect to Gmail"}
          </button>
          
          <button 
            onClick={() => setHasCredentials(false)}
            className="mt-6 text-xs text-slate-500 hover:text-white transition-colors"
          >
            Reset Credentials
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
             <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Semantic search emails..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                />
             </form>
             <button 
               onClick={handleDisconnect}
               className="ml-3 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
             >
               Disconnect
             </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pb-6">
            {isSearching ? (
              <div className="flex justify-center py-10">
                <Loader className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-sm">
                No emails found.
              </div>
            ) : (
              emails.map(email => (
                <div key={email.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 hover:border-blue-500/30 transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-300 truncate max-w-[200px]">
                      {email.from.replace(/<.*>/, '')}
                    </span>
                    <span className="text-[10px] text-slate-500">{email.date}</span>
                  </div>
                  <h4 className="text-sm font-medium text-slate-200 mb-1 leading-snug truncate">
                    {email.subject}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {email.snippet}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
