import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { source: { type: 'string', default: '.' }, output: { type: 'string' } } });
if (!values.output) throw new Error('--output required');
const root = resolve(values.source);
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && entry.name === 'graphify-out') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const sources = ['src', 'packages/core/src', 'neon/migrations'].flatMap(path => files(join(root, path)));
const routes = sources.filter(path => /\/app\/(?:.*\/)?page\.tsx$/.test(path));
const clients = sources.filter(path => /\.[jt]sx?$/.test(path) && /^['"]use client['"]/m.test(readFileSync(path, 'utf8')));
const fingerprints = Object.fromEntries([...sources, ...['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'instrumentation-client.ts'].map(path => join(root, path))]
  .sort().map(path => [relative(root, path), createHash('sha256').update(readFileSync(path)).digest('hex')]));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
writeFileSync(values.output, JSON.stringify({
  capturedAt: new Date().toISOString(), node: process.version,
  repositoryHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  routes: routes.map(path => relative(root, path)), clientBoundaries: clients.map(path => relative(root, path)),
  apiHandlers: sources.filter(path => /\/app\/api\/.*\/route\.ts$/.test(path)).map(path => relative(root, path)),
  dependencies: packageJson.dependencies, fingerprints,
}, null, 2));
