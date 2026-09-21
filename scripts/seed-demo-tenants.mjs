import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const tenants = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Barbearia Modelo',
    branchId: '00000000-0000-0000-0000-000000000011',
    branchName: 'Unidade Centro',
    slug: 'modelo',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Barbearia Premium Sul',
    branchId: '00000000-0000-0000-0000-000000000021',
    branchName: 'Unidade Campo Grande',
    slug: 'premium-sul',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Rede Navalha Urbana',
    branchId: '00000000-0000-0000-0000-000000000031',
    branchName: 'Unidade Centro',
    slug: 'navalha-urbana',
  },
];

const roleProfiles = [
  { role: 'OWNER', suffix: 'admin', name: 'Admin' },
  { role: 'RECEPTIONIST', suffix: 'recepcao', name: 'Recepcao' },
  { role: 'PROFESSIONAL', suffix: 'barbeiro1', name: 'Carlos Andrade' },
  { role: 'PROFESSIONAL', suffix: 'barbeiro2', name: 'Lucas Pereira' },
  { role: 'PROFESSIONAL', suffix: 'barbeiro3', name: 'Rafael Costa' },
];

const services = [
  ['Cabelo', 'Corte de cabelo', 'Corte de cabelo completo.', 45, 4500],
  ['Barba', 'Barba', 'Modelagem e acabamento de barba.', 30, 3500],
  ['Combos', 'Corte + Barba', 'Combo operacional de corte e barba.', 70, 8000],
  ['Design', 'Sobrancelha', 'Design e acabamento de sobrancelha.', 15, 1000],
];

const productFixtures = [
  ['Pomada Matte 80g', 'POMADA-MATTE', 4500, 1800, 8, 24],
  ['Shampoo Profissional', 'SHAMPOO-PRO', 3900, 1600, 6, 18],
  ['Oleo para Barba', 'OLEO-BARBA', 5500, 2200, 5, 15],
];

const customerNames = [
  ['Joao Silva', '+5511999101001'],
  ['Pedro Souza', '+5511999101002'],
  ['Marcos Oliveira', '+5511999101003'],
  ['Felipe Santos', '+5511999101004'],
  ['Bruno Almeida', '+5511999101005'],
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.toLowerCase();
  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function createOrUpdateAuthUser(supabase, profile) {
  const metadata = {
    full_name: profile.fullName,
    name: profile.fullName,
    barberos_role: profile.role,
    tenant_slug: profile.tenantSlug,
  };

  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: profile.password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (!error) return data.user;
  const alreadyExists =
    error.status === 422 ||
    error.message.toLowerCase().includes('already') ||
    error.message.toLowerCase().includes('registered');
  if (!alreadyExists) throw error;

  const existingUser = await findUserByEmail(supabase, profile.email);
  if (!existingUser) throw error;

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
    existingUser.id,
    {
      password: profile.password,
      email_confirm: true,
      user_metadata: { ...existingUser.user_metadata, ...metadata },
    },
  );
  if (updateError) throw updateError;
  return updated.user;
}

async function ensureMembership(supabase, { tenant, userId, role }) {
  const { data, error } = await supabase
    .from('memberships')
    .upsert(
      {
        user_id: userId,
        tenant_id: tenant.id,
        role,
        status: 'ACTIVE',
      },
      { onConflict: 'user_id,tenant_id' },
    )
    .select('id')
    .single();
  if (error) throw error;

  const { error: branchError } = await supabase
    .from('membership_branches')
    .upsert({ membership_id: data.id, branch_id: tenant.branchId }, { onConflict: 'membership_id,branch_id' });
  if (branchError) throw branchError;
  return data.id;
}

async function ensureTenantBase(supabase, tenant) {
  const { error: tenantError } = await supabase
    .from('tenants')
    .upsert({ id: tenant.id, name: tenant.name, status: 'ACTIVE' }, { onConflict: 'id' });
  if (tenantError) throw tenantError;

  const { error: branchError } = await supabase.from('branches').upsert(
    {
      id: tenant.branchId,
      tenant_id: tenant.id,
      name: tenant.branchName,
      status: 'ACTIVE',
    },
    { onConflict: 'id' },
  );
  if (branchError) throw branchError;

  for (const entitlement of ['core.operations', 'finance', 'inventory', 'worker.operations', 'notifications', 'ai']) {
    const { error } = await supabase
      .from('tenant_entitlements')
      .upsert({ tenant_id: tenant.id, entitlement_code: entitlement, enabled: true }, { onConflict: 'tenant_id,entitlement_code' });
    if (error) throw error;
  }
}

async function ensureServices(supabase, tenant) {
  const result = [];
  for (const [category, name, description, duration, price] of services) {
    const { data, error } = await supabase
      .from('services')
      .upsert(
        {
          tenant_id: tenant.id,
          category,
          name,
          description,
          duration_minutes: duration,
          price_cents: price,
          estimated_cost_cents: null,
          status: 'ACTIVE',
          archived_at: null,
        },
        { onConflict: 'tenant_id,name' },
      )
      .select('id, name, duration_minutes, price_cents')
      .single();
    if (error) throw error;
    result.push(data);
  }
  return result;
}

async function ensureProfessional(supabase, { tenant, user, profile, serviceRows }) {
  if (profile.role !== 'PROFESSIONAL') return null;
  const { error } = await supabase.from('professionals').upsert(
    {
      id: user.id,
      tenant_id: tenant.id,
      display_name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      role_label: 'Barbeiro',
      status: 'ACTIVE',
      archived_at: null,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;

  const { error: branchError } = await supabase.from('professional_branches').upsert(
    {
      professional_id: user.id,
      tenant_id: tenant.id,
      branch_id: tenant.branchId,
    },
    { onConflict: 'professional_id,branch_id' },
  );
  if (branchError) throw branchError;

  const links = serviceRows.map((service) => ({
    service_id: service.id,
    professional_id: user.id,
    tenant_id: tenant.id,
  }));
  const { error: serviceError } = await supabase
    .from('service_professionals')
    .upsert(links, { onConflict: 'service_id,professional_id' });
  if (serviceError) throw serviceError;

  for (let weekday = 1; weekday <= 6; weekday += 1) {
    const { error: scheduleError } = await supabase.from('professional_schedules').upsert(
      {
        tenant_id: tenant.id,
        branch_id: tenant.branchId,
        professional_id: user.id,
        weekday,
        starts_at_local: '09:00',
        ends_at_local: '18:00',
        break_starts_at_local: '12:00',
        break_ends_at_local: '13:00',
        active: true,
      },
      { onConflict: 'tenant_id,branch_id,professional_id,weekday,starts_at_local,ends_at_local' },
    );
    if (scheduleError) throw scheduleError;
  }
  return user.id;
}

async function ensureCustomers(supabase, tenant, professionalIds) {
  const customers = [];
  for (let index = 0; index < customerNames.length; index += 1) {
    const [name, phone] = customerNames[index];
    const { data: existing, error: selectError } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('phone', phone.replace('+5511', '+55' + (11 + tenants.indexOf(tenant))).replace('9101', `9${tenants.indexOf(tenant) + 1}01`))
      .maybeSingle();
    if (selectError) throw selectError;

    const payload = {
      tenant_id: tenant.id,
      branch_id: tenant.branchId,
      name,
      phone: phone.replace('+5511', '+55' + (11 + tenants.indexOf(tenant))).replace('9101', `9${tenants.indexOf(tenant) + 1}01`),
      email: `${name.toLowerCase().replaceAll(' ', '.')}@${tenant.slug}.demo`,
      source: 'seed-demo',
      preferred_professional_id: professionalIds[index % professionalIds.length],
      consent_whatsapp: true,
      consent_marketing: true,
      status: index < 3 ? 'ACTIVE' : 'NEW',
    };

    const query = existing
      ? supabase.from('customers').update(payload).eq('id', existing.id).select('id').single()
      : supabase.from('customers').insert(payload).select('id').single();
    const { data, error } = await query;
    if (error) throw error;
    customers.push(data.id);
  }
  return customers;
}

async function ensureAppointments(supabase, { tenant, customerIds, professionalIds, serviceRows }) {
  const starts = ['2026-09-22T12:00:00Z', '2026-09-22T13:00:00Z', '2026-09-22T14:00:00Z'];
  for (let index = 0; index < starts.length; index += 1) {
    const service = serviceRows[index % serviceRows.length];
    const startsAt = new Date(starts[index]);
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
    const professionalId = professionalIds[index % professionalIds.length];
    const idempotentNote = `seed-demo-${tenant.slug}-${index + 1}`;

    const { data: existing, error: selectError } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('notes', idempotentNote)
      .maybeSingle();
    if (selectError) throw selectError;

    const payload = {
      tenant_id: tenant.id,
      branch_id: tenant.branchId,
      customer_id: customerIds[index % customerIds.length],
      professional_id: professionalId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: index === 2 ? 'PENDING' : 'CONFIRMED',
      source: 'MANUAL',
      notes: idempotentNote,
    };
    const appointmentQuery = existing
      ? supabase.from('appointments').update(payload).eq('id', existing.id).select('id').single()
      : supabase.from('appointments').insert(payload).select('id').single();
    const { data: appointment, error } = await appointmentQuery;
    if (error) throw error;

    const { error: serviceError } = await supabase.from('appointment_services').upsert(
      {
        appointment_id: appointment.id,
        service_id: service.id,
        tenant_id: tenant.id,
        sequence: 1,
        service_name: service.name,
        duration_minutes: service.duration_minutes,
        price_cents: service.price_cents,
      },
      { onConflict: 'appointment_id,sequence' },
    );
    if (serviceError) throw serviceError;
  }
}

async function ensureProducts(supabase, tenant) {
  const { data: category, error: categoryError } = await supabase
    .from('product_categories')
    .insert({
      tenant_id: tenant.id,
      name: 'Produtos profissionais',
      description: 'Produtos para venda e consumo na barbearia.',
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  let categoryId = category?.id;
  if (categoryError) {
    const { data: existing, error: existingError } = await supabase
      .from('product_categories')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('name', 'Produtos profissionais')
      .maybeSingle();
    if (existingError || !existing) throw categoryError;
    categoryId = existing.id;
  }

  await supabase.from('product_category_branches').upsert(
    { tenant_id: tenant.id, category_id: categoryId, branch_id: tenant.branchId },
    { onConflict: 'tenant_id,category_id,branch_id' },
  );

  const { data: location, error: locationError } = await supabase
    .from('inventory_locations')
    .insert({
      tenant_id: tenant.id,
      branch_id: tenant.branchId,
      name: 'Estoque principal',
      active: true,
    })
    .select('id')
    .single();
  let locationId = location?.id;
  if (locationError) {
    const { data: existing, error: existingError } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('branch_id', tenant.branchId)
      .eq('name', 'Estoque principal')
      .maybeSingle();
    if (existingError || !existing) throw locationError;
    locationId = existing.id;
  }

  for (const [name, skuBase, salePrice, cost, minimum, quantity] of productFixtures) {
    const sku = `${tenant.slug.toUpperCase()}-${skuBase}`;
    const productPayload = {
      tenant_id: tenant.id,
      category_id: categoryId,
      sku,
      name,
      description: `${name} para vitrine demo.`,
      status: 'ACTIVE',
      sale_price_amount_cents: salePrice,
      cost_amount_cents: cost,
      stock_tracking_policy: 'TRACKED',
      allow_negative_stock: false,
      minimum_stock_quantity: minimum,
      archived_at: null,
    };
    const { data: existingProduct, error: existingProductError } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('sku', sku)
      .maybeSingle();
    if (existingProductError) throw existingProductError;
    const productQuery = existingProduct
      ? supabase.from('products').update(productPayload).eq('id', existingProduct.id).select('id').single()
      : supabase.from('products').insert(productPayload).select('id').single();
    const { data: product, error } = await productQuery;
    if (error) throw error;

    const { error: branchError } = await supabase.from('product_branches').upsert(
      { tenant_id: tenant.id, product_id: product.id, branch_id: tenant.branchId },
      { onConflict: 'tenant_id,product_id,branch_id' },
    );
    if (branchError) throw branchError;

    const { data: existingMovement } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('idempotency_key', `seed-demo-stock-${sku}`)
      .maybeSingle();
    if (!existingMovement) {
      const { error: stockError } = await supabase.from('stock_movements').insert({
        tenant_id: tenant.id,
        branch_id: tenant.branchId,
        location_id: locationId,
        product_id: product.id,
        type: 'ENTRY',
        quantity,
        balance_after_quantity: quantity,
        source_type: 'MANUAL',
        source_id: `seed-demo-${tenant.slug}`,
        idempotency_key: `seed-demo-stock-${sku}`,
        reason: 'Entrada inicial para demonstracao',
      });
      if (stockError) throw stockError;
    }
  }
}

async function main() {
  loadEnvFile(path.join(rootDir, '.env'));
  loadEnvFile(path.join(rootDir, '.env.local'));
  loadEnvFile(path.join(rootDir, 'apps', 'web', '.env.local'));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o seed demo.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const credentials = [];
  for (const tenant of tenants) {
    await ensureTenantBase(supabase, tenant);
    const serviceRows = await ensureServices(supabase, tenant);
    const professionalIds = [];

    for (const profile of roleProfiles) {
      const fullName = `${profile.name} ${tenant.name}`;
      const email = `${profile.suffix}@${tenant.slug}.barberos.local`;
      const user = await createOrUpdateAuthUser(supabase, {
        email,
        password: 'BarberOS@123456',
        fullName,
        role: profile.role,
        tenantSlug: tenant.slug,
        phone: '+5511999999999',
      });
      await ensureMembership(supabase, { tenant, userId: user.id, role: profile.role });
      const professionalId = await ensureProfessional(supabase, {
        tenant,
        user,
        profile: { ...profile, fullName, email, phone: '+5511999999999' },
        serviceRows,
      });
      if (professionalId) professionalIds.push(professionalId);
      credentials.push({ tenant: tenant.name, role: profile.role, email, password: 'BarberOS@123456' });
    }

    const customerIds = await ensureCustomers(supabase, tenant, professionalIds);
    await ensureAppointments(supabase, { tenant, customerIds, professionalIds, serviceRows });
    await ensureProducts(supabase, tenant);
  }

  console.log('[BarberOS seed] Demo tenants/users/data ready.');
  for (const credential of credentials) {
    console.log(`${credential.tenant} | ${credential.role} | ${credential.email} | ${credential.password}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
