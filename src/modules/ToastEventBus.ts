export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;

class ToastEventBus {
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const toast: ToastMessage = {
      id: 'toast_' + Date.now() + Math.random().toString(36).substring(2, 9),
      message,
      type,
      duration,
    };
    this.listeners.forEach(listener => listener(toast));
  }
}

export const toastBus = new ToastEventBus();
