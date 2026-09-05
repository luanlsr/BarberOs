import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="forbidden-page">
      <div>
        <div className="empty-state-icon">
          <LockKeyhole size={19} aria-hidden="true" />
        </div>
        <h1>Acesso restrito.</h1>
        <p>Seu perfil não tem permissão para visualizar esta área.</p>
        <Link className="button button-secondary" href="/">
          Voltar para a visão geral
        </Link>
      </div>
    </div>
  );
}
