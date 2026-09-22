import { parsePublicEnv, parseServerEnv } from '@barberos/config';
import { createSupabaseAdminClient } from '../supabase-admin';
import { createAsaasCheckout, toAsaasMoney } from './asaas';
import { renderEmailTemplate } from '../email/templates';

export type CheckoutLeadInput = {
  planCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  document?: string;
  barbershopName: string;
  branchName?: string;
  city?: string;
  state?: string;
  employeesCount?: number;
  marketingSource?: Record<string, string>;
};

type Row = Record<string, unknown>;

export async function createCheckoutSession(input: CheckoutLeadInput) {
  const env = parseServerEnv(process.env);
  const publicEnv = parsePublicEnv(process.env);
  if (!env.ASAAS_API_KEY) throw new Error('ASAAS_API_KEY is required to create checkout sessions.');

  const supabase = createSupabaseAdminClient();
  const { data: plan, error: planError } = await supabase
    .from('saas_plans')
    .select('id, code, name, description, price_amount_cents, billing_interval, status')
    .eq('code', input.planCode)
    .eq('status', 'ACTIVE')
    .single();

  if (planError || !plan) throw new Error('CHECKOUT_PLAN_NOT_FOUND');

  const normalized = normalizeCheckoutInput(input);
  const amountCents = number(plan.price_amount_cents);
  const billingInterval = text(plan.billing_interval) === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

  const { data: session, error: sessionError } = await supabase
    .from('checkout_sessions')
    .insert({
      plan_id: text(plan.id),
      status: 'DRAFT',
      customer_name: normalized.customerName,
      customer_email: normalized.customerEmail,
      customer_phone: normalized.customerPhone,
      document: normalized.document,
      barbershop_name: normalized.barbershopName,
      branch_name: normalized.branchName,
      city: normalized.city,
      state: normalized.state,
      employees_count: normalized.employeesCount,
      marketing_source: normalized.marketingSource,
      amount_cents: amountCents,
      billing_interval: billingInterval,
    })
    .select('id')
    .single();

  if (sessionError || !session)
    throw new Error(`CHECKOUT_SESSION_CREATE_FAILED:${sessionError?.message}`);

  const sessionId = text(session.id);
  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const checkout = await createAsaasCheckout({
    apiKey: env.ASAAS_API_KEY,
    environment: env.ASAAS_ENVIRONMENT,
    externalReference: sessionId,
    customerData: {
      name: normalized.customerName,
      email: normalized.customerEmail,
      cpfCnpj: normalized.document,
      mobilePhone: normalized.customerPhone,
    },
    items: [
      {
        name: `BarberOS - ${text(plan.name, 'Plano mensal')}`,
        description: text(plan.description, 'Assinatura mensal do BarberOS'),
        quantity: 1,
        value: toAsaasMoney(amountCents),
      },
    ],
    subscription: {
      cycle: billingInterval,
      nextDueDate: nextDueDate(),
    },
    successUrl: `${appUrl}/checkout/retorno?status=success&session=${sessionId}`,
    cancelUrl: `${appUrl}/checkout/retorno?status=cancel&session=${sessionId}`,
    expiredUrl: `${appUrl}/checkout/retorno?status=expired&session=${sessionId}`,
  });

  const { error: updateError } = await supabase
    .from('checkout_sessions')
    .update({
      status: 'PENDING_PAYMENT',
      asaas_checkout_id: checkout.id,
      asaas_checkout_url: checkout.url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (updateError) throw new Error(`CHECKOUT_SESSION_UPDATE_FAILED:${updateError.message}`);

  return { sessionId, checkoutUrl: checkout.url };
}

export async function processAsaasWebhook(payload: Row) {
  const supabase = createSupabaseAdminClient();
  const eventId = text(payload.id, crypto.randomUUID());
  const eventType = text(payload.event, 'UNKNOWN');
  const checkout = isRecord(payload.checkout) ? payload.checkout : undefined;
  const subscription = isRecord(payload.subscription) ? payload.subscription : undefined;
  const checkoutSubscription = isRecord(checkout?.subscription) ? checkout.subscription : undefined;
  const checkoutId = text(checkout?.id);
  const subscriptionId = text(subscription?.id) || text(checkoutSubscription?.id);
  const externalReference =
    text(checkout?.externalReference) || text(subscription?.externalReference);

  const existingEvent = await supabase
    .from('billing_events')
    .select('id, status')
    .eq('provider', 'ASAAS')
    .eq('external_event_id', eventId)
    .maybeSingle();

  const existingBillingEvent = existingEvent.data as Row | null;

  if (text(existingBillingEvent?.status) === 'PROCESSED') return { status: 'duplicate' as const };

  const { error: eventError } = await supabase.from('billing_events').upsert(
    {
      provider: 'ASAAS',
      event_type: eventType,
      external_event_id: eventId,
      payload,
      status: 'RECEIVED',
      received_at: new Date().toISOString(),
    },
    { onConflict: 'provider,external_event_id' },
  );
  if (eventError) throw new Error(`BILLING_EVENT_RECORD_FAILED:${eventError.message}`);

  if (eventType === 'CHECKOUT_PAID') {
    const session = await findCheckoutSession(supabase, { checkoutId, externalReference });
    if (!session) throw new Error('CHECKOUT_SESSION_NOT_FOUND');
    await provisionPaidCheckoutSession(supabase, session, { checkoutId, subscriptionId });
  } else if (eventType === 'CHECKOUT_CANCELED' || eventType === 'CHECKOUT_EXPIRED') {
    const session = await findCheckoutSession(supabase, { checkoutId, externalReference });
    if (session && !['PAID', 'PROVISIONING', 'PROVISIONED'].includes(text(session.status))) {
      await supabase
        .from('checkout_sessions')
        .update({
          status: eventType === 'CHECKOUT_CANCELED' ? 'CANCELED' : 'EXPIRED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', text(session.id));
    }
  } else if (eventType.startsWith('SUBSCRIPTION_') && subscriptionId) {
    await syncSubscriptionStatus(supabase, subscriptionId, text(subscription?.status));
  }

  await supabase
    .from('billing_events')
    .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
    .eq('provider', 'ASAAS')
    .eq('external_event_id', eventId);

  return { status: 'processed' as const };
}

async function provisionPaidCheckoutSession(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  session: Row,
  provider: { checkoutId: string; subscriptionId: string },
) {
  const sessionId = text(session.id);
  if (text(session.status) === 'PROVISIONED') return;

  await supabase
    .from('checkout_sessions')
    .update({
      status: 'PROVISIONING',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  try {
    const temporaryPassword = generateTemporaryPassword();
    const email = text(session.customer_email).toLowerCase();
    const name = text(session.customer_name);

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        onboarding_source: 'asaas_checkout',
        checkout_session_id: sessionId,
      },
    });
    if (authError || !authUser.user)
      throw new Error(`AUTH_USER_CREATE_FAILED:${authError?.message}`);

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: text(session.barbershop_name), status: 'ACTIVE' })
      .select('id')
      .single();
    if (tenantError || !tenant) throw new Error(`TENANT_CREATE_FAILED:${tenantError?.message}`);

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert({
        tenant_id: text(tenant.id),
        name: text(session.branch_name, 'Unidade Centro'),
        status: 'ACTIVE',
      })
      .select('id')
      .single();
    if (branchError || !branch) throw new Error(`BRANCH_CREATE_FAILED:${branchError?.message}`);

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: authUser.user.id,
        tenant_id: text(tenant.id),
        role: 'OWNER',
        status: 'ACTIVE',
      })
      .select('id')
      .single();
    if (membershipError || !membership)
      throw new Error(`MEMBERSHIP_CREATE_FAILED:${membershipError?.message}`);

    const { error: membershipBranchError } = await supabase
      .from('membership_branches')
      .insert({ membership_id: text(membership.id), branch_id: text(branch.id) });
    if (membershipBranchError)
      throw new Error(`MEMBERSHIP_BRANCH_CREATE_FAILED:${membershipBranchError.message}`);

    await copyPlanEntitlements(supabase, text(tenant.id), text(session.plan_id));
    await createTenantSubscription(supabase, session, text(tenant.id), provider.subscriptionId);
    await createCredentialsNotification(supabase, {
      tenantId: text(tenant.id),
      branchId: text(branch.id),
      membershipId: text(membership.id),
      sessionId,
      email,
      temporaryPassword,
      name,
    });

    await supabase
      .from('checkout_sessions')
      .update({
        tenant_id: text(tenant.id),
        branch_id: text(branch.id),
        admin_user_id: authUser.user.id,
        asaas_checkout_id: provider.checkoutId || text(session.asaas_checkout_id),
        asaas_subscription_id: provider.subscriptionId || null,
        status: 'PROVISIONED',
        provisioned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } catch (error) {
    await supabase
      .from('checkout_sessions')
      .update({
        status: 'FAILED',
        provisioning_error: error instanceof Error ? error.message : 'UNKNOWN_PROVISIONING_ERROR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    throw error;
  }
}

async function copyPlanEntitlements(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tenantId: string,
  planId: string,
) {
  const { data } = await supabase
    .from('plan_entitlements')
    .select('entitlement_code, enabled')
    .eq('plan_id', planId)
    .eq('enabled', true);

  const rows = ((data ?? []) as Row[]).map((row) => ({
    tenant_id: tenantId,
    entitlement_code: text(row.entitlement_code),
    enabled: true,
  }));
  if (!rows.length) return;
  await supabase
    .from('tenant_entitlements')
    .upsert(rows, { onConflict: 'tenant_id,entitlement_code' });
}

async function createTenantSubscription(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  session: Row,
  tenantId: string,
  subscriptionId: string,
) {
  const now = new Date();
  const end = new Date(now);
  if (text(session.billing_interval) === 'YEARLY') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);

  await supabase.from('tenant_subscriptions').insert({
    tenant_id: tenantId,
    plan_id: text(session.plan_id),
    provider: 'ASAAS',
    external_subscription_id: subscriptionId || null,
    status: 'ACTIVE',
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
  });
}

async function createCredentialsNotification(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    tenantId: string;
    branchId: string;
    membershipId: string;
    sessionId: string;
    email: string;
    temporaryPassword: string;
    name: string;
  },
) {
  const appUrl = parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const rendered = renderEmailTemplate({
    key: 'checkout.credentials.v1',
    variables: {
      email: input.email,
      temporaryPassword: input.temporaryPassword,
      loginUrl: `${appUrl}/login`,
      name: input.name,
    },
  });

  const idempotencyKey = `checkout-credentials-${input.sessionId}`;
  const { data: intent, error } = await supabase
    .from('notification_intents')
    .upsert(
      {
        tenant_id: input.tenantId,
        branch_id: input.branchId,
        recipient_type: 'MEMBERSHIP',
        recipient_id: input.membershipId,
        channel: 'EMAIL',
        template_key: 'checkout.credentials.v1',
        source_type: 'SYSTEM',
        source_id: input.sessionId,
        payload: {
          to: input.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          variables: {
            email: input.email,
            temporaryPassword: input.temporaryPassword,
            loginUrl: `${appUrl}/login`,
          },
        },
        status: 'READY',
        idempotency_key: idempotencyKey,
        correlation_id: input.sessionId,
      },
      { onConflict: 'tenant_id,idempotency_key' },
    )
    .select('id')
    .single();
  if (error || !intent) throw new Error(`CREDENTIAL_NOTIFICATION_CREATE_FAILED:${error?.message}`);

  await supabase.from('worker_jobs').upsert(
    {
      tenant_id: input.tenantId,
      branch_id: input.branchId,
      type: 'NOTIFICATION_DELIVERY',
      status: 'PENDING',
      source_type: 'NOTIFICATION_INTENT',
      source_id: text(intent.id),
      notification_intent_id: text(intent.id),
      payload: { channel: 'EMAIL', templateKey: 'checkout.credentials.v1' },
      idempotency_key: `notification-delivery-${text(intent.id)}`,
      correlation_id: input.sessionId,
      priority: 20,
    },
    { onConflict: 'tenant_id,idempotency_key' },
  );
}

async function findCheckoutSession(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: { checkoutId?: string; externalReference?: string },
) {
  if (input.externalReference) {
    const { data } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('id', input.externalReference)
      .maybeSingle();
    if (data) return data as Row;
  }
  if (input.checkoutId) {
    const { data } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('asaas_checkout_id', input.checkoutId)
      .maybeSingle();
    if (data) return data as Row;
  }
  return null;
}

async function syncSubscriptionStatus(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  subscriptionId: string,
  status: string,
) {
  const mapped = status === 'ACTIVE' ? 'ACTIVE' : status === 'INACTIVE' ? 'CANCELLED' : undefined;
  if (!mapped) return;
  await supabase
    .from('tenant_subscriptions')
    .update({ status: mapped, updated_at: new Date().toISOString() })
    .eq('provider', 'ASAAS')
    .eq('external_subscription_id', subscriptionId);
}

function normalizeCheckoutInput(input: CheckoutLeadInput) {
  const customerName = requiredText(input.customerName, 'customerName');
  const customerEmail = requiredText(input.customerEmail, 'customerEmail').toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(customerEmail)) throw new Error('INVALID_CUSTOMER_EMAIL');
  const customerPhone = onlyDigits(requiredText(input.customerPhone, 'customerPhone'));
  if (customerPhone.length < 10) throw new Error('INVALID_CUSTOMER_PHONE');
  const document = onlyDigits(input.document ?? '');
  return {
    planCode: requiredText(input.planCode, 'planCode'),
    customerName,
    customerEmail,
    customerPhone,
    document: document || undefined,
    barbershopName: requiredText(input.barbershopName, 'barbershopName'),
    branchName: text(input.branchName, 'Unidade Centro'),
    city: text(input.city) || undefined,
    state: text(input.state).slice(0, 2).toUpperCase() || undefined,
    employeesCount: typeof input.employeesCount === 'number' ? input.employeesCount : undefined,
    marketingSource: input.marketingSource ?? {},
  };
}

function requiredText(value: unknown, field: string) {
  const result = text(value).trim();
  if (!result) throw new Error(`MISSING_${field.toUpperCase()}`);
  return result;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}

function isRecord(value: unknown): value is Row {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function nextDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function generateTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `BarberOS-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 14)}!`;
}
