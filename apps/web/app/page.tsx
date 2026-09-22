import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LandingPage } from '../components/landing-page';
import { getVerifiedSessionContext } from '../lib/auth/server';
import { getPublicPlans } from '../lib/public-plans';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'BarberOS | Sistema de gestão para barbearias',
  description:
    'Centralize agenda, clientes, equipe, comandas, estoque, caixa e financeiro da sua barbearia em um único sistema.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'BarberOS | Sistema de gestão para barbearias',
    description:
      'Organize sua barbearia com agenda, comandas, estoque, caixa, financeiro e equipe em um único lugar.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BarberOS | Sistema de gestão para barbearias',
    description: 'Operação inteligente para barbearias que querem controle e velocidade.',
  },
};

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getVerifiedSessionContext();
  if (!session) {
    const [plans, resolvedSearchParams] = await Promise.all([
      getPublicPlans(),
      searchParams ?? Promise.resolve({}),
    ]);
    return <LandingPage plans={plans} searchParams={resolvedSearchParams} />;
  }
  if (session.role === 'PLATFORM_MASTER') redirect('/master');
  redirect('/inicio');
}
