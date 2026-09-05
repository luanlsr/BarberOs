import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import { ThemeProvider } from '../components/theme-provider';
import { getSessionContext } from '../lib/auth/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'BarberOS',
  description: 'Operacao inteligente para barbearias',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionContext();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell session={session}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
