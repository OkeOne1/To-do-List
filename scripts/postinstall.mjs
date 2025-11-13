import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const vendorDir = path.join(root, 'public', 'vendor');
const modulesDir = path.join(root, 'node_modules');

const packagesToCopy = [
  path.join('@capacitor', 'core'),
  path.join('@capacitor', 'preferences')
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyPackage(pkg) {
  const source = path.join(modulesDir, pkg);
  const target = path.join(vendorDir, pkg);
  await ensureDir(path.dirname(target));
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true, dereference: true });
}

async function main() {
  await ensureDir(vendorDir);
  for (const pkg of packagesToCopy) {
    await copyPackage(pkg);
  }
}

main().catch((error) => {
  console.error('Failed to copy vendor packages', error);
  process.exitCode = 1;
});
