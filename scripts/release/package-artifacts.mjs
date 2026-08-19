import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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

cpSync(join(root, 'apps/gateway/dist'), join(bundleRoot, 'gateway/dist'), { recursive: true });
cpSync(join(root, 'apps/mobile/dist'), join(bundleRoot, 'mobile/dist'), { recursive: true });
writeFileSync(join(bundleRoot, 'RELEASE_TAG'), `${tag}\n`, 'utf8');
writeFileSync(join(bundleRoot, 'README.txt'), [
  `SiPlayer ${tag} build artifacts`,
  '',
  'gateway/dist contains the compiled Gateway server.',
  'mobile/dist contains the Expo Web/iOS/Android JavaScript export.',
  'These are not signed App Store or Google Play binaries.',
  '',
].join('\n'), 'utf8');

execFileSync('tar', ['-czf', archivePath, '-C', stagingRoot, bundleName], { stdio: 'inherit' });
const digest = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
writeFileSync(join(outputRoot, 'SHA256SUMS.txt'), `${digest}  ${bundleName}.tar.gz\n`, 'utf8');
rmSync(stagingRoot, { recursive: true, force: true });

console.log(`Created ${archivePath}`);
