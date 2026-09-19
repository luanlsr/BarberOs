import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260918020000_product_domain_extensions.sql");
const sql = await readFile(migrationPath, "utf8");

const tables = [
  "customer_tags", "customer_tag_assignments", "customer_metrics", "waitlist_entries",
  "suppliers", "purchase_orders", "purchase_order_items", "service_packages",
  "service_package_items", "customer_package_balances", "messaging_connections",
  "conversations", "messages", "message_events", "messaging_consents", "webhook_events",
  "campaigns", "campaign_audiences", "campaign_runs", "ai_conversations", "ai_messages",
  "ai_tool_registry", "ai_pending_actions", "ai_tool_executions", "ai_usage",
  "knowledge_documents", "saas_plans", "plan_entitlements", "tenant_subscriptions",
  "usage_counters", "billing_invoices", "billing_events", "platform_memberships",
  "support_access_sessions", "storage_objects"
];

const checks = [
  ["migration has all product tables", tables.every((table) => sql.includes(`create table if not exists public.${table}`))],
  ["migration defines tenant scope", (sql.match(/tenant_id uuid/g) ?? []).length >= 25],
  ["migration defines branch scope", (sql.match(/branch_id uuid/g) ?? []).length >= 15],
  ["migration enables RLS", sql.includes("enable row level security")],
  ["migration defines member policies", sql.includes("has_product_domain_access")],
  ["migration defines platform policies", sql.includes("has_platform_access")],
  ["migration defines support session guard", sql.includes("has_support_session_access")],
  ["migration has webhook idempotency", sql.includes("unique (provider, external_event_id)")],
  ["migration has lifecycle checks", (sql.match(/status text not null/g) ?? []).length >= 20],
  ["migration has operational indexes", (sql.match(/create index if not exists/g) ?? []).length >= 20],
  ["migration does not contain service role secrets", !/service[_-]?role|eyJhbGciOi/i.test(sql)],
  ["migration does not require pgvector", !sql.includes("vector(")]
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length > 0) {
  console.error(failures.map(([name]) => `FAIL: ${name}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Product domain migration validated (${tables.length} tables, ${checks.length} checks).`);
}
