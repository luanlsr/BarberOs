'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Scissors,
  SunMoon,
  UserPlus,
  UserRoundCog,
  Users,
  WalletCards,
} from 'lucide-react';
import { IconButton } from '@barberos/ui';
import type { SessionContext } from '@barberos/contracts';
import { SessionProvider, useSessionContext } from '../lib/session-context';
import {
  filterNavigation,
  filterPrimaryActions,
  navigationItems,
  primaryActionItems,
  type NavigationItem,
  type PrimaryActionItem,
} from '../lib/navigation';
import { useTheme } from './theme-provider';
import { AuthGate } from './auth-gate';
import { LogoutButton } from './logout-button';
import { WorkspaceSwitcher } from './workspace-switcher';

const icons = {
  layout: LayoutDashboard,
  calendar: CalendarDays,
  users: Users,
  team: UserRoundCog,
  scissors: Scissors,
  wallet: WalletCards,
  more: MoreHorizontal,
};

const actionIcons = {
  appointment: CalendarPlus,
  customer: UserPlus,
};

function NavLink({ item }: Readonly<{ item: NavigationItem }>) {
  const pathname = usePathname();
  const Icon = icons[item.icon];
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return (
    <Link className="nav-link" href={item.href} aria-current={active ? 'page' : undefined}>
      <Icon size={18} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function DesktopQuickActions({ actions }: Readonly<{ actions: PrimaryActionItem[] }>) {
  if (!actions.length) return null;

  return (
    <div className="desktop-quick-actions" aria-label="Acoes rapidas">
      {actions.map((action) => {
        const Icon = actionIcons[action.icon];
        return (
          <Link
            className="button button-secondary quick-action-button"
            href={action.href}
            key={action.href}
          >
            <Icon size={16} aria-hidden="true" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileCreateAction({ actions }: Readonly<{ actions: PrimaryActionItem[] }>) {
  const [open, setOpen] = React.useState(false);

  if (!actions.length) {
    return (
      <button
        className="mobile-add-button"
        type="button"
        disabled
        aria-label="Nenhuma acao disponivel"
      >
        <Plus size={25} strokeWidth={2.2} aria-hidden="true" />
      </button>
    );
  }

  if (actions.length === 1) {
    return (
      <Link
        className="mobile-add-button"
        href={actions[0].href}
        aria-label={`Criar ${actions[0].label.toLowerCase()}`}
      >
        <Plus size={25} strokeWidth={2.2} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="mobile-action-wrap">
      <button
        className="mobile-add-button"
        type="button"
        aria-label="Criar"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Plus size={25} strokeWidth={2.2} aria-hidden="true" />
      </button>
      {open ? (
        <div className="mobile-action-menu">
          {actions.map((action) => {
            const Icon = actionIcons[action.icon];
            return (
              <Link href={action.href} key={action.href} onClick={() => setOpen(false)}>
                <Icon size={16} aria-hidden="true" />
                {action.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ShellContent({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useSessionContext();
  const pathname = usePathname();
  const { theme, cycleTheme } = useTheme();
  const isOnline = useOnlineStatus();
  if (!session || pathname === '/login') return <AuthGate />;

  const entitlements = session.entitlements ?? [];
  const visibleItems = filterNavigation(navigationItems, session.permissions, entitlements);
  const visibleActions = filterPrimaryActions(
    primaryActionItems,
    session.permissions,
    entitlements,
  );
  const mobileNavItems = visibleItems.filter((item) => item.mobile).slice(0, 4);
  const leadingMobileItems = mobileNavItems.slice(0, 2);
  const trailingMobileItems = mobileNavItems.slice(2, 4);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            B
          </span>
          <div>
            <div className="brand-name">BarberOS</div>
            <p className="brand-caption">operacao inteligente</p>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="workspace-switcher">
            <span className="workspace-avatar" aria-hidden="true">
              BM
            </span>
            <WorkspaceSwitcher session={session} />
          </div>
          <div className="workspace-switcher">
            <span className="user-avatar" aria-hidden="true">
              LR
            </span>
            <div className="user-meta">
              <strong>{session.userName}</strong>
              <span>{session.role}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-context">
            <div className={`online-indicator ${isOnline ? '' : 'offline'}`} role="status">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <div>
              <p>{session.tenantName}</p>
              <strong>{session.branchName}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <DesktopQuickActions actions={visibleActions} />
            <span className="section-caption">Tema: {theme}</span>
            <IconButton label="Alternar tema" onClick={cycleTheme}>
              <SunMoon size={18} aria-hidden="true" />
            </IconButton>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Navegacao mobile">
        {leadingMobileItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        <MobileCreateAction actions={visibleActions} />
        {trailingMobileItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </div>
  );
}

function useOnlineStatus() {
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function AppShell({
  children,
  session,
}: Readonly<{ children: React.ReactNode; session?: SessionContext | null }>) {
  return (
    <SessionProvider session={session}>
      <ShellContent>{children}</ShellContent>
    </SessionProvider>
  );
}
