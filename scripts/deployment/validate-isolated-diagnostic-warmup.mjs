import { validateWarmupSummary } from './warm-isolated-diagnostic-route.mjs';

const expectedTarget = process.argv[2];
const MAX_LINE_BYTES = 1024;

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (Buffer.byteLength(input) > MAX_LINE_BYTES) {
    process.stderr.write('warmup_summary_exceeds_size_limit\n');
    process.exit(78);
  }
}

const lines = input.trimEnd().split(/\r?\n/);
let summary;
try {
  if (lines.length !== 1 || !lines[0]) throw new Error();
  summary = JSON.parse(lines[0]);
} catch {
  process.stderr.write('warmup_summary_invalid\n');
  process.exit(78);
}

if (!validateWarmupSummary(summary, expectedTarget)) {
  process.stderr.write('warmup_summary_policy_failed\n');
  process.exit(78);
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
