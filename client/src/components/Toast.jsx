import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
  };

  return { toasts, addToast, removeToast };
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-20 right-4 z-[100] space-y-2 max-w-sm w-full" role="alert" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-2xl shadow-lg border text-sm font-medium animate-slideIn ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />}
          {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onRemove(toast.id)} className="text-current opacity-50 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
