import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function classify(input) {
  const result = spawnSync(process.execPath, [
    'scripts/deployment/classify-isolated-node-logs.mjs',
  ], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('classifies a V8 heap fatal without echoing raw logs or secrets', () => {
  const secret = 'database_url=postgres://private-do-not-print';
  const result = classify(`warning ${secret}\nFATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\n`);
  assert.equal(result.fatal_category, 'v8_heap_oom');
  assert.equal(result.v8_heap_oom_seen, true);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test('distinguishes kernel/container OOM and ordinary Node fatal signatures', () => {
  assert.equal(classify('Out of memory: Killed process 123 (node) total-vm:100kB\n').fatal_category, 'kernel_or_container_oom');
  assert.equal(classify('FATAL ERROR: invalid array length\n').fatal_category, 'node_fatal');
  assert.equal(classify('node:internal/process/promises: unhandled promise rejection\n').fatal_category, 'uncaught_exception');
  assert.equal(classify('Aborted (core dumped)\n').fatal_category, 'abort_or_assertion');
  assert.equal(classify('Server started on port 3000\n').fatal_category, 'none');
});

test('bounds retained log bytes and reports truncation without content', () => {
  const input = `${'x'.repeat(1_048_576 + 128)}\nFATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`;
  const result = classify(input);
  assert.equal(result.inspected_bytes, 1_048_576);
  assert.equal(result.input_was_truncated, true);
  assert.equal(result.fatal_category, 'v8_heap_oom');
  assert.equal(Object.keys(result).includes('raw'), false);
});
