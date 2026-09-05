'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@barberos/ui';

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <div className="error-page">
      <div>
        <h1>Não foi possível carregar esta área.</h1>
        <p>O estado do sistema não foi alterado. Tente novamente.</p>
        <Button variant="primary" onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" /> Tentar novamente
        </Button>
      </div>
    </div>
  );
}
