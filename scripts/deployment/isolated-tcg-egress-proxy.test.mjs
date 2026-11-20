import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  ALLOWED_TCG_CONNECT_AUTHORITY,
  isAllowedTcgConnect,
} from './isolated-tcg-egress-proxy.mjs';

test('egress policy permits only one exact TCGdex TLS tunnel', () => {
  assert.equal(ALLOWED_TCG_CONNECT_AUTHORITY, 'api.tcgdex.net:443');
  assert.equal(isAllowedTcgConnect('api.tcgdex.net:443', 0), true);
  assert.equal(isAllowedTcgConnect('API.TCGDEX.NET:443', 0), true);
  assert.equal(isAllowedTcgConnect('api.tcgdex.net:443', 1), false);
  assert.equal(isAllowedTcgConnect('api.tcgdex.net:80', 0), false);
  assert.equal(isAllowedTcgConnect('example.com:443', 0), false);
  assert.equal(isAllowedTcgConnect('api.tcgdex.net.evil:443', 0), false);
  assert.equal(isAllowedTcgConnect('https://api.tcgdex.net:443', 0), false);
  assert.equal(isAllowedTcgConnect(undefined, 0), false);
});

test('egress summary validator accepts only aggregate counters and blocks retries', () => {
  const valid = {
    connect_attempts: 1,
    approved_connects: 1,
    upstream_connects: 1,
    rejected_connects: 0,
    upstream_connect_errors: 0,
    blocked_http_requests: 0,
  };
  const accepted = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-egress-summary.mjs',
  ], { input: `${JSON.stringify(valid)}\n`, encoding: 'utf8' });
  assert.equal(accepted.status, 0);
  assert.deepEqual(JSON.parse(accepted.stdout), valid);

  const retry = { ...valid, connect_attempts: 2, rejected_connects: 1 };
  const rejected = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-egress-summary.mjs',
  ], { input: `${JSON.stringify(retry)}\n`, encoding: 'utf8' });
  assert.notEqual(rejected.status, 0);
  assert.equal(rejected.stderr, 'egress_summary_policy_failed\n');
  assert.equal(rejected.stdout, '');

  const noUpstreamRequest = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-egress-summary.mjs',
  ], {
    input: `${JSON.stringify({
      ...valid,
      connect_attempts: 0,
      approved_connects: 0,
      upstream_connects: 0,
    })}\n`,
    encoding: 'utf8',
  });
  assert.notEqual(noUpstreamRequest.status, 0);
  assert.equal(noUpstreamRequest.stderr, 'egress_summary_policy_failed\n');
});

test('egress summary validator never echoes a forbidden destination or payload', () => {
  const invalid = {
    connect_attempts: 1,
    approved_connects: 1,
    upstream_connects: 1,
    rejected_connects: 0,
    upstream_connect_errors: 0,
    blocked_http_requests: 0,
    destination: 'lunidex.app',
  };
  const result = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-egress-summary.mjs',
  ], { input: `${JSON.stringify(invalid)}\n`, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes('lunidex.app'), false);
  assert.equal(result.stdout, '');
});
