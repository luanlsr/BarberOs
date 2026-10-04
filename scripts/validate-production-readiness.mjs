import { spawn } from 'node:child_process';

const steps = [
  ['Core validation', 'npm', ['run', 'validate']],
  ['Client secret boundary', 'npm', ['run', 'validate:client-secrets']],
  ['Foundation migration validator', 'npm', ['run', 'validate:foundation']],
  ['Core operations migration validator', 'npm', ['run', 'validate:core-operations']],
  ['Orders migration validator', 'npm', ['run', 'validate:orders']],
  ['Payments migration validator', 'npm', ['run', 'validate:payments']],
  ['Finance migration validator', 'npm', ['run', 'validate:finance']],
  ['Inventory migration validator', 'npm', ['run', 'validate:inventory']],
  ['Worker migration validator', 'npm', ['run', 'validate:worker']],
  ['Messaging migration validator', 'npm', ['run', 'validate:messaging']],
  ['Product domain migration validator', 'npm', ['run', 'validate:product-domain']],
  ['Master Admin billing migration validator', 'npm', ['run', 'validate:master-admin-billing']],
  ['OpenSpec specs', 'npx', ['openspec', 'validate', '--specs']],
  [
    'OpenSpec production hardening change',
    'npx',
    ['openspec', 'validate', 'production-hardening-observability', '--strict'],
  ],
];

for (const [label, command, args] of steps) {
  console.log(`\n==> ${label}`);
  const result = await run(command, args);
  if (result !== 0) {
    console.error(`\nProduction readiness failed at: ${label}`);
    process.exit(result);
  }
}

console.log('\nProduction readiness validation passed.');

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    child.on('close', resolve);
    child.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
  });
}
