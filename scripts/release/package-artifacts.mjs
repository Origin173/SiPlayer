import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const tag = process.env.RELEASE_TAG ?? '';
if (!/^v\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/.test(tag)) throw new Error(`Invalid release tag: ${tag}`);

const root = process.cwd();
const stagingRoot = join(root, 'release-staging');
const outputRoot = join(root, 'release-artifacts');
const bundleName = `siplayer-${tag}`;
const bundleRoot = join(stagingRoot, bundleName);
const archivePath = join(outputRoot, `${bundleName}.tar.gz`);

rmSync(stagingRoot, { recursive: true, force: true });
rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(join(bundleRoot, 'gateway'), { recursive: true });
mkdirSync(join(bundleRoot, 'mobile'), { recursive: true });
mkdirSync(outputRoot, { recursive: true });

const gatewayBundlePath = join(bundleRoot, 'gateway/dist/server.js');
mkdirSync(join(bundleRoot, 'gateway/dist'), { recursive: true });
await build({
  entryPoints: [join(root, 'apps/gateway/src/server.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'bundle',
  outfile: gatewayBundlePath,
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
cpSync(join(root, 'apps/mobile/dist'), join(bundleRoot, 'mobile/dist'), { recursive: true });
writeFileSync(join(bundleRoot, 'RELEASE_TAG'), `${tag}\n`, 'utf8');
writeFileSync(join(bundleRoot, 'gateway/package.json'), JSON.stringify({ type: 'module', private: true }, null, 2) + '\n', 'utf8');
writeFileSync(join(bundleRoot, 'gateway/README.txt'), [
  'The Gateway server is bundled and runs without installing workspace dependencies.',
  '',
  'Set the production environment variables described in the SiPlayer release documentation, then run:',
  '  node dist/server.js',
  '',
].join('\n'), 'utf8');
writeFileSync(join(bundleRoot, 'README.txt'), [
  `SiPlayer ${tag} build artifacts`,
  '',
  'gateway/dist/server.js is a standalone bundled Gateway server.',
  'mobile/dist contains the Expo Web/iOS/Android JavaScript export.',
  'These are not signed App Store or Google Play binaries.',
  '',
].join('\n'), 'utf8');

execFileSync('tar', ['-czf', archivePath, '-C', stagingRoot, bundleName], { stdio: 'inherit' });
const digest = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
writeFileSync(join(outputRoot, 'SHA256SUMS.txt'), `${digest}  ${bundleName}.tar.gz\n`, 'utf8');
rmSync(stagingRoot, { recursive: true, force: true });

console.log(`Created ${archivePath}`);
