import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toastBus, ToastMessage } from '../modules/ToastEventBus';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toastBus.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);

      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    });

    return () => unsubscribe();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-white/10 backdrop-blur-xl bg-slate-900/80 text-white min-w-[280px]"
          >
            {getIcon(toast.type)}
            <p className="text-sm font-medium tracking-wide font-sans">{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
