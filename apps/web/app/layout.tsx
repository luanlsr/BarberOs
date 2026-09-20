import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import { ThemeProvider } from '../components/theme-provider';
import { getSessionContext } from '../lib/auth/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'BarberOS',
  description: 'Operacao inteligente para barbearias',
};

const themeInitScript = `
(function () {
  try {
    var storedTheme = window.localStorage.getItem('barberos-theme');
    var theme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system';
    var resolvedTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.dataset.theme = resolvedTheme;
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionContext();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AppShell session={session}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
