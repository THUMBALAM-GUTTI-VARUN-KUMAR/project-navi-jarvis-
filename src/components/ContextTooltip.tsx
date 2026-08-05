import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface TooltipData {
  text: string;
  x: number;
  y: number;
  id: number;
}

export const ContextTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (window.electronAPI?.onContextTooltip) {
      window.electronAPI.onContextTooltip((_event: any, payload: TooltipData) => {
        setTooltip({ ...payload, id: Date.now() });
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setTooltip((prev) => (prev?.id === payload.id ? null : prev));
        }, 8000);
      });
    }

    return () => {
      if (window.electronAPI?.removeContextTooltip) {
        window.electronAPI.removeContextTooltip();
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {tooltip && (
        <motion.div
          key={tooltip.id}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 20, window.innerWidth - 300), // Prevent going offscreen
            top: Math.min(tooltip.y + 20, window.innerHeight - 100),
            zIndex: 99999,
          }}
          className="pointer-events-none bg-slate-900/90 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-4 shadow-[0_10px_40px_rgba(34,211,238,0.2)] max-w-sm flex items-start gap-3"
        >
          <Sparkles className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mb-1">Navi Vision</span>
            <p className="text-sm font-medium text-slate-200 leading-relaxed">
              {tooltip.text}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
