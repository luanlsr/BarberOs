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
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'OPEN', 20000, 28500, 'seed-cash-session-1201', null, '2026-09-07T11:00:00Z')
on conflict (id) do update set status = excluded.status, opening_balance_amount_cents = excluded.opening_balance_amount_cents, expected_balance_amount_cents = excluded.expected_balance_amount_cents, idempotency_key = excluded.idempotency_key, opened_at = excluded.opened_at;

insert into public.payments (id, tenant_id, branch_id, order_id, method, status, amount_cents, cash_received_amount_cents, change_due_amount_cents, external_reference, idempotency_key, received_by, received_at) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000702', 'CASH', 'PAID', 8500, 10000, 1500, 'seed-cash-payment', 'seed-payment-1001', null, '2026-09-07T15:20:00Z')
on conflict (id) do update set method = excluded.method, status = excluded.status, amount_cents = excluded.amount_cents, cash_received_amount_cents = excluded.cash_received_amount_cents, change_due_amount_cents = excluded.change_due_amount_cents, external_reference = excluded.external_reference, idempotency_key = excluded.idempotency_key, received_at = excluded.received_at;

insert into public.payment_allocations (id, tenant_id, branch_id, payment_id, order_id, amount_cents) values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000702', 8500)
on conflict (id) do update set payment_id = excluded.payment_id, order_id = excluded.order_id, amount_cents = excluded.amount_cents;

insert into public.cash_movements (id, tenant_id, branch_id, session_id, type, amount_cents, signed_amount_cents, order_id, payment_id, idempotency_key, reason, created_by, created_at) values
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001201', 'OPENING_BALANCE', 20000, 20000, null, null, 'seed-cash-opening-1301', 'Saldo inicial da seed', null, '2026-09-07T11:00:00Z'),
  ('00000000-0000-0000-0000-000000001302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001201', 'SALE', 8500, 8500, '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000001001', 'seed-cash-sale-1302', 'Pagamento em dinheiro da Comanda paga fixture', null, '2026-09-07T15:20:00Z')
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
  ('00000000-0000-0000-0000-000000001503', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'IN', 'SERVICE_REVENUE', 'POSTED', 7000, 7000, '2026-09-06', '2026-09-06', 'PAYMENT', '00000000-0000-0000-0000-000000001002', null, 'Receita da Comanda paga para repasse seed', 'seed-finance-payment-1002', null),
  ('00000000-0000-0000-0000-000000001504', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'OUT', 'PAYOUT', 'POSTED', 3500, -3500, '2026-09-06', '2026-09-07', 'PAYOUT', '00000000-0000-0000-0000-000000002001', null, 'Repasse pago ao profissional Carlos', 'seed-finance-payout-2001', null)
on conflict (id) do nothing;
insert into public.expenses (id, tenant_id, branch_id, category_id, recurring_template_id, description, vendor_name, status, amount_cents, competence_date, due_date, cash_date, payment_method, recurrence_key, document_metadata, financial_entry_id, idempotency_key, payment_idempotency_key, created_by, updated_by, paid_by, paid_at) values
  ('00000000-0000-0000-0000-000000001601', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000001402', null, 'Energia da Unidade Centro', 'Energia SP', 'PAID', 4200, '2026-09-05', '2026-09-10', '2026-09-05', 'PIX', null, '{}'::jsonb, '00000000-0000-0000-0000-000000001502', 'seed-expense-1601', 'seed-expense-pay-1601', null, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-09-05T13:00:00Z'),
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