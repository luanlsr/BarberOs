'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type NavigationMark = {
  href: string;
  label: string;
  source: string;
  start: number;
};

declare global {
  interface Window {
    __barberosNavigationMark?: NavigationMark;
  }
}

export function markNavigationClick(href: string, label: string, source = 'shell') {
  if (typeof window === 'undefined') return;

  const mark: NavigationMark = {
    href,
    label,
    source,
    start: performance.now(),
  };
  window.__barberosNavigationMark = mark;
  performance.mark(`barberos:navigation:${href}:click`);
  console.info('[BarberOS nav] click', {
    href,
    label,
    source,
    atMs: Math.round(mark.start),
  });
}

export function NavigationPerformanceLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  React.useEffect(() => {
    const commit = performance.now();
    const mark = window.__barberosNavigationMark;
    const currentHref = search ? `${pathname}?${search}` : pathname;

    performance.mark(`barberos:navigation:${currentHref}:commit`);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const painted = performance.now();
        const clickToCommit = mark ? commit - mark.start : undefined;
        const clickToPaint = mark ? painted - mark.start : undefined;
        const commitToPaint = painted - commit;

        console.info('[BarberOS nav] rendered', {
          from: mark?.href ?? '(direct-load)',
          to: currentHref,
          label: mark?.label,
          source: mark?.source,
          clickToCommitMs: clickToCommit === undefined ? undefined : Math.round(clickToCommit),
          clickToPaintMs: clickToPaint === undefined ? undefined : Math.round(clickToPaint),
          commitToPaintMs: Math.round(commitToPaint),
        });

        if (mark) {
          window.__barberosNavigationMark = undefined;
        }
      });
    });
  }, [pathname, search]);

  return null;
}
