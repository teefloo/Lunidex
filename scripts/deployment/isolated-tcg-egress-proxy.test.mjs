import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  ALLOWED_TCG_CONNECT_AUTHORITY,
  CONNECT_POLICIES,
  getConnectRule,
  isAllowedConnect,
  isAllowedTcgConnect,
} from './isolated-tcg-egress-proxy.mjs';

function runValidator(summary, policy) {
  return spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-egress-summary.mjs',
    policy,
  ], { input: `${JSON.stringify(summary)}\n`, encoding: 'utf8' });
}

function tcgSummary(overrides = {}) {
  return {
    policy: 'tcg',
    connect_attempts: 1,
    approved_connects: 1,
    upstream_connects: 1,
    rejected_connects: 0,
    upstream_connect_errors: 0,
    blocked_http_requests: 0,
    tcgdex_connects: 1,
    pokeapi_connects: 0,
    graphql_pokeapi_connects: 0,
    ...overrides,
  };
}

function pokemonSummary(overrides = {}) {
  return {
    policy: 'pokemon',
    connect_attempts: 4,
    approved_connects: 4,
    upstream_connects: 4,
    rejected_connects: 0,
    upstream_connect_errors: 0,
    blocked_http_requests: 0,
    tcgdex_connects: 0,
    pokeapi_connects: 3,
    graphql_pokeapi_connects: 1,
    ...overrides,
  };
}

test('TCG policy allows only one exact TCGdex TLS tunnel', () => {
  assert.equal(ALLOWED_TCG_CONNECT_AUTHORITY, 'api.tcgdex.net:443');
  assert.equal(getConnectRule('api.tcgdex.net:443', 'tcg')?.host, 'api.tcgdex.net');
  assert.equal(isAllowedTcgConnect('api.tcgdex.net:443', 0), true);
  assert.equal(isAllowedTcgConnect('API.TCGDEX.NET:443', 0), true);
  assert.equal(isAllowedTcgConnect('api.tcgdex.net:443', 1), false);
  assert.equal(isAllowedTcgConnect('api.tcgdex.net:80', 0), false);
  assert.equal(isAllowedTcgConnect('example.com:443', 0), false);
  assert.equal(isAllowedTcgConnect('api.tcgdex.net.evil:443', 0), false);
  assert.equal(isAllowedTcgConnect('https://api.tcgdex.net:443', 0), false);
  assert.equal(isAllowedTcgConnect(undefined, 0), false);
  assert.equal(isAllowedConnect('pokeapi.co:443', { pokeapi_connects: 0 }, 'tcg'), false);
});

test('Pokemon policy caps only the two fixed upstream authorities', () => {
  assert.deepEqual(Object.keys(CONNECT_POLICIES.pokemon).sort(), [
    'graphql.pokeapi.co:443',
    'pokeapi.co:443',
  ]);
  assert.equal(getConnectRule('POKEAPI.CO:443', 'pokemon')?.host, 'pokeapi.co');
  assert.equal(getConnectRule('graphql.pokeapi.co:443', 'pokemon')?.host, 'graphql.pokeapi.co');
  assert.equal(getConnectRule('api.tcgdex.net:443', 'pokemon'), null);

  const counts = { pokeapi_connects: 0, graphql_pokeapi_connects: 0 };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.equal(isAllowedConnect('pokeapi.co:443', counts, 'pokemon'), true);
    counts.pokeapi_connects += 1;
  }
  assert.equal(isAllowedConnect('pokeapi.co:443', counts, 'pokemon'), false);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    assert.equal(isAllowedConnect('graphql.pokeapi.co:443', counts, 'pokemon'), true);
    counts.graphql_pokeapi_connects += 1;
  }
  assert.equal(isAllowedConnect('graphql.pokeapi.co:443', counts, 'pokemon'), false);
  assert.equal(isAllowedConnect('pokeapi.co:80', counts, 'pokemon'), false);
  assert.equal(isAllowedConnect('pokeapi.co.evil:443', counts, 'pokemon'), false);
  assert.equal(isAllowedConnect('https://pokeapi.co:443', counts, 'pokemon'), false);
  assert.equal(isAllowedConnect('pokeapi.co:443', counts, 'unknown'), false);
});

test('proxy process refuses an unknown egress policy before listening', () => {
  const result = spawnSync(process.execPath, [
    'scripts/deployment/isolated-tcg-egress-proxy.mjs',
  ], {
    encoding: 'utf8',
    env: { ...process.env, ISOLATED_EGRESS_POLICY: 'arbitrary' },
  });
  assert.equal(result.status, 78);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'egress_policy_invalid=true\n');
});

test('egress summary validator enforces the selected authority caps and fails closed', () => {
  const tcgAccepted = runValidator(tcgSummary(), 'tcg');
  assert.equal(tcgAccepted.status, 0);
  assert.deepEqual(JSON.parse(tcgAccepted.stdout), tcgSummary());

  const pokemonAccepted = runValidator(pokemonSummary(), 'pokemon');
  assert.equal(pokemonAccepted.status, 0);
  assert.deepEqual(JSON.parse(pokemonAccepted.stdout), pokemonSummary());

  const reject = (summary, policy = summary.policy) => {
    const result = runValidator(summary, policy);
    assert.notEqual(result.status, 0);
    assert.equal(result.stderr, 'egress_summary_policy_failed\n');
    assert.equal(result.stdout, '');
  };

  reject(tcgSummary({ connect_attempts: 2, rejected_connects: 1 }));
  reject(tcgSummary({ connect_attempts: 0, approved_connects: 0, upstream_connects: 0, tcgdex_connects: 0 }));
  reject(pokemonSummary({ pokeapi_connects: 9, approved_connects: 10, upstream_connects: 10 }));
  reject(pokemonSummary({ graphql_pokeapi_connects: 3, approved_connects: 6, upstream_connects: 6 }));
  reject(pokemonSummary({ graphql_pokeapi_connects: 0, approved_connects: 3, upstream_connects: 3 }));
  reject(pokemonSummary({ tcgdex_connects: 1, approved_connects: 5, upstream_connects: 5 }));
  reject(pokemonSummary(), 'tcg');
  reject(tcgSummary(), 'pokemon');
});

test('egress summary validator never echoes forbidden destinations or payloads', () => {
  const result = runValidator({
    ...pokemonSummary(),
    destination: 'https://lunidex.app/?token=private',
  }, 'pokemon');
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes('lunidex.app'), false);
  assert.equal(result.stderr.includes('private'), false);
  assert.equal(result.stdout, '');
});
