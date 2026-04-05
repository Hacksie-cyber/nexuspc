import { useState } from 'react';

export type Toast = { id: number; msg: string; type: 'success' | 'error' };

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  return { toasts, showToast };
}
