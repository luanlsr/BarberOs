'use client';

import * as React from 'react';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function LandingAnalytics() {
  React.useEffect(() => {
    emitLandingEvent('landing_page_view');

    function handleClick(event: MouseEvent) {
      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-event]') : null;
      if (!target) return;
      emitLandingEvent(target.dataset.event ?? 'landing_click', {
        plan: target.dataset.plan,
        href: target instanceof HTMLAnchorElement ? target.href : undefined,
      });
    }

    function handleToggle(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      const question = target.querySelector('summary')?.textContent?.trim();
      emitLandingEvent('faq_opened', { question });
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('toggle', handleToggle, true);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('toggle', handleToggle, true);
    };
  }, []);

  return null;
}

function emitLandingEvent(name: string, properties: Record<string, unknown> = {}) {
  const payload = {
    event: name,
    page: 'landing',
    ...Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)),
  };
  window.dispatchEvent(new CustomEvent('barberos:analytics', { detail: payload }));
  window.dataLayer?.push(payload);
}
