import type { SupabaseClient } from '@supabase/supabase-js';
import {
  customerSchema,
  type CreateCustomerCommand,
  type Customer,
  type RequestContext,
  type UpdateCustomerCommand,
} from '@barberos/contracts';

import type { CustomerListFilters, CustomerRepository } from '../domain';

type CustomerRow = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  source?: string | null;
  preferred_professional_id?: string | null;
  consent_whatsapp: boolean;
  consent_marketing: boolean;
  status: Customer['status'];
  archived_at?: string | null;
};

const customerSelect = `
  id,
  tenant_id,
  branch_id,
  name,
  phone,
  email,
  birth_date,
  notes,
  source,
  preferred_professional_id,
  consent_whatsapp,
  consent_marketing,
  status,
  archived_at
`;

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async search(context: RequestContext, filters: CustomerListFilters = {}) {
    let query = this.client
      .from('customers')
      .select(customerSelect)
      .eq('tenant_id', context.tenantId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.neq('status', 'ARCHIVED');
    }
    if (filters.branchId) query = query.eq('branch_id', filters.branchId);
    if (filters.phone) query = query.ilike('phone', `%${filters.phone}%`);
    if (filters.query)
      query = query.or(`name.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`);

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as CustomerRow[]).map(toCustomer);
  }

  async findCustomerById(context: RequestContext, customerId: string) {
    return this.findById(context, customerId);
  }

  async findById(context: RequestContext, customerId: string) {
    const { data, error } = await this.client
      .from('customers')
      .select(customerSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw error;
    return data ? toCustomer(data as CustomerRow) : null;
  }

  async create(context: RequestContext, command: CreateCustomerCommand) {
    const { data, error } = await this.client
      .from('customers')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId,
        name: command.name,
        phone: command.phone,
        email: command.email,
        birth_date: command.birthDate,
        notes: command.notes,
        source: command.source,
        preferred_professional_id: command.preferredProfessionalId,
        consent_whatsapp: command.consents?.whatsapp ?? false,
        consent_marketing: command.consents?.marketing ?? false,
        status: 'NEW',
      })
      .select(customerSelect)
      .single();

    if (error) throw error;
    return toCustomer(data as CustomerRow);
  }

  async update(context: RequestContext, command: UpdateCustomerCommand) {
    const { id, consents, ...changes } = command;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (changes.branchId !== undefined) payload.branch_id = changes.branchId;
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.phone !== undefined) payload.phone = changes.phone;
    if (changes.email !== undefined) payload.email = changes.email;
    if (changes.birthDate !== undefined) payload.birth_date = changes.birthDate;
    if (changes.notes !== undefined) payload.notes = changes.notes;
    if (changes.source !== undefined) payload.source = changes.source;
    if (changes.preferredProfessionalId !== undefined)
      payload.preferred_professional_id = changes.preferredProfessionalId;
    if (changes.status !== undefined) payload.status = changes.status;
    if (consents?.whatsapp !== undefined) payload.consent_whatsapp = consents.whatsapp;
    if (consents?.marketing !== undefined) payload.consent_marketing = consents.marketing;

    const { data, error } = await this.client
      .from('customers')
      .update(payload)
      .eq('tenant_id', context.tenantId)
      .eq('id', id)
      .select(customerSelect)
      .single();

    if (error) throw error;
    return toCustomer(data as CustomerRow);
  }

  async archive(context: RequestContext, customerId: string) {
    const { data, error } = await this.client
      .from('customers')
      .update({
        status: 'ARCHIVED',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', customerId)
      .select(customerSelect)
      .single();

    if (error) throw error;
    return toCustomer(data as CustomerRow);
  }
}

function toCustomer(row: CustomerRow) {
  return customerSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    birthDate: row.birth_date ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source ?? undefined,
    preferredProfessionalId: row.preferred_professional_id ?? undefined,
    consents: { whatsapp: row.consent_whatsapp, marketing: row.consent_marketing },
    status: row.status,
    archivedAt: row.archived_at ?? undefined,
  });
}
