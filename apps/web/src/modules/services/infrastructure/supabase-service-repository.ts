import type { SupabaseClient } from '@supabase/supabase-js';
import {
  serviceSchema,
  type CreateServiceCommand,
  type RequestContext,
  type Service,
  type UpdateServiceCommand,
} from '@barberos/contracts';

import type {
  AssignServiceProfessionalCommand,
  ServiceListFilters,
  ServiceRepository,
} from '../domain';

type ServiceRow = {
  id: string;
  tenant_id: string;
  category: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price_cents: number;
  estimated_cost_cents?: number | null;
  image_url?: string | null;
  icon_key?: string | null;
  color_hex?: string | null;
  status: Service['status'];
  archived_at?: string | null;
  service_professionals?: Array<{ professional_id: string }> | null;
};

const serviceSelect = `
  id,
  tenant_id,
  category,
  name,
  description,
  duration_minutes,
  price_cents,
  estimated_cost_cents,
  image_url,
  icon_key,
  color_hex,
  status,
  archived_at,
  service_professionals(professional_id)
`;

export class SupabaseServiceRepository implements ServiceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(context: RequestContext, filters: ServiceListFilters = {}) {
    let query = this.client
      .from('services')
      .select(serviceSelect)
      .eq('tenant_id', context.tenantId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.neq('status', 'ARCHIVED');
    }
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.query) query = query.ilike('name', `%${filters.query}%`);

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;

    return ((data ?? []) as ServiceRow[])
      .map(toService)
      .filter(
        (service) =>
          !filters.professionalId ||
          service.enabledProfessionalIds.includes(filters.professionalId),
      );
  }

  async findServiceById(context: RequestContext, serviceId: string) {
    return this.findById(context, serviceId);
  }

  async findById(context: RequestContext, serviceId: string) {
    const { data, error } = await this.client
      .from('services')
      .select(serviceSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', serviceId)
      .maybeSingle();

    if (error) throw error;
    return data ? toService(data as ServiceRow) : null;
  }

  async create(context: RequestContext, command: CreateServiceCommand) {
    const { enabledProfessionalIds, ...payload } = command;
    const { data, error } = await this.client
      .from('services')
      .insert({
        tenant_id: context.tenantId,
        category: payload.category,
        name: payload.name,
        description: payload.description,
        duration_minutes: payload.durationMinutes,
        price_cents: payload.priceCents,
        estimated_cost_cents: payload.estimatedCostCents,
        image_url: payload.imageUrl,
        icon_key: payload.iconKey,
        color_hex: payload.colorHex,
        status: 'ACTIVE',
      })
      .select(serviceSelect)
      .single();

    if (error) throw error;
    await this.replaceEnabledProfessionals(context, data.id, enabledProfessionalIds ?? []);
    return this.findById(context, data.id) as Promise<Service>;
  }

  async update(context: RequestContext, command: UpdateServiceCommand) {
    const { id, enabledProfessionalIds, ...changes } = command;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (changes.category !== undefined) payload.category = changes.category;
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.description !== undefined) payload.description = changes.description;
    if (changes.durationMinutes !== undefined) payload.duration_minutes = changes.durationMinutes;
    if (changes.priceCents !== undefined) payload.price_cents = changes.priceCents;
    if (changes.estimatedCostCents !== undefined)
      payload.estimated_cost_cents = changes.estimatedCostCents;
    if (changes.imageUrl !== undefined) payload.image_url = changes.imageUrl;
    if (changes.iconKey !== undefined) payload.icon_key = changes.iconKey;
    if (changes.colorHex !== undefined) payload.color_hex = changes.colorHex;
    if (changes.status !== undefined) payload.status = changes.status;

    const { error } = await this.client
      .from('services')
      .update(payload)
      .eq('tenant_id', context.tenantId)
      .eq('id', id);
    if (error) throw error;

    if (enabledProfessionalIds) {
      await this.replaceEnabledProfessionals(context, id, enabledProfessionalIds);
    }

    return this.findById(context, id) as Promise<Service>;
  }

  async archive(context: RequestContext, serviceId: string) {
    const { error } = await this.client
      .from('services')
      .update({
        status: 'ARCHIVED',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', serviceId);

    if (error) throw error;
    return this.findById(context, serviceId) as Promise<Service>;
  }

  async assignProfessional(context: RequestContext, command: AssignServiceProfessionalCommand) {
    const { error } = await this.client.from('service_professionals').upsert({
      tenant_id: context.tenantId,
      service_id: command.serviceId,
      professional_id: command.professionalId,
      price_cents: command.priceCents,
      duration_minutes: command.durationMinutes,
    });
    if (error) throw error;
  }

  private async replaceEnabledProfessionals(
    context: RequestContext,
    serviceId: string,
    professionalIds: readonly string[],
  ) {
    const { error: deleteError } = await this.client
      .from('service_professionals')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('service_id', serviceId);
    if (deleteError) throw deleteError;

    if (!professionalIds.length) return;

    const rows = professionalIds.map((professionalId) => ({
      tenant_id: context.tenantId,
      service_id: serviceId,
      professional_id: professionalId,
    }));
    const { error: insertError } = await this.client.from('service_professionals').insert(rows);
    if (insertError) throw insertError;
  }
}

function toService(row: ServiceRow) {
  return serviceSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    name: row.name,
    description: row.description ?? undefined,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    estimatedCostCents: row.estimated_cost_cents ?? undefined,
    imageUrl: row.image_url ?? undefined,
    iconKey: row.icon_key ?? undefined,
    colorHex: row.color_hex ?? undefined,
    status: row.status,
    enabledProfessionalIds: (row.service_professionals ?? []).map(
      (professional) => professional.professional_id,
    ),
    archivedAt: row.archived_at ?? undefined,
  });
}
