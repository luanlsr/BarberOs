'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
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
import { BrandLogo } from './brand-logo';
import { LogoutButton } from './logout-button';
import { WorkspaceSwitcher } from './workspace-switcher';

type NavigationTreeItem = NavigationItem & { children: NavigationItem[] };

const icons = {
  layout: LayoutDashboard,
  calendar: CalendarDays,
  receipt: ReceiptText,
  users: Users,
  team: UserRoundCog,
  scissors: Scissors,
  wallet: WalletCards,
  package: Package,
  boxes: Boxes,
  more: MoreHorizontal,
};

const actionIcons = {
  appointment: CalendarPlus,
  cash: WalletCards,
  customer: UserPlus,
  expense: ReceiptText,
  order: ReceiptText,
  payment: WalletCards,
  product: Package,
};
function NavLink({
  activeHref,
  item,
  nested = false,
  onNavigate,
}: Readonly<{
  activeHref?: string;
  item: NavigationItem;
  nested?: boolean;
  onNavigate?: () => void;
}>) {
  const Icon = icons[item.icon];
  const active = activeHref === item.href;
  return (
    <Link
      className={`nav-link ${nested ? 'nav-link-child' : ''}`}
      href={item.href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <Icon size={18} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function groupNavigationItems(items: NavigationItem[]) {
  const treeItems = buildNavigationTree(items);
  const groups: Array<{ label: string; items: NavigationTreeItem[] }> = [];
  for (const item of treeItems) {
    const label = item.group ?? 'Operacao';
    const group = groups.find((entry) => entry.label === label);
    if (group) {
      group.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

function buildNavigationTree(items: NavigationItem[]): NavigationTreeItem[] {
  const parents = items.filter((item) => !item.parentHref);
  return parents.map((item) => ({
    ...item,
    children: items.filter((candidate) => candidate.parentHref === item.href),
  }));
}

function getActiveHref(pathname: string, items: NavigationItem[]) {
  return items
    .filter((item) =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(item.href + '/'),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function MobileOverflowMenu({
  activeHref,
  items,
}: Readonly<{ activeHref?: string; items: NavigationItem[] }>) {
  const [open, setOpen] = React.useState(false);

  if (!items.length) return null;

  return (
    <div className="mobile-action-wrap">
      <button
        className="mobile-more-button"
        type="button"
        aria-label="Abrir mais menus"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
        <span>Mais</span>
      </button>
      <div
        className={`mobile-action-menu mobile-overflow-menu ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
      >
        {buildNavigationTree(items).map((item) => (
          <div className="mobile-overflow-cluster" key={item.href}>
            <NavLink activeHref={activeHref} item={item} onNavigate={() => setOpen(false)} />
            {item.children.map((child) => (
              <NavLink
                activeHref={activeHref}
                item={child}
                key={child.href}
                nested
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>
        ))}
      </div>
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
        prefetch={false}
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
      <div className={`mobile-action-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        {actions.map((action) => {
          const Icon = actionIcons[action.icon];
          return (
            <Link
              href={action.href}
              key={action.href}
              prefetch={false}
              onClick={() => setOpen(false)}
            >
              <Icon size={16} aria-hidden="true" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ShellContent({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useSessionContext();
  const pathname = usePathname();
  const { cycleTheme } = useTheme();
  const isOnline = useOnlineStatus();
  if (!session || pathname === '/login') return <AuthGate />;

  const entitlements = session.entitlements ?? [];
  const visibleItems = filterNavigation(navigationItems, session.permissions, entitlements, {
    role: session.role,
  });
  const visibleActions = filterPrimaryActions(
    primaryActionItems,
    session.permissions,
    entitlements,
    { role: session.role },
  );
  const activeHref = getActiveHref(pathname, visibleItems);
  const navigationGroups = groupNavigationItems(visibleItems);
  const preferredMobileHrefs = ['/', '/agenda', '/comandas', '/clientes'];
  const mobileCandidates = visibleItems.filter((item) => item.mobile);
  const preferredMobileItems = preferredMobileHrefs
    .map((href) => mobileCandidates.find((item) => item.href === href))
    .filter((item): item is NavigationItem => Boolean(item));
  const fallbackMobileItems = mobileCandidates.filter(
    (item) => !preferredMobileItems.some((preferredItem) => preferredItem.href === item.href),
  );
  const mobileNavItems = [...preferredMobileItems, ...fallbackMobileItems].slice(0, 3);
  const mobileOverflowItems = visibleItems.filter(
    (item) => !mobileNavItems.some((mobileItem) => mobileItem.href === item.href),
  );
  const leadingMobileItems = mobileNavItems.slice(0, 2);
  const trailingMobileItems = mobileNavItems.slice(2, 3);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <BrandLogo />
        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {navigationGroups.map((group) => (
            <section className="sidebar-nav-section" key={group.label} aria-label={group.label}>
              <p className="sidebar-nav-label">{group.label}</p>
              {group.items.map((item) => (
                <div className="sidebar-nav-cluster" key={item.href}>
                  <NavLink activeHref={activeHref} item={item} />
                  {item.children.length ? (
                    <div className="sidebar-subnav" aria-label={`${item.label} submenu`}>
                      {item.children.map((child) => (
                        <NavLink activeHref={activeHref} item={child} key={child.href} nested />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-utility-row">
            <span className={`online-indicator ${isOnline ? '' : 'offline'}`} role="status">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <IconButton label="Alternar tema" onClick={cycleTheme}>
              <SunMoon size={18} aria-hidden="true" />
            </IconButton>
          </div>
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
        <main className="main-content">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Navegacao mobile">
        {leadingMobileItems.map((item) => (
          <NavLink activeHref={activeHref} key={item.href} item={item} />
        ))}
        <MobileCreateAction actions={visibleActions} />
        {trailingMobileItems.map((item) => (
          <NavLink activeHref={activeHref} key={item.href} item={item} />
        ))}
        <MobileOverflowMenu activeHref={activeHref} items={mobileOverflowItems} />
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
