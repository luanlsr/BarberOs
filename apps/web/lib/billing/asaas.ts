type AsaasCheckoutItem = {
  name: string;
  description: string;
  quantity: number;
  value: number;
};

type AsaasCustomerData = {
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
};

export type CreateAsaasCheckoutInput = {
  apiKey: string;
  environment: 'sandbox' | 'production';
  externalReference: string;
  items: AsaasCheckoutItem[];
  customerData: AsaasCustomerData;
  successUrl: string;
  cancelUrl: string;
  expiredUrl: string;
  subscription: {
    cycle: 'MONTHLY' | 'YEARLY';
    nextDueDate: string;
  };
};

export type AsaasCheckoutResult = {
  id: string;
  url: string;
  raw: unknown;
};

const asaasApiBase = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
} as const;

const asaasCheckoutBase = {
  sandbox: 'https://sandbox.asaas.com/checkoutSession/show',
  production: 'https://asaas.com/checkoutSession/show',
} as const;

export async function createAsaasCheckout(
  input: CreateAsaasCheckoutInput,
): Promise<AsaasCheckoutResult> {
  const response = await fetch(`${asaasApiBase[input.environment]}/checkouts`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: input.apiKey,
    },
    body: JSON.stringify({
      billingTypes: ['PIX', 'CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      minutesToExpire: 1440,
      externalReference: input.externalReference,
      callback: {
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiredUrl: input.expiredUrl,
      },
      items: input.items,
      customerData: input.customerData,
      subscription: input.subscription,
    }),
  });

  const raw = (await response.json().catch(() => ({}))) as { id?: string; errors?: unknown };
  if (!response.ok || !raw.id) {
    throw new Error(
      `ASAAS_CHECKOUT_CREATE_FAILED:${response.status}:${JSON.stringify(raw.errors ?? raw)}`,
    );
  }

  const url = `${asaasCheckoutBase[input.environment]}?id=${encodeURIComponent(raw.id)}`;
  return { id: raw.id, url, raw };
}

export function toAsaasMoney(cents: number) {
  return Number((cents / 100).toFixed(2));
}
