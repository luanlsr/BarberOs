import type { SupabaseClient } from '@supabase/supabase-js';
import {
  professionalSchema,
  type CreateProfessionalCommand,
  type Professional,
  type RequestContext,
  type UpdateProfessionalCommand,
} from '@barberos/contracts';

import type { ProfessionalListFilters, ProfessionalRepository } from '../domain';

type ProfessionalRow = {
  id: string;
  tenant_id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  role_label: string;
  avatar_url?: string | null;
  status: Professional['status'];
  archived_at?: string | null;
  professional_branches?: Array<{ branch_id: string }> | null;
};

const professionalSelect = `
  id,
  tenant_id,
  display_name,
  email,
  phone,
  role_label,
  avatar_url,
  status,
  archived_at,
  professional_branches(branch_id)
`;

export class SupabaseProfessionalRepository implements ProfessionalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(context: RequestContext, filters: ProfessionalListFilters = {}) {
    let query = this.client.from('professionals').select(professionalSelect).eq('tenant_id', context.tenantId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.neq('status', 'ARCHIVED');
    }

    if (filters.query) {
      query = query.ilike('display_name', `%${filters.query}%`);
    }

    const { data, error } = await query.order('display_name', { ascending: true });
    if (error) throw error;

    return ((data ?? []) as ProfessionalRow[])
      .map(toProfessional)
      .filter((professional) => !filters.branchId || professional.branchIds.includes(filters.branchId));
  }

  async findProfessionalById(context: RequestContext, professionalId: string) {
    return this.findById(context, professionalId);
  }

  async findById(context: RequestContext, professionalId: string) {
    const { data, error } = await this.client
      .from('professionals')
      .select(professionalSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', professionalId)
      .maybeSingle();

    if (error) throw error;
    return data ? toProfessional(data as ProfessionalRow) : null;
  }

  async create(context: RequestContext, command: CreateProfessionalCommand) {
    const { branchIds, ...payload } = command;
    const { data, error } = await this.client
      .from('professionals')
      .insert({
        tenant_id: context.tenantId,
        display_name: payload.displayName,
        email: payload.email,
        phone: payload.phone,
        role_label: payload.roleLabel ?? 'Profissional',
        avatar_url: payload.avatarUrl,
        status: 'ACTIVE',
      })
      .select(professionalSelect)
      .single();

    if (error) throw error;
    await this.replaceBranches(context, data.id, branchIds);
    return this.findById(context, data.id) as Promise<Professional>;
  }

  async update(context: RequestContext, command: UpdateProfessionalCommand) {
    const { id, branchIds, ...changes } = command;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (changes.displayName !== undefined) payload.display_name = changes.displayName;
    if (changes.email !== undefined) payload.email = changes.email;
    if (changes.phone !== undefined) payload.phone = changes.phone;
    if (changes.roleLabel !== undefined) payload.role_label = changes.roleLabel;
    if (changes.avatarUrl !== undefined) payload.avatar_url = changes.avatarUrl;
    if (changes.status !== undefined) payload.status = changes.status;

    const { error } = await this.client.from('professionals').update(payload).eq('tenant_id', context.tenantId).eq('id', id);
    if (error) throw error;

    if (branchIds) {
      await this.replaceBranches(context, id, branchIds);
    }

    return this.findById(context, id) as Promise<Professional>;
  }

  async archive(context: RequestContext, professionalId: string) {
    const { error } = await this.client
      .from('professionals')
      .update({ status: 'ARCHIVED', archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('tenant_id', context.tenantId)
      .eq('id', professionalId);

    if (error) throw error;
    return this.findById(context, professionalId) as Promise<Professional>;
  }

  private async replaceBranches(context: RequestContext, professionalId: string, branchIds: readonly string[]) {
    const { error: deleteError } = await this.client
      .from('professional_branches')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('professional_id', professionalId);
    if (deleteError) throw deleteError;

    const rows = branchIds.map((branchId) => ({
      professional_id: professionalId,
      tenant_id: context.tenantId,
      branch_id: branchId,
    }));
    const { error: insertError } = await this.client.from('professional_branches').insert(rows);
    if (insertError) throw insertError;
  }
}

function toProfessional(row: ProfessionalRow) {
  return professionalSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchIds: (row.professional_branches ?? []).map((branch) => branch.branch_id),
    displayName: row.display_name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    roleLabel: row.role_label,
    avatarUrl: row.avatar_url ?? undefined,
    status: row.status,
    archivedAt: row.archived_at ?? undefined,
  });
}