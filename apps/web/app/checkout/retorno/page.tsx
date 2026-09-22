import Link from 'next/link';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

type CheckoutReturnPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: 'Status do checkout | BarberOS',
};

export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
  const params = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const status = typeof params.status === 'string' ? params.status : 'success';
  const copy = getReturnCopy(status);
  const Icon = copy.icon;

  return (
    <main className="checkout-return-page">
      <section className="checkout-return-card">
        <Icon size={38} aria-hidden="true" />
        <p className="eyebrow">Checkout BarberOS</p>
        <h1>{copy.title}</h1>
        <p>{copy.text}</p>
        <div className="checkout-return-actions">
          <Link className="button button-primary" href="/">
            Voltar para a página inicial
          </Link>
          <Link className="button button-secondary" href="/login">
            Entrar
          </Link>
        </div>
      </section>
    </main>
  );
}

function getReturnCopy(status: string) {
  if (status === 'cancel') {
    return {
      icon: XCircle,
      title: 'Checkout cancelado',
      text: 'Você pode escolher um plano novamente quando quiser. Nenhum acesso foi criado sem confirmação de pagamento.',
    };
  }
  if (status === 'expired') {
    return {
      icon: Clock3,
      title: 'Checkout expirado',
      text: 'O link expirou por segurança. Volte para a página inicial e gere um novo checkout.',
    };
  }
  return {
    icon: CheckCircle2,
    title: 'Pagamento em processamento',
    text: 'Assim que o Asaas confirmar o pagamento por webhook, criaremos sua barbearia e enviaremos as credenciais iniciais por e-mail.',
  };
}
