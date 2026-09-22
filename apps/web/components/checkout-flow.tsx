'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  LockKeyhole,
  Store,
  UserRound,
} from 'lucide-react';
import type { PublicPlan } from '../lib/public-plans';

type CheckoutFlowProps = {
  plans: PublicPlan[];
  selectedPlan?: string;
  marketingParams?: Record<string, string | string[] | undefined>;
};

type CheckoutForm = {
  planCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  document: string;
  barbershopName: string;
  branchName: string;
  city: string;
  state: string;
  employeesCount: string;
};

const steps = [
  { label: 'Plano', icon: CreditCard },
  { label: 'Responsável', icon: UserRound },
  { label: 'Barbearia', icon: Store },
  { label: 'Revisão', icon: LockKeyhole },
];

const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function CheckoutFlow({ plans, selectedPlan, marketingParams = {} }: CheckoutFlowProps) {
  const defaultPlan =
    plans.find((plan) => plan.code === selectedPlan)?.code ??
    plans.find((plan) => plan.featured)?.code ??
    plans[0]?.code ??
    'pro-ai';
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CheckoutForm>({
    planCode: defaultPlan,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    document: '',
    barbershopName: '',
    branchName: 'Unidade Centro',
    city: '',
    state: '',
    employeesCount: '',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const plan = useMemo(
    () => plans.find((candidate) => candidate.code === form.planCode) ?? plans[0],
    [form.planCode, plans],
  );

  const canContinue = validateStep(step, form);

  function update<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function next() {
    if (!canContinue) {
      setError('Preencha os dados obrigatórios para continuar.');
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submit() {
    if (!validateStep(3, form)) {
      setError('Revise os dados antes de continuar.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/checkout/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planCode: form.planCode,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          document: form.document,
          barbershopName: form.barbershopName,
          branchName: form.branchName,
          city: form.city,
          state: form.state,
          employeesCount: Number(form.employeesCount || 0),
          marketingSource: extractMarketingParams(marketingParams),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        checkoutUrl?: string;
        message?: string;
      } | null;
      if (!response.ok || !result?.checkoutUrl) {
        throw new Error(result?.message ?? 'Não foi possível iniciar o checkout.');
      }
      window.location.assign(result.checkoutUrl);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Não foi possível iniciar o checkout.',
      );
      setPending(false);
    }
  }

  return (
    <section className="checkout-shell">
      <div className="checkout-copy">
        <p className="eyebrow">Checkout seguro com Asaas</p>
        <h1>Configure sua barbearia antes do pagamento.</h1>
        <p>
          Coletamos os dados necessários para criar seu tenant, unidade inicial e usuário admin
          assim que o pagamento for confirmado pelo Asaas.
        </p>
        <div className="checkout-security-list">
          <span>
            <Check size={16} aria-hidden="true" /> Pagamento hospedado pelo Asaas
          </span>
          <span>
            <Check size={16} aria-hidden="true" /> Provisionamento após webhook confirmado
          </span>
          <span>
            <Check size={16} aria-hidden="true" /> Credenciais iniciais por e-mail
          </span>
        </div>
      </div>

      <div className="checkout-card">
        <div className="checkout-steps" aria-label="Etapas do checkout">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}
                onClick={() => index < step && setStep(index)}
                aria-current={index === step ? 'step' : undefined}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {step === 0 ? (
          <div className="checkout-step-panel">
            <h2>Escolha o plano</h2>
            <div className="checkout-plan-options">
              {plans.map((item) => (
                <label key={item.code} className={item.code === form.planCode ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="plan"
                    value={item.code}
                    checked={item.code === form.planCode}
                    onChange={() => update('planCode', item.code)}
                  />
                  <span>{item.name}</span>
                  <strong>{formatCurrency(item.priceAmountCents)}/mês</strong>
                  <small>{item.description}</small>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="checkout-step-panel">
            <h2>Dados do responsável</h2>
            <div className="checkout-field-grid">
              <Field
                label="Nome completo"
                value={form.customerName}
                onChange={(value) => update('customerName', value)}
                autoComplete="name"
              />
              <Field
                label="E-mail de acesso"
                type="email"
                value={form.customerEmail}
                onChange={(value) => update('customerEmail', value)}
                autoComplete="email"
              />
              <Field
                label="WhatsApp"
                value={form.customerPhone}
                onChange={(value) => update('customerPhone', formatBrazilianPhone(value))}
                autoComplete="tel"
                inputMode="tel"
                maxLength={15}
              />
              <Field
                label="CPF/CNPJ"
                value={form.document}
                onChange={(value) => update('document', formatCpfCnpj(value))}
                inputMode="numeric"
                maxLength={18}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="checkout-step-panel">
            <h2>Dados da barbearia</h2>
            <div className="checkout-field-grid">
              <Field
                label="Nome da barbearia"
                value={form.barbershopName}
                onChange={(value) => update('barbershopName', value)}
              />
              <Field
                label="Unidade inicial"
                value={form.branchName}
                onChange={(value) => update('branchName', value)}
              />
              <Field label="Cidade" value={form.city} onChange={(value) => update('city', value)} />
              <Field
                label="UF"
                value={form.state}
                maxLength={2}
                onChange={(value) => update('state', value.toUpperCase())}
              />
              <Field
                label="Quantidade de funcionários"
                type="number"
                value={form.employeesCount}
                onChange={(value) => update('employeesCount', value)}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="checkout-step-panel">
            <h2>Revise e vá para o pagamento</h2>
            <div className="checkout-review">
              <ReviewLine
                label="Plano"
                value={`${plan?.name ?? 'Plano'} - ${formatCurrency(plan?.priceAmountCents ?? 0)}/mês`}
              />
              <ReviewLine
                label="Responsável"
                value={`${form.customerName} · ${form.customerEmail}`}
              />
              <ReviewLine label="Barbearia" value={`${form.barbershopName} · ${form.branchName}`} />
              <ReviewLine
                label="Local"
                value={[form.city, form.state].filter(Boolean).join(' / ') || 'Não informado'}
              />
            </div>
            <p className="checkout-note">
              A cobrança será concluída no ambiente hospedado do Asaas. O BarberOS só cria o acesso
              depois da confirmação assíncrona do pagamento.
            </p>
          </div>
        ) : null}

        {error ? <p className="checkout-error">{error}</p> : null}

        <div className="checkout-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={step === 0 || pending}
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
          >
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <button className="button button-primary" type="button" onClick={next}>
              Continuar <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              onClick={submit}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : (
                <CreditCard size={16} aria-hidden="true" />
              )}
              Ir para pagamento
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  maxLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  return (
    <label className="checkout-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length <= 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
function validateStep(step: number, form: CheckoutForm): boolean {
  if (step === 0) return Boolean(form.planCode);
  if (step === 1)
    return Boolean(
      form.customerName &&
      /^\S+@\S+\.\S+$/.test(form.customerEmail) &&
      form.customerPhone.replace(/\D/g, '').length >= 10,
    );
  if (step === 2) return Boolean(form.barbershopName && form.branchName);
  return validateStep(0, form) && validateStep(1, form) && validateStep(2, form);
}

function extractMarketingParams(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    utmKeys.flatMap((key) => {
      const value = params[key];
      return typeof value === 'string' && value ? [[key, value]] : [];
    }),
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}
