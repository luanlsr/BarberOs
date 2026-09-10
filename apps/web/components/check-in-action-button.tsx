'use client';

import * as React from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';

type CheckInActionState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'error'; code: string; message: string; requestId: string };

type CheckInActionButtonProps = Readonly<{
  appointmentId: string;
  label: string;
  description: string;
  className?: string;
  compact?: boolean;
}>;

export function CheckInActionButton({
  appointmentId,
  label,
  description,
  className,
  compact = false,
}: CheckInActionButtonProps) {
  const idempotencyKey = React.useRef<string | null>(null);
  const [online, setOnline] = React.useState(true);
  const [state, setState] = React.useState<CheckInActionState>({ type: 'idle' });
  const buttonClassName = (
    className ?? 'appointment-check-in-button ' + (compact ? 'compact' : '')
  ).trim();
  const stateId = appointmentId + '-check-in-state';
  const disabled = state.type === 'loading' || !online;

  if (!idempotencyKey.current) {
    idempotencyKey.current = ['check-in', appointmentId, randomRequestToken()].join('-');
  }

  React.useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  async function handleCheckIn() {
    const requestId = randomRequestToken();
    setState({ type: 'loading' });

    try {
      const response = await fetch('/api/v1/check-in', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey.current ?? requestId,
          'x-request-id': requestId,
        },
        body: JSON.stringify({ appointmentId, idempotencyKey: idempotencyKey.current }),
      });
      const payload = (await response.json().catch(() => null)) as CheckInApiResponse | null;

      if (!response.ok) {
        setState({
          type: 'error',
          code: payload?.error?.code ?? 'HTTP_' + response.status,
          message: payload?.error?.message ?? 'Nao conseguimos fazer check-in agora.',
          requestId: payload?.error?.requestId ?? requestId,
        });
        return;
      }

      const orderId = payload?.data?.id;
      if (!orderId) {
        setState({
          type: 'error',
          code: 'ORDER_NOT_RETURNED',
          message: 'Check-in concluido, mas a Comanda nao foi retornada.',
          requestId,
        });
        return;
      }

      window.location.assign('/comandas?orderId=' + encodeURIComponent(orderId));
    } catch {
      setState({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'Nao conseguimos conectar. Tente novamente.',
        requestId,
      });
    }
  }

  return (
    <div className="check-in-action">
      <button
        aria-describedby={state.type === 'error' || !online ? stateId : undefined}
        className={buttonClassName}
        disabled={disabled}
        onClick={handleCheckIn}
        title={description}
        type="button"
      >
        {state.type === 'loading' ? (
          <LoaderCircle className="check-in-action-spinner" size={16} aria-hidden="true" />
        ) : (
          <ShieldCheck size={16} aria-hidden="true" />
        )}
        <span>{state.type === 'loading' ? 'Abrindo...' : label}</span>
      </button>
      {!online ? (
        <p className="check-in-action-feedback" id={stateId} role="status">
          Check-in precisa de conexao.
        </p>
      ) : null}
      {state.type === 'error' ? (
        <p className="check-in-action-feedback danger" id={stateId} role="alert">
          {state.message} Codigo {state.code}. Request {state.requestId}.
        </p>
      ) : null}
    </div>
  );
}

function randomRequestToken() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

type CheckInApiResponse = {
  data?: { id?: string };
  error?: { code?: string; message?: string; requestId?: string };
};
