import { ForgotPasswordForm } from '../../components/forgot-password-form';

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: 'Recuperar senha | BarberOS',
  description: 'Recupere o acesso à sua conta BarberOS.',
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await (searchParams ??
    Promise.resolve({} as Record<string, string | string[] | undefined>));
  const recoveryCode = typeof params.code === 'string' ? params.code : undefined;
  return <ForgotPasswordForm recoveryCode={recoveryCode} />;
}
