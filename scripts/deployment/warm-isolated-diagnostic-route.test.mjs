import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DIAGNOSTIC_TARGETS } from './isolated-tcg-rsc-load.mjs';
import {
  MAX_WARMUP_BODY_BYTES,
  WARMUP_TARGETS,
  getWarmupPlan,
  validateWarmupSummary,
  warmDiagnosticRoute,
} from './warm-isolated-diagnostic-route.mjs';

test('warmup plans pin each target, policy, content type, and bounded timeout', () => {
  assert.deepEqual(Object.keys(WARMUP_TARGETS).sort(), Object.keys(DIAGNOSTIC_TARGETS).sort());
  for (const [target, plan] of Object.entries(WARMUP_TARGETS)) {
    assert.equal(plan.url, DIAGNOSTIC_TARGETS[target]);
    assert.ok(plan.timeoutMs > 0 && plan.timeoutMs <= 125_000);
  }
  assert.deepEqual(getWarmupPlan('pokemon-detail'), {
    url: 'http://127.0.0.1:3000/en/pokemon/pikachu',
    egressPolicy: 'pokemon',
    timeoutMs: 125_000,
    expectedContent: 'html',
  });
  assert.equal(getWarmupPlan('tcg-card').url, 'http://127.0.0.1:3000/en/tcg/cards/base1-4?tcgLang=en');
  assert.equal(getWarmupPlan('home').egressPolicy, 'none');
  assert.equal(getWarmupPlan('healthz').egressPolicy, 'none');
  assert.equal(getWarmupPlan('https://lunidex.app'), null);
});

test('warmup fetches the fixed Pokémon route once with JSON accept and a 125-second cap', async () => {
  let calls = 0;
  let requestedUrl = '';
  let requestInit;
  const result = await warmDiagnosticRoute({
    target: 'pokemon-detail',
    egressPolicy: 'pokemon',
    fetchImpl: async (url, init) => {
      calls += 1;
      requestedUrl = url;
      requestInit = init;
      return new Response('<html>pokemon</html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    },
  });

  assert.equal(calls, 1);
  assert.equal(requestedUrl, 'http://127.0.0.1:3000/en/pokemon/pikachu');
  assert.equal(requestInit.headers.accept, 'application/json');
  assert.equal(result.target, 'pokemon-detail');
  assert.equal(result.status, 200);
  assert.equal(result.html, true);
  assert.equal(result.json, false);
  assert.ok(result.bytes > 0);
  assert.equal(validateWarmupSummary(result, 'pokemon-detail'), true);
  assert.ok(WARMUP_TARGETS['pokemon-detail'].timeoutMs <= 125_000);
});

test('local-only warmups use the selected fixed home or health route', async () => {
  for (const [target, contentType, body] of [
    ['home', 'text/html', '<html>home</html>'],
    ['healthz', 'application/json', '{"status":"ok"}'],
  ]) {
    let requestedUrl = '';
    const result = await warmDiagnosticRoute({
      target,
      egressPolicy: 'none',
      fetchImpl: async (url) => {
        requestedUrl = url;
        return new Response(body, { status: 200, headers: { 'content-type': contentType } });
      },
    });
    assert.equal(requestedUrl, DIAGNOSTIC_TARGETS[target]);
    assert.equal(validateWarmupSummary(result, target), true);
  }
});

test('warmup rejects invalid target or mismatched policy before requesting any route', async () => {
  let fetchCalled = false;
  const fetchImpl = async () => {
    fetchCalled = true;
    return new Response('<html>unexpected</html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };

  await assert.rejects(
    warmDiagnosticRoute({ target: 'https://lunidex.app', egressPolicy: 'pokemon', fetchImpl }),
    (error) => error.category === 'warmup_configuration_invalid',
  );
  await assert.rejects(
    warmDiagnosticRoute({ target: 'pokemon-detail', egressPolicy: 'tcg', fetchImpl }),
    (error) => error.category === 'warmup_configuration_invalid',
  );
  assert.equal(fetchCalled, false);

  const invalidMain = spawnSync(process.execPath, ['--input-type=module', '-'], {
    input: readFileSync(new URL('./warm-isolated-diagnostic-route.mjs', import.meta.url), 'utf8'),
    encoding: 'utf8',
    env: {
      ...process.env,
      ISOLATED_TCG_TARGET: 'https://lunidex.app',
      ISOLATED_EGRESS_POLICY: 'pokemon',
    },
  });
  assert.equal(invalidMain.status, 78);
  assert.equal(invalidMain.stdout, '');
  assert.equal(invalidMain.stderr, 'diagnostic_warmup_error_category=warmup_configuration_invalid\n');
});

test('warmup fails closed on non-200, non-HTML pages, empty bodies, and oversized bodies', async () => {
  const badResponses = [
    new Response('<html>not found</html>', { status: 404, headers: { 'content-type': 'text/html' } }),
    new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }),
    new Response('', { status: 200, headers: { 'content-type': 'text/html' } }),
    new Response(new Uint8Array(MAX_WARMUP_BODY_BYTES + 1), { status: 200, headers: { 'content-type': 'text/html' } }),
  ];
  for (const response of badResponses) {
    await assert.rejects(
      warmDiagnosticRoute({ target: 'pokemon-detail', egressPolicy: 'pokemon', fetchImpl: async () => response }),
      (error) => ['warmup_body_too_large', 'warmup_response_invalid'].includes(error.category),
    );
  }
  assert.equal(validateWarmupSummary({ target: 'pokemon-detail', status: 302, html: true, json: false, bytes: 1 }, 'pokemon-detail'), false);
  assert.equal(validateWarmupSummary({ target: 'pokemon-detail', status: 200, html: true, json: false, bytes: 0 }, 'pokemon-detail'), false);
});

test('workflow gates egress proxy by target and stops warm containers before isolated load', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/diagnose-isolated-tcg-aborts.yml', import.meta.url), 'utf8');
  const warmupSource = readFileSync(new URL('./warm-isolated-diagnostic-route.mjs', import.meta.url), 'utf8');
  assert.match(workflow, /- pokemon-detail/);
  assert.match(workflow, /pokemon-detail\)[\s\S]*?egress_policy=pokemon/);
  assert.match(warmupSource, /timeoutMs: 125_000/);
  assert.match(workflow, /healthz\|home\)[\s\S]*?egress_policy=none/);
  assert.match(workflow, /if \[\[ "\$ISOLATED_EGRESS_POLICY" != none \]\]/);
  assert.match(workflow, /ISOLATED_EGRESS_POLICY=\$ISOLATED_EGRESS_POLICY/);
  assert.match(workflow, /validate-isolated-diagnostic-warmup\.mjs/);
  assert.match(workflow, /validate-isolated-tcg-egress-summary\.mjs "\$ISOLATED_EGRESS_POLICY"/);
  assert.match(workflow, /timeout 130s docker exec/);
  assert.ok(workflow.indexOf('docker stop --time 2 "$WARM_CONTAINER"') < workflow.indexOf('Run full-response and client-abort phases with egress disabled'));
});

test('host-side warmup validator accepts only a valid fixed-target result', () => {
  const valid = {
    target: 'pokemon-detail',
    status: 200,
    html: true,
    json: false,
    bytes: 15,
  };
  const accepted = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-diagnostic-warmup.mjs',
    'pokemon-detail',
  ], { input: `${JSON.stringify(valid)}\n`, encoding: 'utf8' });
  assert.equal(accepted.status, 0);
  assert.deepEqual(JSON.parse(accepted.stdout), valid);

  const invalid = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-diagnostic-warmup.mjs',
    'pokemon-detail',
  ], { input: `${JSON.stringify({ ...valid, target: 'https://lunidex.app' })}\n`, encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stderr, 'warmup_summary_policy_failed\n');
  assert.equal(invalid.stdout, '');
  assert.equal(invalid.stderr.includes('lunidex.app'), false);
});
