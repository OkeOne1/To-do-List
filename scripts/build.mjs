import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const srcDir = path.join(root, 'src');

async function ensureCleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true });
  await fs.cp(source, target, { recursive: true });
}

async function main() {
  await ensureCleanDir(distDir);
  await copyDir(publicDir, distDir);
  await copyDir(srcDir, path.join(distDir, 'src'));
  console.log('Build output generated in dist/');
}

main().catch((error) => {
  console.error('Build failed', error);
  process.exitCode = 1;
});
