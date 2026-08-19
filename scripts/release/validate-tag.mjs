import { readFileSync } from 'node:fs';

const tag = process.env.RELEASE_TAG ?? '';
const match = tag.match(/^v(\d+\.\d+\.\d+)(?:-(?:alpha|beta|rc)\.\d+)?$/);
if (!match) throw new Error(`Invalid release tag: ${tag}. Expected vX.Y.Z or vX.Y.Z-alpha.N/beta.N/rc.N.`);

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const mobileConfig = readFileSync('apps/mobile/app.config.ts', 'utf8');
const rootVersion = rootPackage.version;
const mobileVersion = mobileConfig.match(/version:\s*['"]([^'"]+)['"]/)?.[1];

if (rootVersion !== match[1]) {
  throw new Error(`Tag ${tag} does not match root package version ${rootVersion}. Update package.json before tagging.`);
}
if (mobileVersion !== match[1]) {
  throw new Error(`Tag ${tag} does not match mobile app version ${mobileVersion ?? '<missing>'}. Update apps/mobile/app.config.ts before tagging.`);
}

console.log(`Validated ${tag}; prerelease=${tag.includes('-')}`);
