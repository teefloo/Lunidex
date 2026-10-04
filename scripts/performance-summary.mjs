import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  before: { type: 'string' }, after: { type: 'string' }, output: { type: 'string' },
} });
if (!values.before || !values.after || !values.output) throw new Error('Required: --before --after --output');
const quantile = (sorted, fraction) => {
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
};
function distribution(input) {
  const sorted = input.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return { n: 0, median: null, q1: null, q3: null, min: null, max: null };
  return { n: sorted.length, median: quantile(sorted, .5), q1: quantile(sorted, .25), q3: quantile(sorted, .75), min: sorted[0], max: sorted.at(-1) };
}
function metrics(row) {
  const start = row.requests.find(request => request.type === 'Document')?.start ?? row.requests[0]?.start;
  const complete = row.requests.filter(request => typeof request.bytes === 'number');
  const bytes = type => complete.filter(request => request.type === type).reduce((total, request) => total + request.bytes, 0);
  const inWindow = complete.filter(request => (request.start - start) * 1000 + request.durationMs <= 15000);
  const bytes15 = type => inWindow.filter(request => request.type === type).reduce((total, request) => total + request.bytes, 0);
  const tasks = (row.metrics?.longTasks ?? []).filter(task => task.start < 15000);
  return {
    ttfbMs: row.metrics?.ttfbMs, lcpMs: row.metrics?.vitals?.LCP?.value,
    cls: row.metrics?.vitals?.CLS?.value, readinessMs: row.readinessMs,
    javascriptBytes: bytes('Script'), cssBytes: bytes('Stylesheet'), imageBytes: bytes('Image'), fontBytes: bytes('Font'),
    javascriptBytes15s: bytes15('Script'), cssBytes15s: bytes15('Stylesheet'), imageBytes15s: bytes15('Image'),
    requests: row.requests.length, unfinishedRequests: row.requests.length - complete.length,
    longTasks15s: tasks.length, longTaskDuration15s: tasks.reduce((sum, task) => sum + task.duration, 0),
    maxLongTask15s: Math.max(0, ...tasks.map(task => task.duration)), observedMs: row.observedMs,
  };
}
const groups = new Map();
for (const version of ['before', 'after']) {
  for (const line of readFileSync(values[version], 'utf8').trim().split('\n')) {
    const row = JSON.parse(line);
    const key = `${row.profile} ${row.pathname} ${row.mode}`;
    if (!groups.has(key)) groups.set(key, {});
    const group = groups.get(key);
    (group[version] ??= []).push(row);
  }
}
const summary = [...groups].map(([key, versions]) => {
  const result = { key };
  for (const version of ['before', 'after']) {
    const rows = versions[version] ?? [];
    const samples = rows.map(metrics);
    result[version] = {
      samples: rows.length, failures: rows.filter(row => row.failure).length,
      non200: rows.filter(row => row.status !== 200).length, errors: rows.flatMap(row => row.errors),
      metrics: Object.fromEntries(Object.keys(samples[0] ?? {}).map(name => [name, distribution(samples.map(row => row[name]))])),
    };
  }
  return result;
});
writeFileSync(values.output, JSON.stringify({ note: 'Bytes include only completed requests. Readiness is a DOM/image proxy; missing values are failures. No load-only INP. Long tasks use the first 15 seconds.', groups: summary }, null, 2));
console.log(`Summarized ${summary.length} groups`);
