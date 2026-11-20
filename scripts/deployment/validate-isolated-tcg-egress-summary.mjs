const MAX_LINE_BYTES = 1024;
const expectedPolicy = process.argv[2];
const expectedKeys = [
  'policy',
  'connect_attempts',
  'approved_connects',
  'upstream_connects',
  'rejected_connects',
  'upstream_connect_errors',
  'blocked_http_requests',
  'tcgdex_connects',
  'pokeapi_connects',
  'graphql_pokeapi_connects',
];
const authorityCounters = ['tcgdex_connects', 'pokeapi_connects', 'graphql_pokeapi_connects'];

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (Buffer.byteLength(input) > MAX_LINE_BYTES) {
    process.stderr.write('egress_summary_exceeds_size_limit\n');
    process.exit(78);
  }
}

const lines = input.trimEnd().split(/\r?\n/);
let summary;
try {
  if (lines.length !== 1 || !lines[0]) throw new Error();
  summary = JSON.parse(lines[0]);
} catch {
  process.stderr.write('egress_summary_invalid\n');
  process.exit(78);
}

const validPolicy = expectedPolicy === 'tcg' || expectedPolicy === 'pokemon';
const countersAreSafe = summary
  && expectedKeys.slice(1).every((key) => Number.isSafeInteger(summary[key]) && summary[key] >= 0);
const authorityTotal = summary && authorityCounters.reduce((sum, key) => sum + summary[key], 0);
let policyBounds = false;
if (summary?.policy === 'tcg') {
  policyBounds = summary.tcgdex_connects === 1
    && summary.pokeapi_connects === 0
    && summary.graphql_pokeapi_connects === 0;
} else if (summary?.policy === 'pokemon') {
  policyBounds = summary.tcgdex_connects === 0
    && summary.pokeapi_connects >= 1
    && summary.pokeapi_connects <= 8
    && summary.graphql_pokeapi_connects >= 1
    && summary.graphql_pokeapi_connects <= 2;
}

if (
  !summary
  || !validPolicy
  || summary.policy !== expectedPolicy
  || Object.keys(summary).length !== expectedKeys.length
  || Object.keys(summary).some((key) => !expectedKeys.includes(key))
  || !countersAreSafe
  || !policyBounds
  || summary.connect_attempts !== summary.approved_connects + summary.rejected_connects
  || summary.upstream_connects !== summary.approved_connects
  || authorityTotal !== summary.approved_connects
  || summary.rejected_connects !== 0
  || summary.upstream_connect_errors !== 0
  || summary.blocked_http_requests !== 0
) {
  process.stderr.write('egress_summary_policy_failed\n');
  process.exit(78);
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
