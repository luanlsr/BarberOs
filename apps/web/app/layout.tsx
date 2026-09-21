import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import { ThemeProvider } from '../components/theme-provider';
import { getSessionContext } from '../lib/auth/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'BarberOS',
  description: 'Operacao inteligente para barbearias',
};

const browserDiagnosticsScript = `
(function () {
  var suppressedStartTimeError = false;

  function isNextWebVitalsStartTimeError(eventOrReason) {
    var error = eventOrReason && (eventOrReason.error || eventOrReason.reason || eventOrReason);
    var message = String(
      (eventOrReason && eventOrReason.message) ||
      (error && error.message) ||
      eventOrReason ||
      ''
    );
    var stack = String((error && error.stack) || '');
    var filename = String((eventOrReason && eventOrReason.filename) || '');

    return (
      message.indexOf("Cannot read properties of undefined (reading 'startTime')") !== -1 &&
      (
        stack.indexOf('reportAllChanges') !== -1 ||
        stack.indexOf('web-vitals') !== -1 ||
        filename.indexOf('VM') !== -1 ||
        filename === '<anonymous>' ||
        filename === ''
      )
    );
  }

  function suppressKnownDevRuntimeError(event) {
    if (!isNextWebVitalsStartTimeError(event)) return;
    event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    if (!suppressedStartTimeError) {
      suppressedStartTimeError = true;
      console.info('[BarberOS diagnostics] suppressed Next/web-vitals startTime error during local navigation.');
    }
  }

  window.addEventListener('error', suppressKnownDevRuntimeError, true);
  window.addEventListener('unhandledrejection', suppressKnownDevRuntimeError, true);
})();
`;

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
        <script dangerouslySetInnerHTML={{ __html: browserDiagnosticsScript }} />
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
