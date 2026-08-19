import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value?.startsWith('--')) continue;
  const next = process.argv[index + 1];
  args.set(value.slice(2), next && !next.startsWith('--') ? next : true);
  if (next && !next.startsWith('--')) index += 1;
}

const tag = String(args.get('tag') ?? process.env.RELEASE_TAG ?? '');
const outputPath = typeof args.get('output') === 'string' ? args.get('output') : null;
const changelogPath = typeof args.get('changelog') === 'string' ? args.get('changelog') : null;
const shouldUpdateChangelog = args.has('update');

if (!/^v\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/.test(tag)) {
  throw new Error(`Invalid release tag: ${tag}. Expected vX.Y.Z or vX.Y.Z-alpha.N/beta.N/rc.N.`);
}

const version = tag.slice(1);

function git(commandArgs) {
  return execFileSync('git', commandArgs, { encoding: 'utf8' }).trim();
}

function previousTag() {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*', `${tag}^`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function commitRows() {
  const previous = previousTag();
  const range = previous ? `${previous}..${tag}` : tag;
  const raw = git(['log', '--no-merges', '--pretty=format:%H%x09%s', range]);
  return raw
    .split('\n')
    .map((line) => {
      const separator = line.indexOf('\t');
      return separator < 0 ? null : { hash: line.slice(0, separator), subject: line.slice(separator + 1).trim() };
    })
    .filter((row) => row && !/^docs:\s+update changelog for v\d+\.\d+\.\d+/.test(row.subject));
}

const sections = [
  { key: 'feat', title: '✨ Features' },
  { key: 'fix', title: '🐛 Fixes' },
  { key: 'perf', title: '⚡ Performance' },
  { key: 'refactor', title: '🛠 Improvements' },
  { key: 'docs', title: '📚 Documentation' },
  { key: 'test', title: '✅ Tests' },
  { key: 'maintenance', title: '📦 Maintenance' },
  { key: 'other', title: '📝 Other changes' },
];

function classify(subject) {
  const match = subject.match(/^(feat|fix|perf|refactor|docs|test|build|ci|chore)(?:\([^)]*\))?!?:\s*(.+)$/i);
  if (!match) return { key: 'other', subject };
  const type = match[1].toLowerCase();
  const key = ['build', 'ci', 'chore'].includes(type) ? 'maintenance' : type;
  return { key, subject: match[2] };
}

function commitLink(hash) {
  const server = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  return server && repository ? ` ([${hash.slice(0, 7)}](${server}/${repository}/commit/${hash}))` : ` (${hash.slice(0, 7)})`;
}

function renderEntry() {
  const grouped = new Map(sections.map((section) => [section.key, []]));
  const seen = new Set();
  for (const row of commitRows()) {
    if (!row || seen.has(row.subject)) continue;
    seen.add(row.subject);
    const item = classify(row.subject);
    grouped.get(item.key)?.push(`- ${item.subject}${commitLink(row.hash)}`);
  }

  const lines = [`## ${version}`, '', `\`${new Date().toISOString().slice(0, 10)}\``, ''];
  for (const section of sections) {
    const entries = grouped.get(section.key) ?? [];
    if (entries.length === 0) continue;
    lines.push(`### ${section.title}`, '', ...entries, '');
  }
  if (lines.length === 4) lines.push('- No user-facing changes detected.', '');
  return lines.join('\n').trimEnd();
}

const entry = renderEntry();
if (outputPath) writeFileSync(outputPath, `${entry}\n`, 'utf8');

if (shouldUpdateChangelog) {
  if (!changelogPath) throw new Error('--update requires --changelog PATH.');
  const marker = '<!-- release entries -->';
  const current = readFileSync(changelogPath, 'utf8');
  const heading = new RegExp(`^##\\s+${version.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*$`, 'm');
  if (!heading.test(current)) {
    const markerIndex = current.indexOf(marker);
    if (markerIndex < 0) throw new Error(`Changelog marker not found in ${changelogPath}.`);
    const insertAt = markerIndex + marker.length;
    const next = `${current.slice(0, insertAt).trimEnd()}\n\n${entry}\n\n${current.slice(insertAt).trimStart()}`;
    writeFileSync(changelogPath, next, 'utf8');
  }
}

if (!outputPath) process.stdout.write(`${entry}\n`);
