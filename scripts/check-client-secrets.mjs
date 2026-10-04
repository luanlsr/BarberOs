import { access, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const clientBundleRoot = join(repoRoot, 'apps/web/.next/static');
const textRoots = ['docs', '.github/workflows'].map((path) => join(repoRoot, path));

const forbiddenClientMarkers = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'BARBEROS_SECRET'];
const forbiddenSecretValuePatterns = [
  /sbp_[A-Za-z0-9_-]{20,}/g,
  /sk_(live|test)_[A-Za-z0-9_-]{20,}/g,
  /whsec_[A-Za-z0-9_-]{20,}/g,
  /EAAG[A-Za-z0-9_-]{20,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
];

const findings = [];

await scanClientBundle();
await scanTextRoots();

if (findings.length) {
  console.error(`Secret boundary check failed:\n${findings.join('\n')}`);
  process.exit(1);
}

console.log('Secret boundary check passed.');

async function scanClientBundle() {
  try {
    await access(clientBundleRoot);
  } catch {
    console.log('Client bundle check skipped: build output not found.');
    return;
  }

  const files = await listFiles(clientBundleRoot);
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const token of forbiddenClientMarkers) {
      if (content.includes(token))
        findings.push(`${formatPath(file)}: client bundle marker ${token}`);
    }
    scanSecretValues(file, content);
  }
  console.log(`Client bundle checked (${files.length} files).`);
}

async function scanTextRoots() {
  let checked = 0;
  for (const root of textRoots) {
    try {
      await access(root);
    } catch {
      continue;
    }
    const files = (await listFiles(root)).filter(isTextFile);
    checked += files.length;
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      scanSecretValues(file, content);
    }
  }
  console.log(`Docs/workflows secret values checked (${checked} files).`);
}

function scanSecretValues(file, content) {
  for (const pattern of forbiddenSecretValuePatterns) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (!matches) continue;
    findings.push(`${formatPath(file)}: possible committed secret value (${matches.length})`);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
}

function isTextFile(file) {
  return /\.(md|mdx|ya?ml|json|env|txt|toml|ini)$/i.test(file);
}

function formatPath(file) {
  return relative(repoRoot, file).replaceAll('\\', '/');
}
