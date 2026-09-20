-- Seed real barbershop services requested for the operational catalog.
-- Idempotent per tenant through the existing unique (tenant_id, name) constraint.

with requested_services (category, name, description, duration_minutes, price_cents, estimated_cost_cents) as (
  values
    ('Design', 'Sobrancelha', 'Design e acabamento de sobrancelha.', 15, 1000, null),
    ('Quimica', 'Platinado', 'Servico de descoloracao/platinado.', 120, 10000, null),
    ('Coloracao', 'Pigmentacao', 'Pigmentacao capilar ou de barba.', 30, 2500, null),
    ('Coloracao', 'Luzes', 'Aplicacao de luzes.', 90, 6000, null),
    ('Estetica', 'Limpeza de pele', 'Limpeza de pele facial.', 45, 2500, null),
    ('Tratamento', 'Hidratacao', 'Hidratacao capilar.', 30, 2500, null),
    ('Cabelo', 'Freestyle (risquinho)', 'Risco/desenho freestyle no acabamento.', 15, 1000, null),
    ('Depilacao', 'Depilacao nasal', 'Depilacao nasal.', 15, 2500, null),
    ('Depilacao', 'Depilacao orelha', 'Depilacao de orelha.', 15, 2500, null),
    ('Cabelo', 'Corte de cabelo', 'Corte de cabelo completo.', 45, 4500, null),
    ('Barba', 'Barboterapia', 'Barboterapia com preparo e finalizacao.', 45, 4500, null),
    ('Barba', 'Barba', 'Modelagem e acabamento de barba.', 30, 3500, null),
    ('Quimica', 'Alisamento', 'Alisamento capilar.', 45, 3000, null),
    ('Cabelo', 'Acabamento/pezinho', 'Acabamento de contorno e pezinho.', 15, 1000, null)
), upserted_services as (
  insert into public.services (
    id,
    tenant_id,
    category,
    name,
    description,
    duration_minutes,
    price_cents,
    estimated_cost_cents,
    status,
    archived_at,
    updated_at
  )
  select
    gen_random_uuid(),
    tenants.id,
    requested_services.category,
    requested_services.name,
    requested_services.description,
    requested_services.duration_minutes,
    requested_services.price_cents,
    requested_services.estimated_cost_cents,
    'ACTIVE',
    null,
    now()
  from public.tenants
  cross join requested_services
  where tenants.status = 'ACTIVE'
  on conflict (tenant_id, name) do update set
    category = excluded.category,
    description = excluded.description,
    duration_minutes = excluded.duration_minutes,
    price_cents = excluded.price_cents,
    estimated_cost_cents = excluded.estimated_cost_cents,
    status = 'ACTIVE',
    archived_at = null,
    updated_at = now()
  returning id, tenant_id
)
insert into public.service_professionals (service_id, professional_id, tenant_id, price_cents, duration_minutes)
select
  upserted_services.id,
  professionals.id,
  upserted_services.tenant_id,
  null,
  null
from upserted_services
join public.professionals
  on professionals.tenant_id = upserted_services.tenant_id
 and professionals.status = 'ACTIVE'
on conflict (service_id, professional_id) do nothing;