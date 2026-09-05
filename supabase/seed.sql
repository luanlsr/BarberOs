insert into public.tenants (id, name, status) values ('00000000-0000-0000-0000-000000000001', 'Barbearia Modelo', 'ACTIVE') on conflict (id) do update set name = excluded.name, status = excluded.status;
insert into public.branches (id, tenant_id, name, status) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Unidade Centro', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Unidade Norte', 'ACTIVE')
on conflict (id) do update set name = excluded.name, status = excluded.status;

insert into public.roles (code, description) values
  ('OWNER', 'Acesso total ao tenant'),
  ('MANAGER', 'Gestao operacional'),
  ('FINANCE', 'Operacao financeira'),
  ('RECEPTIONIST', 'Recepcao e agenda'),
  ('PROFESSIONAL', 'Atendimento'),
  ('PLATFORM_MASTER', 'Administracao da plataforma'),
  ('PLATFORM_SUPPORT', 'Suporte da plataforma')
on conflict (code) do update set description = excluded.description;

insert into public.permissions (code, description) values
  ('dashboard.read', 'Visualizar visao geral'),
  ('appointments.read', 'Visualizar agenda'),
  ('appointments.create', 'Criar agendamento'),
  ('appointments.update', 'Editar agendamento'),
  ('appointments.cancel', 'Cancelar agendamento'),
  ('professionals.read', 'Visualizar profissionais'),
  ('professionals.create', 'Criar profissionais'),
  ('professionals.update', 'Editar profissionais'),
  ('services.read', 'Visualizar servicos'),
  ('services.create', 'Criar servicos'),
  ('services.update', 'Editar servicos'),
  ('schedules.read', 'Visualizar horarios e disponibilidade'),
  ('schedules.manage', 'Gerenciar horarios e bloqueios'),
  ('customers.read', 'Visualizar clientes'),
  ('customers.create', 'Criar clientes'),
  ('customers.update', 'Editar clientes'),
  ('orders.create', 'Criar comanda'),
  ('orders.item.add', 'Adicionar item'),
  ('orders.item.remove', 'Remover item'),
  ('payments.receive', 'Receber pagamento'),
  ('payments.refund', 'Estornar pagamento'),
  ('cash.open', 'Abrir caixa'),
  ('cash.withdraw', 'Sangria'),
  ('cash.close', 'Fechar caixa'),
  ('finance.read', 'Visualizar financeiro'),
  ('finance.write', 'Editar financeiro'),
  ('commission.read', 'Visualizar comissoes'),
  ('commission.manage', 'Gerenciar comissoes'),
  ('inventory.read', 'Visualizar estoque'),
  ('inventory.write', 'Editar estoque'),
  ('settings.read', 'Visualizar configuracoes'),
  ('memberships.read', 'Visualizar membros'),
  ('memberships.manage', 'Gerenciar membros'),
  ('audit.read', 'Visualizar auditoria')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
select 'OWNER', code from public.permissions
on conflict (role_code, permission_code) do nothing;
insert into public.role_permissions (role_code, permission_code)
select 'PLATFORM_MASTER', code from public.permissions
on conflict (role_code, permission_code) do nothing;
insert into public.role_permissions (role_code, permission_code) values
  ('MANAGER', 'dashboard.read'),
  ('MANAGER', 'appointments.read'),
  ('MANAGER', 'appointments.create'),
  ('MANAGER', 'appointments.update'),
  ('MANAGER', 'appointments.cancel'),
  ('MANAGER', 'professionals.read'),
  ('MANAGER', 'professionals.create'),
  ('MANAGER', 'professionals.update'),
  ('MANAGER', 'services.read'),
  ('MANAGER', 'services.create'),
  ('MANAGER', 'services.update'),
  ('MANAGER', 'schedules.read'),
  ('MANAGER', 'schedules.manage'),
  ('MANAGER', 'customers.read'),
  ('MANAGER', 'customers.create'),
  ('MANAGER', 'customers.update'),
  ('MANAGER', 'orders.create'),
  ('MANAGER', 'orders.item.add'),
  ('MANAGER', 'orders.item.remove'),
  ('MANAGER', 'payments.receive'),
  ('MANAGER', 'inventory.read'),
  ('MANAGER', 'inventory.write'),
  ('MANAGER', 'settings.read'),
  ('RECEPTIONIST', 'dashboard.read'),
  ('RECEPTIONIST', 'appointments.read'),
  ('RECEPTIONIST', 'appointments.create'),
  ('RECEPTIONIST', 'appointments.update'),
  ('RECEPTIONIST', 'appointments.cancel'),
  ('RECEPTIONIST', 'professionals.read'),
  ('RECEPTIONIST', 'services.read'),
  ('RECEPTIONIST', 'schedules.read'),
  ('RECEPTIONIST', 'customers.read'),
  ('RECEPTIONIST', 'customers.create'),
  ('RECEPTIONIST', 'customers.update'),
  ('RECEPTIONIST', 'orders.create'),
  ('RECEPTIONIST', 'orders.item.add'),
  ('RECEPTIONIST', 'orders.item.remove'),
  ('RECEPTIONIST', 'payments.receive'),
  ('PROFESSIONAL', 'dashboard.read'),
  ('PROFESSIONAL', 'appointments.read'),
  ('PROFESSIONAL', 'professionals.read'),
  ('PROFESSIONAL', 'services.read'),
  ('PROFESSIONAL', 'schedules.read'),
  ('PROFESSIONAL', 'customers.read'),
  ('PROFESSIONAL', 'orders.create'),
  ('PROFESSIONAL', 'orders.item.add'),
  ('FINANCE', 'dashboard.read'),
  ('FINANCE', 'finance.read'),
  ('FINANCE', 'finance.write'),
  ('FINANCE', 'cash.open'),
  ('FINANCE', 'cash.withdraw'),
  ('FINANCE', 'cash.close'),
  ('FINANCE', 'commission.read'),
  ('FINANCE', 'commission.manage')
on conflict (role_code, permission_code) do nothing;

insert into public.entitlements (code, description) values
  ('core.operations', 'Operacao principal'),
  ('finance', 'Modulo financeiro'),
  ('inventory', 'Modulo de estoque'),
  ('ai', 'Barber AI')
on conflict (code) do update set description = excluded.description;
insert into public.tenant_entitlements (tenant_id, entitlement_code) values
  ('00000000-0000-0000-0000-000000000001', 'core.operations'),
  ('00000000-0000-0000-0000-000000000001', 'finance'),
  ('00000000-0000-0000-0000-000000000001', 'inventory')
on conflict (tenant_id, entitlement_code) do update set enabled = true;
insert into public.professionals (id, tenant_id, display_name, email, phone, role_label, status) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Carlos Andrade', 'carlos@barbeariamodelo.local', '+5511999990101', 'Barbeiro senior', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Lucas Pereira', 'lucas@barbeariamodelo.local', '+5511999990102', 'Barbeiro', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Rafael Costa', 'rafael@barbeariamodelo.local', '+5511999990103', 'Barbeiro', 'ACTIVE')
on conflict (id) do update set display_name = excluded.display_name, email = excluded.email, phone = excluded.phone, role_label = excluded.role_label, status = excluded.status;

insert into public.professional_branches (professional_id, tenant_id, branch_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012')
on conflict (professional_id, branch_id) do nothing;

insert into public.services (id, tenant_id, category, name, description, duration_minutes, price_cents, estimated_cost_cents, status) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Cabelo', 'Corte Masculino', 'Corte na tesoura ou maquina com finalizacao.', 40, 5000, 800, 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Barba', 'Barba', 'Modelagem de barba com toalha quente.', 30, 3500, 600, 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Combos', 'Corte + Barba', 'Combo operacional para agenda e comanda.', 70, 8000, 1200, 'ACTIVE')
on conflict (id) do update set category = excluded.category, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_cents = excluded.price_cents, estimated_cost_cents = excluded.estimated_cost_cents, status = excluded.status;

insert into public.service_professionals (service_id, professional_id, tenant_id, price_cents, duration_minutes) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', null, null),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', null, null),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', null, null),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', null, null),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', null, null)
on conflict (service_id, professional_id) do update set price_cents = excluded.price_cents, duration_minutes = excluded.duration_minutes;

insert into public.customers (id, tenant_id, branch_id, name, phone, email, source, preferred_professional_id, consent_whatsapp, consent_marketing, status) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Joao Silva', '+5511988880301', 'joao.silva@example.local', 'walk-in', '00000000-0000-0000-0000-000000000101', true, true, 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Pedro Souza', '+5511988880302', 'pedro.souza@example.local', 'whatsapp', '00000000-0000-0000-0000-000000000102', true, false, 'NEW'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Marcos Lima', '+5511988880303', 'marcos.lima@example.local', 'online', '00000000-0000-0000-0000-000000000103', true, true, 'ACTIVE')
on conflict (id) do update set branch_id = excluded.branch_id, name = excluded.name, phone = excluded.phone, email = excluded.email, source = excluded.source, preferred_professional_id = excluded.preferred_professional_id, consent_whatsapp = excluded.consent_whatsapp, consent_marketing = excluded.consent_marketing, status = excluded.status;

insert into public.professional_schedules (tenant_id, branch_id, professional_id, weekday, starts_at_local, ends_at_local, break_starts_at_local, break_ends_at_local, active) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', 1, '09:00', '18:00', '12:30', '13:30', true),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', 2, '09:00', '18:00', '12:30', '13:30', true),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', 3, '09:00', '18:00', '12:30', '13:30', true),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000102', 1, '10:00', '19:00', '14:00', '15:00', true),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000103', 1, '09:00', '17:00', '12:00', '13:00', true)
on conflict (tenant_id, branch_id, professional_id, weekday, starts_at_local, ends_at_local) do update set break_starts_at_local = excluded.break_starts_at_local, break_ends_at_local = excluded.break_ends_at_local, active = excluded.active;

insert into public.schedule_blocks (id, tenant_id, branch_id, professional_id, starts_at, ends_at, type, reason, active) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', '2026-09-07T15:00:00Z', '2026-09-07T15:30:00Z', 'MANUAL', 'Ajuste de agenda para treinamento', true)
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, type = excluded.type, reason = excluded.reason, active = excluded.active;

insert into public.appointments (id, tenant_id, branch_id, customer_id, professional_id, starts_at, ends_at, status, source, notes, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '2026-09-07T13:30:00Z', '2026-09-07T14:10:00Z', 'CONFIRMED', 'MANUAL', 'Fixture de agenda para validacao local', null, null),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', '2026-09-07T14:00:00Z', '2026-09-07T14:40:00Z', 'PENDING', 'WHATSAPP', 'Cliente pediu confirmacao pelo WhatsApp', null, null),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000103', '2026-09-07T13:00:00Z', '2026-09-07T13:30:00Z', 'COMPLETED', 'ONLINE', 'Fixture concluido para historico', null, null)
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status, source = excluded.source, notes = excluded.notes;

insert into public.appointment_services (appointment_id, service_id, tenant_id, sequence, service_name, duration_minutes, price_cents) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 1, 'Corte Masculino', 40, 5000),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 1, 'Corte Masculino', 40, 5000),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 1, 'Barba', 30, 3500)
on conflict (appointment_id, sequence) do update set service_id = excluded.service_id, service_name = excluded.service_name, duration_minutes = excluded.duration_minutes, price_cents = excluded.price_cents;

insert into public.appointment_status_history (id, tenant_id, appointment_id, previous_status, next_status, actor_id, reason) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000401', null, 'CONFIRMED', null, 'Criado pela seed de desenvolvimento'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000402', null, 'PENDING', null, 'Criado pela seed de desenvolvimento'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000403', null, 'CONFIRMED', null, 'Criado pela seed de desenvolvimento'),
  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000403', 'CONFIRMED', 'COMPLETED', null, 'Servico finalizado no fixture')
on conflict (id) do update set previous_status = excluded.previous_status, next_status = excluded.next_status, reason = excluded.reason;
