/**
 * Évite le double React (workspace npm) qui casse le prerender Next.
 * Relie admin/node_modules/react(|-dom) vers la racine du monorepo.
 */
const fs = require('fs');
const path = require('path');

const adminModules = path.join(__dirname, '..', 'node_modules');
const rootModules = path.join(__dirname, '..', '..', 'node_modules');

for (const name of ['react', 'react-dom']) {
  const target = path.join(rootModules, name);
  const linkPath = path.join(adminModules, name);
  if (!fs.existsSync(target)) continue;
  fs.mkdirSync(adminModules, { recursive: true });
  fs.rmSync(linkPath, { recursive: true, force: true });
  fs.symlinkSync(path.relative(adminModules, target), linkPath, 'dir');
  console.log(`linked ${name} -> ${target}`);
}
