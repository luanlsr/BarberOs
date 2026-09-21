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
  ('appointments.check_in', 'Executar check-in de agendamento'),
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
  ('orders.read', 'Visualizar comanda'),
  ('orders.create', 'Criar comanda'),
  ('orders.update', 'Atualizar status da comanda'),
  ('orders.item.add', 'Adicionar item'),
  ('orders.item.update', 'Editar item'),
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
delete from public.role_permissions
where role_code = 'PROFESSIONAL'
  and permission_code in (
    'appointments.check_in',
    'orders.create',
    'orders.update',
    'orders.item.add',
    'orders.item.update',
    'orders.item.remove'
  );
insert into public.role_permissions (role_code, permission_code) values
  ('MANAGER', 'dashboard.read'),
  ('MANAGER', 'appointments.read'),
  ('MANAGER', 'appointments.create'),
  ('MANAGER', 'appointments.update'),
  ('MANAGER', 'appointments.cancel'),
  ('MANAGER', 'appointments.check_in'),
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
  ('MANAGER', 'orders.read'),
  ('MANAGER', 'orders.create'),
  ('MANAGER', 'orders.update'),
  ('MANAGER', 'orders.item.add'),
  ('MANAGER', 'orders.item.update'),
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
  ('RECEPTIONIST', 'appointments.check_in'),
  ('RECEPTIONIST', 'professionals.read'),
  ('RECEPTIONIST', 'services.read'),
  ('RECEPTIONIST', 'schedules.read'),
  ('RECEPTIONIST', 'customers.read'),
  ('RECEPTIONIST', 'customers.create'),
  ('RECEPTIONIST', 'customers.update'),
  ('RECEPTIONIST', 'orders.read'),
  ('RECEPTIONIST', 'orders.create'),
  ('RECEPTIONIST', 'orders.update'),
  ('RECEPTIONIST', 'orders.item.add'),
  ('RECEPTIONIST', 'orders.item.update'),
  ('RECEPTIONIST', 'orders.item.remove'),
  ('RECEPTIONIST', 'payments.receive'),
  ('PROFESSIONAL', 'dashboard.read'),
  ('PROFESSIONAL', 'appointments.read'),
  ('PROFESSIONAL', 'professionals.read'),
  ('PROFESSIONAL', 'services.read'),
  ('PROFESSIONAL', 'schedules.read'),
  ('PROFESSIONAL', 'customers.read'),
  ('PROFESSIONAL', 'orders.read'),
  ('FINANCE', 'dashboard.read'),
  ('FINANCE', 'finance.read'),
  ('FINANCE', 'finance.write'),
  ('FINANCE', 'payments.receive'),
  ('FINANCE', 'payments.refund'),
  ('FINANCE', 'cash.open'),
  ('FINANCE', 'cash.withdraw'),
  ('FINANCE', 'cash.close'),
  ('FINANCE', 'commission.read'),
  ('FINANCE', 'commission.manage')
on conflict (role_code, permission_code) do nothing;


-- Demo access profiles aligned with BarberOS product roles:
-- superAdmin -> PLATFORM_MASTER, admin -> OWNER, user -> RECEPTIONIST, barber -> PROFESSIONAL.
insert into public.role_permissions (role_code, permission_code) values
  ('RECEPTIONIST', 'cash.open'),
  ('RECEPTIONIST', 'cash.close'),
  ('RECEPTIONIST', 'finance.read'),
  ('RECEPTIONIST', 'inventory.read'),
  ('RECEPTIONIST', 'notifications.status.read'),
  ('PROFESSIONAL', 'commission.read')
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

insert into public.orders (id, tenant_id, branch_id, appointment_id, customer_id, professional_id, status, subtotal_amount_cents, discount_amount_cents, total_amount_cents, notes, idempotency_key, opened_at, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', null, '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', 'OPEN', 5000, 0, 5000, 'Comanda aberta para validacao local', 'seed-walk-in-order-701', '2026-09-07T14:30:00Z', null, null)
on conflict (id) do update set customer_id = excluded.customer_id, professional_id = excluded.professional_id, status = excluded.status, subtotal_amount_cents = excluded.subtotal_amount_cents, discount_amount_cents = excluded.discount_amount_cents, total_amount_cents = excluded.total_amount_cents, notes = excluded.notes, idempotency_key = excluded.idempotency_key, opened_at = excluded.opened_at;

insert into public.order_items (id, tenant_id, branch_id, order_id, source_type, source_id, name_snapshot, quantity, unit_price_amount_cents, discount_amount_cents, final_amount_cents, professional_id, notes, created_by) values
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000701', 'SERVICE', '00000000-0000-0000-0000-000000000201', 'Corte Masculino', 1, 5000, 0, 5000, '00000000-0000-0000-0000-000000000101', 'Item fixture da Comanda aberta', null)
on conflict (id) do update set source_type = excluded.source_type, source_id = excluded.source_id, name_snapshot = excluded.name_snapshot, quantity = excluded.quantity, unit_price_amount_cents = excluded.unit_price_amount_cents, discount_amount_cents = excluded.discount_amount_cents, final_amount_cents = excluded.final_amount_cents, professional_id = excluded.professional_id, notes = excluded.notes;

insert into public.order_history (id, tenant_id, branch_id, order_id, event_type, actor_id, reason, metadata) values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000701', 'ORDER_CREATED', null, 'Criado pela seed de desenvolvimento', '{"source":"seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000701', 'ITEM_ADDED', null, 'Item inicial da seed', '{"itemId":"00000000-0000-0000-0000-000000000801"}'::jsonb)
on conflict (id) do update set event_type = excluded.event_type, reason = excluded.reason, metadata = excluded.metadata;

insert into public.orders (id, tenant_id, branch_id, appointment_id, customer_id, professional_id, status, subtotal_amount_cents, discount_amount_cents, total_amount_cents, notes, idempotency_key, opened_at, closed_at, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', null, '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', 'PAID', 8500, 0, 8500, 'Comanda paga para validacao local de pagamentos e caixa', 'seed-paid-order-702', '2026-09-07T15:10:00Z', '2026-09-07T15:20:00Z', null, null)
on conflict (id) do update set customer_id = excluded.customer_id, professional_id = excluded.professional_id, status = excluded.status, subtotal_amount_cents = excluded.subtotal_amount_cents, discount_amount_cents = excluded.discount_amount_cents, total_amount_cents = excluded.total_amount_cents, notes = excluded.notes, idempotency_key = excluded.idempotency_key, opened_at = excluded.opened_at, closed_at = excluded.closed_at;

insert into public.order_items (id, tenant_id, branch_id, order_id, source_type, source_id, name_snapshot, quantity, unit_price_amount_cents, discount_amount_cents, final_amount_cents, professional_id, notes, created_by) values
  ('00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000702', 'SERVICE', '00000000-0000-0000-0000-000000000202', 'Corte + Barba', 1, 8500, 0, 8500, '00000000-0000-0000-0000-000000000102', 'Item fixture da Comanda paga', null)
on conflict (id) do update set source_type = excluded.source_type, source_id = excluded.source_id, name_snapshot = excluded.name_snapshot, quantity = excluded.quantity, unit_price_amount_cents = excluded.unit_price_amount_cents, discount_amount_cents = excluded.discount_amount_cents, final_amount_cents = excluded.final_amount_cents, professional_id = excluded.professional_id, notes = excluded.notes;

insert into public.cash_register_sessions (id, tenant_id, branch_id, status, opening_balance_amount_cents, expected_balance_amount_cents, idempotency_key, opened_by, opened_at) values
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'OPEN', 80000, 23500, 'seed-cash-session-1201', null, '2026-09-07T11:00:00Z')
on conflict (id) do update set status = excluded.status, opening_balance_amount_cents = excluded.opening_balance_amount_cents, expected_balance_amount_cents = excluded.expected_balance_amount_cents, idempotency_key = excluded.idempotency_key, opened_at = excluded.opened_at;

insert into public.payments (id, tenant_id, branch_id, order_id, method, status, amount_cents, cash_received_amount_cents, change_due_amount_cents, external_reference, idempotency_key, received_by, received_at) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000702', 'CASH', 'PAID', 8500, 10000, 1500, 'seed-cash-payment', 'seed-payment-1001', null, '2026-09-07T15:20:00Z')
on conflict (id) do update set method = excluded.method, status = excluded.status, amount_cents = excluded.amount_cents, cash_received_amount_cents = excluded.cash_received_amount_cents, change_due_amount_cents = excluded.change_due_amount_cents, external_reference = excluded.external_reference, idempotency_key = excluded.idempotency_key, received_at = excluded.received_at;

insert into public.payment_allocations (id, tenant_id, branch_id, payment_id, order_id, amount_cents) values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000702', 8500)
on conflict (id) do update set payment_id = excluded.payment_id, order_id = excluded.order_id, amount_cents = excluded.amount_cents;

insert into public.cash_movements (id, tenant_id, branch_id, session_id, type, amount_cents, signed_amount_cents, order_id, payment_id, idempotency_key, reason, created_by, created_at) values
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001201', 'OPENING_BALANCE', 80000, 80000, null, null, 'seed-cash-opening-1301', 'Saldo inicial da seed', null, '2026-09-07T11:00:00Z'),
  ('00000000-0000-0000-0000-000000001302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001201', 'SALE', 8500, 8500, '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000001001', 'seed-cash-sale-1302', 'Pagamento em dinheiro da Comanda paga fixture', null, '2026-09-07T15:20:00Z'),
  ('00000000-0000-0000-0000-000000001303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001201', 'EXPENSE', 65000, -65000, null, null, 'seed-cash-expense-1303', 'Despesa paga em dinheiro: Honorarios contabeis de agosto', null, '2026-09-07T16:20:00Z')
on conflict (id) do update set type = excluded.type, amount_cents = excluded.amount_cents, signed_amount_cents = excluded.signed_amount_cents, order_id = excluded.order_id, payment_id = excluded.payment_id, idempotency_key = excluded.idempotency_key, reason = excluded.reason;

insert into public.order_history (id, tenant_id, branch_id, order_id, event_type, actor_id, reason, metadata) values
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000702', 'ORDER_CREATED', null, 'Criado pela seed de desenvolvimento', '{"source":"seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000904', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000702', 'ORDER_PAID', null, 'Pagamento fixture da seed', '{"paymentId":"00000000-0000-0000-0000-000000001001"}'::jsonb)
on conflict (id) do update set event_type = excluded.event_type, reason = excluded.reason, metadata = excluded.metadata;
insert into public.orders (id, tenant_id, branch_id, appointment_id, customer_id, professional_id, status, subtotal_amount_cents, discount_amount_cents, total_amount_cents, notes, idempotency_key, opened_at, closed_at, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', null, '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', 'PAID', 7000, 0, 7000, 'Comanda paga para validacao local de financeiro e repasse', 'seed-paid-order-703', '2026-09-06T16:00:00Z', '2026-09-06T16:12:00Z', null, null)
on conflict (id) do nothing;

insert into public.order_items (id, tenant_id, branch_id, order_id, source_type, source_id, name_snapshot, quantity, unit_price_amount_cents, discount_amount_cents, final_amount_cents, professional_id, notes, created_by) values
  ('00000000-0000-0000-0000-000000000803', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000703', 'SERVICE', '00000000-0000-0000-0000-000000000201', 'Corte Masculino + finalizacao', 1, 7000, 0, 7000, '00000000-0000-0000-0000-000000000101', 'Item fixture para repasse pago', null)
on conflict (id) do nothing;

insert into public.payments (id, tenant_id, branch_id, order_id, method, status, amount_cents, external_reference, idempotency_key, received_by, received_at) values
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000703', 'PIX', 'PAID', 7000, 'seed-pix-payment-finance', 'seed-payment-1002', null, '2026-09-06T16:12:00Z')
on conflict (id) do nothing;

insert into public.payment_allocations (id, tenant_id, branch_id, payment_id, order_id, amount_cents) values
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000703', 7000)
on conflict (id) do nothing;

insert into public.expense_categories (id, tenant_id, branch_id, name, description, status, created_by) values
  ('00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Aluguel', 'Custos fixos da unidade', 'ACTIVE', null),
  ('00000000-0000-0000-0000-000000001402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Utilidades', 'Energia, agua e servicos essenciais', 'ACTIVE', null)
on conflict (id) do nothing;

insert into public.recurring_expense_templates (id, tenant_id, branch_id, category_id, description, vendor_name, amount_cents, frequency, starts_on, next_competence_date, active, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000001701', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001401', 'Aluguel mensal da Unidade Centro', 'Imobiliaria Centro', 120000, 'MONTHLY', '2026-09-01', '2026-10-01', true, null, null)
on conflict (id) do nothing;

insert into public.financial_entries (id, tenant_id, branch_id, direction, type, status, amount_cents, signed_amount_cents, competence_date, cash_date, source_type, source_id, category_id, description, idempotency_key, created_by) values
  ('00000000-0000-0000-0000-000000001501', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'IN', 'SERVICE_REVENUE', 'POSTED', 8500, 8500, '2026-09-07', '2026-09-07', 'PAYMENT', '00000000-0000-0000-0000-000000001001', null, 'Receita da Comanda paga seed-finance-entry-1501', 'seed-finance-payment-1001', null),
  ('00000000-0000-0000-0000-000000001502', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'OUT', 'EXPENSE', 'POSTED', 4200, -4200, '2026-09-05', '2026-09-05', 'EXPENSE', '00000000-0000-0000-0000-000000001601', '00000000-0000-0000-0000-000000001402', 'Conta de energia paga da seed', 'seed-finance-expense-1601', null),
  ('00000000-0000-0000-0000-000000001505', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'OUT', 'EXPENSE', 'POSTED', 65000, -65000, '2026-08-31', '2026-09-07', 'EXPENSE', '00000000-0000-0000-0000-000000001603', '00000000-0000-0000-0000-000000001402', 'Honorarios contabeis pagos em dinheiro', 'seed-finance-expense-cash-1603', null),
  ('00000000-0000-0000-0000-000000001503', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'IN', 'SERVICE_REVENUE', 'POSTED', 7000, 7000, '2026-09-06', '2026-09-06', 'PAYMENT', '00000000-0000-0000-0000-000000001002', null, 'Receita da Comanda paga para repasse seed', 'seed-finance-payment-1002', null),
  ('00000000-0000-0000-0000-000000001504', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'OUT', 'PAYOUT', 'POSTED', 3500, -3500, '2026-09-06', '2026-09-07', 'PAYOUT', '00000000-0000-0000-0000-000000002001', null, 'Repasse pago ao profissional Carlos', 'seed-finance-payout-2001', null)
on conflict (id) do nothing;
insert into public.expenses (id, tenant_id, branch_id, category_id, recurring_template_id, description, vendor_name, status, amount_cents, competence_date, due_date, cash_date, payment_method, recurrence_key, document_metadata, financial_entry_id, idempotency_key, payment_idempotency_key, created_by, updated_by, paid_by, paid_at) values
  ('00000000-0000-0000-0000-000000001601', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001402', null, 'Energia da Unidade Centro', 'Energia SP', 'PAID', 4200, '2026-09-05', '2026-09-10', '2026-09-05', 'PIX', null, '{}'::jsonb, '00000000-0000-0000-0000-000000001502', 'seed-expense-1601', 'seed-expense-pay-1601', null, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-09-05T13:00:00Z'),
  ('00000000-0000-0000-0000-000000001603', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001402', null, 'Honorarios contabeis de agosto', 'Contabilidade Prime', 'PAID', 65000, '2026-08-31', '2026-09-07', '2026-09-07', 'CASH', null, '{}'::jsonb, '00000000-0000-0000-0000-000000001505', 'seed-expense-1603', 'seed-expense-pay-cash-1603', null, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-09-07T16:20:00Z'),
  ('00000000-0000-0000-0000-000000001602', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-000000001701', 'Aluguel de outubro da Unidade Centro', 'Imobiliaria Centro', 'OPEN', 120000, '2026-10-01', '2026-10-05', null, null, 'rent-monthly-centro', '{}'::jsonb, null, 'seed-expense-1602', null, null, null, null, null)
on conflict (id) do nothing;

insert into public.commission_rules (id, tenant_id, branch_id, scope, type, status, professional_id, source_type, source_id, percentage_bps, fixed_amount_cents, effective_from, effective_until, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000001801', '00000000-0000-0000-0000-000000000001', null, 'TENANT_DEFAULT', 'PERCENTAGE', 'ACTIVE', null, null, null, 5000, null, '2026-09-01', null, null, null),
  ('00000000-0000-0000-0000-000000001802', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'SERVICE', 'PERCENTAGE', 'ACTIVE', '00000000-0000-0000-0000-000000000102', 'SERVICE', '00000000-0000-0000-0000-000000000202', 5000, null, '2026-09-01', null, null, null)
on conflict (id) do nothing;

insert into public.payouts (id, tenant_id, branch_id, professional_id, status, period_start, period_end, total_amount_cents, payment_method, financial_entry_id, cash_movement_id, idempotency_key, payment_idempotency_key, correction_idempotency_key, closed_by, closed_at, approved_by, approved_at, paid_by, paid_at, correction_reason) values
  ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', 'PAID', '2026-09-01', '2026-09-07', 3500, 'PIX', '00000000-0000-0000-0000-000000001504', null, 'seed-payout-close-2001', 'seed-payout-pay-2001', null, '00000000-0000-0000-0000-000000000001', '2026-09-07T17:00:00Z', null, null, '00000000-0000-0000-0000-000000000001', '2026-09-07T17:10:00Z', null)
on conflict (id) do nothing;

insert into public.commission_accruals (id, tenant_id, branch_id, professional_id, order_id, order_item_id, payment_id, rule_id, rule_type_snapshot, rule_scope_snapshot, rule_percentage_bps_snapshot, rule_fixed_amount_cents_snapshot, base_amount_cents, commission_amount_cents, status, accrued_at, reversed_accrual_id, payout_id) values
  ('00000000-0000-0000-0000-000000001901', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000001802', 'PERCENTAGE', 'SERVICE', 5000, null, 8500, 4250, 'OPEN', '2026-09-07T15:20:00Z', null, null),
  ('00000000-0000-0000-0000-000000001902', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000803', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000001801', 'PERCENTAGE', 'TENANT_DEFAULT', 5000, null, 7000, 3500, 'SETTLED', '2026-09-06T16:12:00Z', null, '00000000-0000-0000-0000-000000002001')
on conflict (id) do nothing;

insert into public.payout_allocations (id, tenant_id, branch_id, payout_id, accrual_id, amount_cents) values
  ('00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001902', 3500)
on conflict (id) do nothing;

insert into public.order_history (id, tenant_id, branch_id, order_id, event_type, actor_id, reason, metadata) values
  ('00000000-0000-0000-0000-000000000905', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000703', 'ORDER_CREATED', null, 'Criado pela seed financeira', '{"source":"finance-seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000906', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000703', 'ORDER_PAID', null, 'Pagamento fixture para financeiro e repasse', '{"paymentId":"00000000-0000-0000-0000-000000001002"}'::jsonb)
on conflict (id) do nothing;
insert into public.product_categories (id, tenant_id, name, description, status, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000001', 'Finalizadores', 'Produtos de acabamento vendidos na Comanda.', 'ACTIVE', null, null),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000001', 'Bebidas', 'Produtos de conveniencia para recepcao e espera.', 'ACTIVE', null, null)
on conflict (id) do update set name = excluded.name, description = excluded.description, status = excluded.status;

insert into public.product_category_branches (tenant_id, category_id, branch_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000011')
on conflict (tenant_id, category_id, branch_id) do nothing;

insert into public.products (id, tenant_id, category_id, sku, barcode, name, description, status, sale_price_amount_cents, cost_amount_cents, stock_tracking_policy, allow_negative_stock, minimum_stock_quantity, supplier_metadata, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003001', 'POM-MATTE-80G', '7890000003101', 'Pomada Matte 80g', 'Produto ativo e rastreado para venda na Comanda.', 'ACTIVE', 4500, 1800, 'TRACKED', false, 5, '{"supplierName":"Barber Supply","leadTimeDays":5}'::jsonb, null, null),
  ('00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003001', 'SHM-BARBA-120ML', '7890000003102', 'Shampoo para Barba 120ml', 'Produto ativo abaixo do estoque minimo.', 'ACTIVE', 3900, 1600, 'TRACKED', false, 5, '{"supplierName":"Barber Supply","leadTimeDays":7}'::jsonb, null, null),
  ('00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003002', 'AGUA-500ML', '7890000003103', 'Agua mineral 500ml', 'Produto inativo mantido para historico e filtros.', 'INACTIVE', 600, 250, 'NOT_TRACKED', false, 0, '{"supplierName":"Distribuidora Centro"}'::jsonb, null, null)
on conflict (id) do update set category_id = excluded.category_id, sku = excluded.sku, barcode = excluded.barcode, name = excluded.name, description = excluded.description, status = excluded.status, sale_price_amount_cents = excluded.sale_price_amount_cents, cost_amount_cents = excluded.cost_amount_cents, stock_tracking_policy = excluded.stock_tracking_policy, allow_negative_stock = excluded.allow_negative_stock, minimum_stock_quantity = excluded.minimum_stock_quantity, supplier_metadata = excluded.supplier_metadata;

insert into public.product_branches (tenant_id, product_id, branch_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000000011')
on conflict (tenant_id, product_id, branch_id) do nothing;

insert into public.inventory_locations (id, tenant_id, branch_id, name, description, active, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000003201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Estoque Centro', 'Armario principal da unidade Centro.', true, null, null),
  ('00000000-0000-0000-0000-000000003202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Vitrine Centro', 'Produtos expostos para venda no atendimento.', true, null, null)
on conflict (id) do update set name = excluded.name, description = excluded.description, active = excluded.active;

insert into public.orders (id, tenant_id, branch_id, appointment_id, customer_id, professional_id, status, subtotal_amount_cents, discount_amount_cents, total_amount_cents, notes, idempotency_key, opened_at, closed_at, created_by, updated_by) values
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', null, '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', 'PAID', 4500, 0, 4500, 'seed-inventory-product-sale-order-704', 'seed-inventory-product-sale-order-704', '2026-09-07T17:30:00Z', '2026-09-07T17:36:00Z', null, null)
on conflict (id) do update set customer_id = excluded.customer_id, professional_id = excluded.professional_id, status = excluded.status, subtotal_amount_cents = excluded.subtotal_amount_cents, discount_amount_cents = excluded.discount_amount_cents, total_amount_cents = excluded.total_amount_cents, notes = excluded.notes, idempotency_key = excluded.idempotency_key, opened_at = excluded.opened_at, closed_at = excluded.closed_at;

insert into public.order_items (id, tenant_id, branch_id, order_id, source_type, source_id, name_snapshot, quantity, unit_price_amount_cents, discount_amount_cents, final_amount_cents, professional_id, notes, created_by) values
  ('00000000-0000-0000-0000-000000000804', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000704', 'PRODUCT', '00000000-0000-0000-0000-000000003101', 'Pomada Matte 80g', 1, 4500, 0, 4500, '00000000-0000-0000-0000-000000000102', 'Item de produto fixture para baixa de estoque', null)
on conflict (id) do update set source_type = excluded.source_type, source_id = excluded.source_id, name_snapshot = excluded.name_snapshot, quantity = excluded.quantity, unit_price_amount_cents = excluded.unit_price_amount_cents, discount_amount_cents = excluded.discount_amount_cents, final_amount_cents = excluded.final_amount_cents, professional_id = excluded.professional_id, notes = excluded.notes;

insert into public.payments (id, tenant_id, branch_id, order_id, method, status, amount_cents, external_reference, idempotency_key, received_by, received_at) values
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000704', 'PIX', 'PAID', 4500, 'seed-inventory-product-payment', 'seed-payment-1004', null, '2026-09-07T17:36:00Z')
on conflict (id) do update set method = excluded.method, status = excluded.status, amount_cents = excluded.amount_cents, external_reference = excluded.external_reference, idempotency_key = excluded.idempotency_key, received_at = excluded.received_at;

insert into public.payment_allocations (id, tenant_id, branch_id, payment_id, order_id, amount_cents) values
  ('00000000-0000-0000-0000-000000001104', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000704', 4500)
on conflict (id) do update set payment_id = excluded.payment_id, order_id = excluded.order_id, amount_cents = excluded.amount_cents;

insert into public.financial_entries (id, tenant_id, branch_id, direction, type, status, amount_cents, signed_amount_cents, competence_date, cash_date, source_type, source_id, category_id, description, idempotency_key, created_by) values
  ('00000000-0000-0000-0000-000000001506', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'IN', 'PRODUCT_REVENUE', 'POSTED', 4500, 4500, '2026-09-07', '2026-09-07', 'PAYMENT', '00000000-0000-0000-0000-000000001004', null, 'Receita de produto da Comanda seed-inventory-product-sale-order-704', 'seed-finance-product-payment-1004', null)
on conflict (id) do update set direction = excluded.direction, type = excluded.type, status = excluded.status, amount_cents = excluded.amount_cents, signed_amount_cents = excluded.signed_amount_cents, competence_date = excluded.competence_date, cash_date = excluded.cash_date, source_type = excluded.source_type, source_id = excluded.source_id, description = excluded.description, idempotency_key = excluded.idempotency_key;

insert into public.stock_movements (id, tenant_id, branch_id, location_id, product_id, type, quantity, balance_after_quantity, source_type, source_id, order_id, order_item_id, payment_id, idempotency_key, reason, created_by, created_at) values
  ('00000000-0000-0000-0000-000000003301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000003201', '00000000-0000-0000-0000-000000003101', 'ENTRY', 24, 24, 'MANUAL', 'seed-inventory-entry-3301', null, null, null, 'seed-inventory-entry-3301', 'Entrada inicial da Pomada Matte 80g', null, '2026-09-07T09:00:00Z'),
  ('00000000-0000-0000-0000-000000003302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000003201', '00000000-0000-0000-0000-000000003102', 'ENTRY', 2, 2, 'MANUAL', 'seed-inventory-entry-3302', null, null, null, 'seed-inventory-entry-3302', 'Entrada inicial abaixo do minimo para alerta', null, '2026-09-07T09:05:00Z'),
  ('00000000-0000-0000-0000-000000003303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000003202', '00000000-0000-0000-0000-000000003101', 'SALE', -1, 23, 'PAYMENT', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000804', '00000000-0000-0000-0000-000000001004', 'seed-inventory-sale-3303', 'Venda de produto na Comanda.', null, '2026-09-07T17:36:00Z')
on conflict (id) do update set location_id = excluded.location_id, product_id = excluded.product_id, type = excluded.type, quantity = excluded.quantity, balance_after_quantity = excluded.balance_after_quantity, source_type = excluded.source_type, source_id = excluded.source_id, order_id = excluded.order_id, order_item_id = excluded.order_item_id, payment_id = excluded.payment_id, idempotency_key = excluded.idempotency_key, reason = excluded.reason, created_at = excluded.created_at;

insert into public.low_stock_alerts (id, tenant_id, branch_id, product_id, state, current_quantity, minimum_stock_quantity, triggered_at, resolved_at) values
  ('00000000-0000-0000-0000-000000003401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000003102', 'ACTIVE', 2, 5, '2026-09-07T09:06:00Z', null)
on conflict (id) do update set state = excluded.state, current_quantity = excluded.current_quantity, minimum_stock_quantity = excluded.minimum_stock_quantity, triggered_at = excluded.triggered_at, resolved_at = excluded.resolved_at;

insert into public.order_history (id, tenant_id, branch_id, order_id, event_type, actor_id, reason, metadata) values
  ('00000000-0000-0000-0000-000000000907', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000704', 'ORDER_CREATED', null, 'Criado pela seed de inventario', '{"source":"inventory-seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000908', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000704', 'ORDER_PAID', null, 'Pagamento com produto fixture da seed de inventario', '{"paymentId":"00000000-0000-0000-0000-000000001004","stockMovementId":"00000000-0000-0000-0000-000000003303"}'::jsonb)
on conflict (id) do update set event_type = excluded.event_type, reason = excluded.reason, metadata = excluded.metadata;

insert into public.permissions (code, description) values
  ('worker.failures.read', 'Visualizar falhas operacionais de jobs e outbox'),
  ('notifications.status.read', 'Visualizar status de notificacoes operacionais')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('OWNER', 'worker.failures.read'),
  ('OWNER', 'notifications.status.read'),
  ('MANAGER', 'worker.failures.read'),
  ('MANAGER', 'notifications.status.read'),
  ('RECEPTIONIST', 'notifications.status.read'),
  ('PLATFORM_MASTER', 'worker.failures.read'),
  ('PLATFORM_MASTER', 'notifications.status.read'),
  ('PLATFORM_SUPPORT', 'worker.failures.read'),
  ('PLATFORM_SUPPORT', 'notifications.status.read')
on conflict (role_code, permission_code) do nothing;

insert into public.entitlements (code, description) values
  ('worker.operations', 'Operacao de worker, outbox e falhas assincronas'),
  ('notifications', 'Status de notificacoes operacionais')
on conflict (code) do update set description = excluded.description;

insert into public.tenant_entitlements (tenant_id, entitlement_code) values
  ('00000000-0000-0000-0000-000000000001', 'worker.operations'),
  ('00000000-0000-0000-0000-000000000001', 'notifications')
on conflict (tenant_id, entitlement_code) do update set enabled = true;

insert into public.notification_intents (id, tenant_id, branch_id, recipient_type, recipient_id, channel, template_key, source_type, source_id, payload, status, idempotency_key, correlation_id, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'CUSTOMER', '00000000-0000-0000-0000-000000000301', 'LOCAL', 'appointment.reminder.v1', 'APPOINTMENT', '00000000-0000-0000-0000-000000000401', '{"appointmentId":"00000000-0000-0000-0000-000000000401"}'::jsonb, 'PENDING', 'seed-notification-pending-4001', 'seed-worker-correlation-4001', '2026-09-07T12:00:00Z', '2026-09-07T12:00:00Z'),
  ('00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'CUSTOMER', '00000000-0000-0000-0000-000000000302', 'LOCAL', 'post_service.follow_up.v1', 'ORDER', '00000000-0000-0000-0000-000000000702', '{"orderId":"00000000-0000-0000-0000-000000000702"}'::jsonb, 'SENT', 'seed-notification-sent-4002', 'seed-worker-correlation-4002', '2026-09-07T16:00:00Z', '2026-09-07T16:02:00Z'),
  ('00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'CUSTOMER', '00000000-0000-0000-0000-000000000303', 'LOCAL', 'appointment.reminder.v1', 'APPOINTMENT', '00000000-0000-0000-0000-000000000403', '{"appointmentId":"00000000-0000-0000-0000-000000000403"}'::jsonb, 'FAILED', 'seed-notification-failed-4003', 'seed-worker-correlation-4003', '2026-09-07T16:30:00Z', '2026-09-07T16:35:00Z')
on conflict (id) do update set status = excluded.status, payload = excluded.payload, updated_at = excluded.updated_at;

insert into public.outbox_events (id, tenant_id, branch_id, event_type, source_type, source_id, payload, idempotency_key, status, correlation_id, schema_version, attempt_count, available_at, last_error_code, last_error_message, last_error_retryable, dispatched_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000004101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'ORDER_PAID', 'ORDER', '00000000-0000-0000-0000-000000000702', '{"orderId":"00000000-0000-0000-0000-000000000702"}'::jsonb, 'seed-outbox-pending-4101', 'PENDING', 'seed-worker-correlation-4101', 1, 0, '2026-09-07T15:20:00Z', null, null, null, null, '2026-09-07T15:20:00Z', '2026-09-07T15:20:00Z'),
  ('00000000-0000-0000-0000-000000004102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'PAYMENT_COMPLETED', 'PAYMENT', '00000000-0000-0000-0000-000000001001', '{"paymentId":"00000000-0000-0000-0000-000000001001"}'::jsonb, 'seed-outbox-dispatched-4102', 'DISPATCHED', 'seed-worker-correlation-4102', 1, 1, '2026-09-07T15:22:00Z', null, null, null, '2026-09-07T15:23:00Z', '2026-09-07T15:22:00Z', '2026-09-07T15:23:00Z'),
  ('00000000-0000-0000-0000-000000004103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'NOTIFICATION_DELIVERY_REQUESTED', 'NOTIFICATION_INTENT', '00000000-0000-0000-0000-000000004003', '{"notificationIntentId":"00000000-0000-0000-0000-000000004003"}'::jsonb, 'seed-outbox-dead-4103', 'DEAD_LETTERED', 'seed-worker-correlation-4103', 1, 5, '2026-09-07T16:35:00Z', 'WORKER_RETRY_EXHAUSTED', 'Retry limit reached for local notification delivery.', false, null, '2026-09-07T16:35:00Z', '2026-09-07T17:10:00Z')
on conflict (id) do update set status = excluded.status, attempt_count = excluded.attempt_count, last_error_code = excluded.last_error_code, last_error_message = excluded.last_error_message, updated_at = excluded.updated_at;

insert into public.worker_jobs (id, tenant_id, branch_id, type, status, schema_version, source_type, source_id, outbox_event_id, notification_intent_id, payload, idempotency_key, correlation_id, priority, attempt_count, max_attempts, run_at, last_error_code, last_error_message, last_error_retryable, completed_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000004201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'APPOINTMENT_REMINDER', 'PENDING', 1, 'APPOINTMENT', '00000000-0000-0000-0000-000000000401', null, '00000000-0000-0000-0000-000000004001', '{"appointmentId":"00000000-0000-0000-0000-000000000401"}'::jsonb, 'seed-worker-job-pending-4101', 'seed-worker-correlation-4001', 50, 0, 5, '2026-09-07T12:15:00Z', null, null, null, null, '2026-09-07T12:00:00Z', '2026-09-07T12:00:00Z'),
  ('00000000-0000-0000-0000-000000004202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'POST_SERVICE_FOLLOW_UP', 'SUCCEEDED', 1, 'ORDER', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000004102', '00000000-0000-0000-0000-000000004002', '{"orderId":"00000000-0000-0000-0000-000000000702"}'::jsonb, 'seed-worker-job-succeeded-4102', 'seed-worker-correlation-4002', 40, 1, 5, '2026-09-07T16:01:00Z', null, null, null, '2026-09-07T16:02:00Z', '2026-09-07T16:00:00Z', '2026-09-07T16:02:00Z'),
  ('00000000-0000-0000-0000-000000004203', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'NOTIFICATION_DELIVERY', 'RETRY_SCHEDULED', 1, 'NOTIFICATION_INTENT', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000004103', '00000000-0000-0000-0000-000000004003', '{"notificationIntentId":"00000000-0000-0000-0000-000000004003"}'::jsonb, 'seed-worker-job-retrying-4103', 'seed-worker-correlation-4003', 90, 2, 5, '2026-09-07T17:30:00Z', 'WORKER_PROVIDER_UNAVAILABLE', 'Local notification provider unavailable.', true, null, '2026-09-07T16:30:00Z', '2026-09-07T16:35:00Z'),
  ('00000000-0000-0000-0000-000000004204', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'FINANCE_RECALCULATION', 'FAILED', 1, 'PAYMENT', '00000000-0000-0000-0000-000000001004', null, null, '{"paymentId":"00000000-0000-0000-0000-000000001004"}'::jsonb, 'seed-worker-job-failed-4104', 'seed-worker-correlation-4104', 60, 3, 5, '2026-09-07T18:00:00Z', 'WORKER_HANDLER_FAILED', 'Finance recalculation failed with sanitized details.', true, null, '2026-09-07T17:45:00Z', '2026-09-07T17:50:00Z'),
  ('00000000-0000-0000-0000-000000004205', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'STOCK_ALERT', 'DEAD_LETTERED', 1, 'PRODUCT', '00000000-0000-0000-0000-000000003102', null, null, '{"productId":"00000000-0000-0000-0000-000000003102"}'::jsonb, 'seed-worker-job-dead-4105', 'seed-worker-correlation-4105', 80, 5, 5, '2026-09-07T18:30:00Z', 'WORKER_RETRY_EXHAUSTED', 'Retry limit reached for stock alert job.', false, null, '2026-09-07T18:00:00Z', '2026-09-07T18:30:00Z')
on conflict (id) do update set status = excluded.status, attempt_count = excluded.attempt_count, last_error_code = excluded.last_error_code, last_error_message = excluded.last_error_message, updated_at = excluded.updated_at;

insert into public.worker_job_attempts (id, tenant_id, branch_id, job_id, outbox_event_id, status, attempt_number, worker_id, started_at, finished_at, created_at, error_code, error_message, error_retryable) values
  ('00000000-0000-0000-0000-000000004301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000004202', '00000000-0000-0000-0000-000000004102', 'SUCCEEDED', 1, 'worker-seed-a', '2026-09-07T16:01:00Z', '2026-09-07T16:02:00Z', '2026-09-07T16:01:00Z', null, null, null),
  ('00000000-0000-0000-0000-000000004302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000004203', '00000000-0000-0000-0000-000000004103', 'RETRY_SCHEDULED', 2, 'worker-seed-a', '2026-09-07T16:34:00Z', '2026-09-07T16:35:00Z', '2026-09-07T16:34:00Z', 'WORKER_PROVIDER_UNAVAILABLE', 'Local notification provider unavailable.', true),
  ('00000000-0000-0000-0000-000000004303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000004205', null, 'DEAD_LETTERED', 5, 'worker-seed-b', '2026-09-07T18:28:00Z', '2026-09-07T18:30:00Z', '2026-09-07T18:28:00Z', 'WORKER_RETRY_EXHAUSTED', 'Retry limit reached for stock alert job.', false)
on conflict (id) do update set status = excluded.status, error_code = excluded.error_code, error_message = excluded.error_message, error_retryable = excluded.error_retryable;

insert into public.notification_delivery_attempts (id, tenant_id, branch_id, notification_intent_id, channel, status, attempt_number, provider, provider_message_id, error_code, error_message, error_retryable, sent_at, created_at) values
  ('00000000-0000-0000-0000-000000004401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000004002', 'LOCAL', 'SENT', 1, 'local', 'seed-local-message-4401', null, null, null, '2026-09-07T16:02:00Z', '2026-09-07T16:02:00Z'),
  ('00000000-0000-0000-0000-000000004402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000004003', 'LOCAL', 'RETRY_SCHEDULED', 2, 'local', null, 'WORKER_PROVIDER_UNAVAILABLE', 'Local notification provider unavailable.', true, null, '2026-09-07T16:35:00Z'),
  ('00000000-0000-0000-0000-000000004403', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000004003', 'LOCAL', 'DEAD_LETTERED', 5, 'local', null, 'WORKER_RETRY_EXHAUSTED', 'Retry limit reached for local notification delivery.', false, null, '2026-09-07T17:10:00Z')
on conflict (id) do update set status = excluded.status, error_code = excluded.error_code, error_message = excluded.error_message, error_retryable = excluded.error_retryable;
