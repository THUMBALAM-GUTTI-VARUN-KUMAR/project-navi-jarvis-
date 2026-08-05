import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

export const VisionOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.onVisionActive) {
      window.electronAPI.onVisionActive((_event: any, active: boolean) => {
        setIsActive(active);
      });
    }
    return () => {
      if (window.electronAPI?.removeVisionActive) {
        window.electronAPI.removeVisionActive();
      }
    };
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] border-4 border-cyan-400 shadow-[inset_0_0_50px_rgba(34,211,238,0.5)] animate-pulse transition-all duration-300">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-cyan-400 flex items-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
        <Eye className="text-cyan-400 animate-pulse" size={20} />
        <span className="text-cyan-400 font-bold tracking-widest text-sm drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">◉ NAVI VISION</span>
      </div>
    </div>
  );
};
