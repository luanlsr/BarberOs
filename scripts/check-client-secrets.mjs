import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../apps/web/.next/static/', import.meta.url));
try {
  await access(root);
} catch {
  console.log('Client bundle check skipped: build output not found.');
  process.exit(0);
}

const forbidden = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'BARBEROS_SECRET'];
async function scan(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await scan(path)));
    else files.push(path);
  }
  return files;
}

const files = await scan(root);
const findings = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const token of forbidden) if (content.includes(token)) findings.push(`${file}: ${token}`);
}
if (findings.length) {
  console.error(`Client bundle contains forbidden secret markers:\n${findings.join('\n')}`);
  process.exit(1);
}
console.log(`Client bundle checked (${files.length} files).`);
