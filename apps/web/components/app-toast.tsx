'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export type AppToastTone = 'success' | 'warning' | 'danger';
export type AppToastState = { id: number; message: string; tone: AppToastTone } | null;

export function useAppToast(timeoutMs = 3200) {
  const [toast, setToast] = React.useState<AppToastState>(null);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [timeoutMs, toast]);

  const showToast = React.useCallback((message: string, tone: AppToastTone = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const dismissToast = React.useCallback(() => setToast(null), []);

  return { dismissToast, showToast, toast };
}

export function AppToastRegion({
  onDismiss,
  toast,
}: Readonly<{ onDismiss: () => void; toast: AppToastState }>) {
  const Icon = toast?.tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast ? (
        <div className={`app-toast ${toast.tone}`} role="status">
          <Icon size={17} aria-hidden="true" />
          <span>{toast.message}</span>
          <button type="button" onClick={onDismiss} aria-label="Fechar notificação">
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
