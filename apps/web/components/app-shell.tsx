'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  LayoutDashboard,
  Link2,
  MoreHorizontal,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Scissors,
  Settings,
  ShieldCheck,
  SunMoon,
  UserCircle,
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
  activity: Activity,
  layout: LayoutDashboard,
  calendar: CalendarDays,
  receipt: ReceiptText,
  users: Users,
  team: UserRoundCog,
  scissors: Scissors,
  wallet: WalletCards,
  package: Package,
  boxes: Boxes,
  building: Building2,
  'credit-card': CreditCard,
  link: Link2,
  more: MoreHorizontal,
  palette: Palette,
  shield: ShieldCheck,
  settings: Settings,
};

const PUBLIC_STANDALONE_PATHS = ['/', '/login', '/forgotpassword'] as const;

function isPublicStandalonePath(pathname: string) {
  return (
    PUBLIC_STANDALONE_PATHS.some((path) => pathname === path) ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/')
  );
}

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
  collapsed = false,
  item,
  nested = false,
  onNavigate,
}: Readonly<{
  activeHref?: string;
  collapsed?: boolean;
  item: NavigationItem;
  nested?: boolean;
  onNavigate?: () => void;
}>) {
  const Icon = icons[item.icon];
  const router = useRouter();
  const prefetched = React.useRef(false);
  const active = activeHref === item.href;
  const prefetchOnIntent = React.useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    router.prefetch(item.href);
  }, [item.href, router]);
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (active) event.preventDefault();
      onNavigate?.();
    },
    [active, onNavigate],
  );

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={nested ? 'nav-link nav-link-child' : 'nav-link'}
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={handleClick}
      onFocus={prefetchOnIntent}
      onPointerEnter={prefetchOnIntent}
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
    const label = item.group ?? 'Operação';
    const group = groups.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
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
        aria-expanded={open}
        aria-label="Abrir mais menus"
        className="mobile-more-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
        <span>Configurações</span>
      </button>
      <div
        aria-hidden={!open}
        className={`mobile-action-menu mobile-overflow-menu ${open ? 'is-open' : ''}`}
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
        aria-label="Nenhuma ação disponível"
        className="mobile-add-button"
        disabled
        type="button"
      >
        <Plus size={25} strokeWidth={2.2} aria-hidden="true" />
      </button>
    );
  }

  if (actions.length === 1) {
    return (
      <Link
        aria-label={`Criar ${actions[0].label.toLowerCase()}`}
        className="mobile-add-button"
        href={actions[0].href}
      >
        <Plus size={25} strokeWidth={2.2} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="mobile-action-wrap">
      <button
        aria-expanded={open}
        aria-label="Criar"
        className="mobile-add-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Plus size={25} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <div className={`mobile-action-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
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
    </div>
  );
}

function UserControl({ isOnline }: Readonly<{ isOnline: boolean }>) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const session = useSessionContext();
  const { cycleTheme } = useTheme();

  React.useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  if (!session) return null;

  return (
    <div className="topbar-user-menu" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
        className="topbar-user-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <UserCircle size={21} aria-hidden="true" />
        <span>{session.userName}</span>
      </button>
      <div className={`topbar-user-popover ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="workspace-switcher compact">
          <span className="workspace-avatar" aria-hidden="true">
            BM
          </span>
          <WorkspaceSwitcher session={session} />
        </div>
        <div className="topbar-user-card">
          <span className="user-avatar" aria-hidden="true">
            LR
          </span>
          <div className="user-meta">
            <strong>{session.userName}</strong>
            <span>{session.role}</span>
          </div>
        </div>
        <div className="topbar-user-actions">
          <span className={`online-indicator ${isOnline ? '' : 'offline'}`} role="status">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <IconButton label="Alternar tema" onClick={cycleTheme}>
            <SunMoon size={18} aria-hidden="true" />
          </IconButton>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function ShellContent({ children }: Readonly<{ children: React.ReactNode }>) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const session = useSessionContext();
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  if (isPublicStandalonePath(pathname)) return <>{children}</>;
  if (!session) return <AuthGate />;

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
  const preferredMobileHrefs = ['/inicio', '/agenda', '/comandas', '/clientes'];
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
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
      <aside className="desktop-sidebar">
        <div className="sidebar-head">
          <BrandLogo />
          <IconButton
            label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </IconButton>
        </div>
        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {navigationGroups.map((group) => (
            <section className="sidebar-nav-section" key={group.label} aria-label={group.label}>
              <p className="sidebar-nav-label">{group.label}</p>
              {group.items.map((item) => (
                <div className="sidebar-nav-cluster" key={item.href}>
                  <NavLink activeHref={activeHref} collapsed={sidebarCollapsed} item={item} />
                  {!sidebarCollapsed && item.children.length ? (
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
      </aside>
      <div className="app-main">
        <header className="topbar app-topbar">
          <div className="topbar-context">
            <strong>{session.branchName}</strong>
            <p>{session.tenantName}</p>
          </div>
          <div className="topbar-actions">
            <IconButton label="Notificações">
              <Bell size={18} aria-hidden="true" />
            </IconButton>
            <UserControl isOnline={isOnline} />
          </div>
        </header>
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
