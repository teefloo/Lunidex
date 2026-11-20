import { validateOutput } from './isolated-tcg-rsc-load.mjs';

const expectedPhase = process.argv[2];
const MAX_LINE_BYTES = 16 * 1024;

if (!['full', 'abort'].includes(expectedPhase)) {
  process.stderr.write('invalid_expected_phase\n');
  process.exit(78);
}

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (Buffer.byteLength(input) > MAX_LINE_BYTES) {
    process.stderr.write('summary_exceeds_size_limit\n');
    process.exit(78);
  }
}

const lines = input.trimEnd().split(/\r?\n/);
if (lines.length !== 1 || lines[0].length === 0) {
  process.stderr.write('summary_must_be_one_json_line\n');
  process.exit(78);
}

let summary;
try {
  summary = JSON.parse(lines[0]);
} catch {
  process.stderr.write('summary_is_not_json\n');
  process.exit(78);
}

if (!validateOutput(summary) || summary.phase !== expectedPhase) {
  process.stderr.write('summary_validation_failed\n');
  process.exit(78);
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
if (summary.statuses['2xx'] === 0) process.exitCode = 1;
