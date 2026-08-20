import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const tag = process.env.RELEASE_TAG ?? '';
const match = tag.match(/^v(\d+\.\d+\.\d+)(?:-(?:alpha|beta|rc)\.\d+)?$/);
if (!match) throw new Error(`Invalid release tag: ${tag}. Expected vX.Y.Z or vX.Y.Z-alpha.N/beta.N/rc.N.`);

const pnpmCommand = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
const pnpmArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'pnpm.cmd list --recursive --depth -1 --json']
  : ['list', '--recursive', '--depth', '-1', '--json'];
const workspacePackages = JSON.parse(execFileSync(
  pnpmCommand,
  pnpmArgs,
  { encoding: 'utf8' },
));
if (!Array.isArray(workspacePackages) || workspacePackages.length === 0) {
  throw new Error('Unable to discover workspace packages with pnpm.');
}

const mobileConfig = readFileSync('apps/mobile/app.config.ts', 'utf8');
const mobileVersion = mobileConfig.match(/version:\s*['"]([^'"]+)['"]/)?.[1];

for (const workspacePackage of workspacePackages) {
  if (typeof workspacePackage.path !== 'string') {
    throw new Error('pnpm returned a workspace package without a path.');
  }
  const packagePath = resolve(workspacePackage.path, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (packageJson.version !== match[1]) {
    const displayPath = relative(process.cwd(), packagePath) || 'package.json';
    throw new Error(`Tag ${tag} does not match ${packageJson.name ?? workspacePackage.name} package version ${packageJson.version ?? '<missing>'}. Update ${displayPath} before tagging.`);
  }
}
if (mobileVersion !== match[1]) {
  throw new Error(`Tag ${tag} does not match mobile app version ${mobileVersion ?? '<missing>'}. Update apps/mobile/app.config.ts before tagging.`);
}

console.log(`Validated ${tag}; workspacePackages=${workspacePackages.length}; prerelease=${tag.includes('-')}`);
