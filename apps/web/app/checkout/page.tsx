import Link from 'next/link';
import { CheckoutFlow } from '../../components/checkout-flow';
import { BrandLogo } from '../../components/brand-logo';
import { getPublicPlans } from '../../lib/public-plans';

type CheckoutSearchParams = Record<string, string | string[] | undefined>;

type CheckoutPageProps = {
  searchParams?: Promise<CheckoutSearchParams>;
};

export const metadata = {
  title: 'Checkout | BarberOS',
  description: 'Contrate o BarberOS e configure sua barbearia.',
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const [plans, params] = await Promise.all<
    readonly [ReturnType<typeof getPublicPlans>, Promise<CheckoutSearchParams>]
  >([getPublicPlans(), searchParams ?? Promise.resolve({} as CheckoutSearchParams)]);
  const selectedPlan = typeof params.plan === 'string' ? params.plan : undefined;

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <Link href="/" className="landing-brand" aria-label="BarberOS">
          <BrandLogo />
        </Link>
        <Link className="button button-ghost" href="/login">
          Entrar
        </Link>
      </header>
      <CheckoutFlow plans={plans} selectedPlan={selectedPlan} marketingParams={params} />
    </main>
  );
}
