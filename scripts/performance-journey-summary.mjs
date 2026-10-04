import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { before: { type: 'string' }, after: { type: 'string' }, output: { type: 'string' } } });
if (!values.before || !values.after || !values.output) throw new Error('--before --after --output required');
const rows = Object.fromEntries(['before', 'after'].map(version => [version, readFileSync(values[version], 'utf8').trim().split('\n').map(JSON.parse)]));
function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  const percentile = fraction => { const index = (sorted.length - 1) * fraction; return sorted[Math.floor(index)] + (sorted[Math.ceil(index)] - sorted[Math.floor(index)]) * (index % 1); };
  return sorted.length ? { n: sorted.length, median: percentile(.5), q1: percentile(.25), q3: percentile(.75), min: sorted[0], max: sorted.at(-1) } : { n: 0 };
}
const keys = [...new Set(rows.before.concat(rows.after).map(row => `${row.profile} ${row.name}`))];
const groups = keys.map(key => {
  const group = { key };
  for (const version of ['before', 'after']) {
    const samples = rows[version].filter(row => `${row.profile} ${row.name}` === key);
    const successful = samples.filter(row => !row.failure);
    group[version] = { samples: samples.length, failures: samples.filter(row => row.failure).length,
      resultMs: distribution(successful.map(row => row.resultMs)),
      documentInpMs: distribution(successful.map(row => row.documentInpMs)),
      visualFramesMs: distribution(successful.flatMap(row => row.visualFrames ?? []).map(frame => frame.ms)),
      detailedRequests: distribution(successful.map(row => row.requests?.filter(request => request.operation === 'GetAllPokemonDetailedPaginated').length)),
      detailedBytes: distribution(successful.map(row => row.requests?.filter(request => request.operation === 'GetAllPokemonDetailedPaginated').reduce((sum, request) => sum + (request.bytes ?? 0), 0))),
      errors: samples.flatMap(row => row.errors ?? []) };
  }
  return group;
});
const comparisons = [];
for (const after of rows.after.filter(row => row.results)) {
  const before = rows.before.find(row => row.profile === after.profile && row.run === after.run && row.name === after.name);
  const normalize = results => results.filter(value => typeof value === 'string' || value?.text).map(value => typeof value === 'string' ? value : ({ text: value.text, href: value.href })).slice(0, 20);
  comparisons.push({ profile: after.profile, run: after.run, name: after.name, equal: Boolean(before) && JSON.stringify(normalize(before.results)) === JSON.stringify(normalize(after.results)) });
}
writeFileSync(values.output, JSON.stringify({ note: 'Result latency excludes failed actions; failures are separate. INP is cumulative for the current document, not the per-action result time. Two-rAF visual samples are proxies. Compare the first 20 named catalog results, excluding ancillary links.', groups, comparisons }, null, 2));
console.log(JSON.stringify({ groups: groups.length, resultMismatches: comparisons.filter(row => !row.equal), failures: { before: rows.before.filter(row => row.failure).length, after: rows.after.filter(row => row.failure).length } }, null, 2));
