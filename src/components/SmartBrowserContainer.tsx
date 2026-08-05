import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Globe,
  RotateCw,
  Search,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Plus,
} from "lucide-react";

interface SmartBrowserContainerProps {
  isOpen: boolean;
  initialUrl?: string;
  initialLabel?: string;
  onClose: () => void;
}

interface Tab {
  id: string;
  url: string;
  title: string;
}

export const SmartBrowserContainer: React.FC<SmartBrowserContainerProps> = ({
  isOpen,
  initialUrl,
  initialLabel,
  onClose,
}) => {
  const defaultUrl = "https://www.google.com";
  
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "tab-1", url: defaultUrl, title: "New Tab" }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");
  const [inputUrl, setInputUrl] = useState<string>(defaultUrl);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const webViewContainerRef = useRef<HTMLDivElement>(null);

  // Sync bounds with Electron WebContentsView
  useEffect(() => {
    if (!isOpen) {
      if (window.electronAPI) {
        window.electronAPI.closeBrowser();
      }
      return;
    }

    let urlToOpen = defaultUrl;
    if (initialUrl) {
      urlToOpen = initialUrl;
      if (!/^https?:\/\//i.test(urlToOpen)) {
        urlToOpen = "https://" + urlToOpen;
      }
      // If there's an initial URL, create a tab for it or update the first one
      if (tabs.length === 1 && tabs[0].url === defaultUrl) {
        setTabs([{ id: tabs[0].id, url: urlToOpen, title: initialLabel || urlToOpen }]);
      } else {
        const newTab = { id: `tab-${Date.now()}`, url: urlToOpen, title: initialLabel || urlToOpen };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
      setInputUrl(urlToOpen);
    }

    // Give the DOM a tiny bit of time to layout before syncing
    const timer = setTimeout(() => {
      syncBounds(true, urlToOpen);
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialUrl]);

  const syncBounds = (initialLoad = false, urlToOpen?: string) => {
    if (!window.electronAPI || !webViewContainerRef.current) return;
    
    const rect = webViewContainerRef.current.getBoundingClientRect();
    const bounds = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    if (initialLoad) {
      window.electronAPI.openBrowser(urlToOpen || inputUrl, bounds);
    } else {
      window.electronAPI.updateBrowserBounds(bounds);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Use ResizeObserver to constantly track the exact container bounds and pass to IPC
    const observer = new ResizeObserver(() => {
      syncBounds(false);
    });

    if (webViewContainerRef.current) {
      observer.observe(webViewContainerRef.current);
    }

    window.addEventListener("resize", () => syncBounds(false));

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", () => syncBounds(false));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;

    if (!/^https?:\/\//i.test(target)) {
      if (target.includes(".") && !target.includes(" ")) {
        target = "https://" + target;
      } else {
        target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
      }
    }

    setInputUrl(target);
    updateTabUrl(activeTabId, target);
    if (window.electronAPI) {
      window.electronAPI.navigateBrowser(target);
    }
  };

  const addTab = () => {
    const newTab = { id: `tab-${Date.now()}`, url: defaultUrl, title: "New Tab" };
    setTabs(prev => [...prev, newTab]);
    switchTab(newTab.id, defaultUrl);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      switchTab(newTabs[newTabs.length - 1].id, newTabs[newTabs.length - 1].url);
    }
  };

  const switchTab = (id: string, url: string) => {
    setActiveTabId(id);
    setInputUrl(url);
    if (window.electronAPI) {
      window.electronAPI.navigateBrowser(url);
    }
  };

  const updateTabUrl = (id: string, newUrl: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, url: newUrl, title: newUrl } : t));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        ref={containerRef}
        className={`relative w-full bg-slate-900/90 border border-white/10 shadow-2xl flex flex-col transition-all duration-300 overflow-hidden backdrop-blur-2xl ${
          isFullscreen ? "h-full max-w-none rounded-none border-none" : "h-[85vh] max-w-6xl rounded-[24px]"
        }`}
      >
        {/* Custom Browser Titlebar (Draggable area could be implemented later) */}
        <div className="bg-slate-950/90 border-b border-white/10 flex flex-col shrink-0">
          
          {/* Tabs Bar */}
          <div className="flex items-center gap-1 px-2 pt-2 bg-slate-950 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                onClick={() => switchTab(tab.id, tab.url)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border border-b-0 cursor-pointer max-w-[200px] min-w-[120px] transition-colors ${
                  activeTabId === tab.id 
                    ? "bg-slate-800 border-white/10 text-white" 
                    : "bg-slate-900 border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                <div className="truncate flex-1 text-xs">{tab.title}</div>
                <button 
                  onClick={(e) => closeTab(e, tab.id)}
                  className="p-0.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button 
              onClick={addTab}
              className="p-1.5 mx-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-2 bg-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Navigation Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => window.electronAPI?.goBack()}
                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.electronAPI?.goForward()}
                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.electronAPI?.reload()}
                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all ml-1"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Address Bar */}
            <form onSubmit={handleNavigate} className="flex-1 max-w-2xl flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Globe className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Search Google or enter a URL"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
                />
              </div>
            </form>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/30 hover:border-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* The Native WebContentsView will overlay precisely over this div */}
        <div ref={webViewContainerRef} className="flex-1 w-full relative bg-white rounded-b-[24px]">
          {/* Fallback text just in case IPC fails or it's slow to load */}
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
            {!window.electronAPI ? "WebContentsView requires Electron environment." : "Loading Native View..."}
          </div>
        </div>
      </div>
    </div>
  );
};
