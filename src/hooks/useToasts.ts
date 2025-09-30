import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../types';

interface UseToastsReturn {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const useToasts = (): UseToastsReturn => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    message: string,
    type: ToastType = ToastType.Info,
    duration: number = 3000
  ) => {
    const toast: ToastMessage = {
      id: crypto.randomUUID(),
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
};

export default useToasts;
