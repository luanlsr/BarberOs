import * as React from 'react';
export type FinanceSectionTab = 'summary' | 'expenses' | 'commissions';

const tabs: readonly { id: FinanceSectionTab; href: string; label: string }[] = [
  { id: 'summary', href: '/financeiro', label: 'Resumo' },
  { id: 'expenses', href: '/financeiro/despesas', label: 'Despesas' },
  { id: 'commissions', href: '/financeiro/comissoes', label: 'Comissões' },
];

export function FinanceSectionTabs({ active }: Readonly<{ active: FinanceSectionTab }>) {
  return (
    <nav className="finance-section-tabs" aria-label="Seções do financeiro">
      {tabs.map((tab) => (
        <a
          aria-current={tab.id === active ? 'page' : undefined}
          className="finance-section-tab"
          href={tab.href}
          key={tab.id}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}