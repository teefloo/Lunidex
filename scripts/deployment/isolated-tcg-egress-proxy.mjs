import { createServer } from 'node:http';
import { connect } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CONNECT_POLICIES = Object.freeze({
  tcg: Object.freeze({
    'api.tcgdex.net:443': Object.freeze({ host: 'api.tcgdex.net', counter: 'tcgdex_connects', cap: 1 }),
  }),
  pokemon: Object.freeze({
    'pokeapi.co:443': Object.freeze({ host: 'pokeapi.co', counter: 'pokeapi_connects', cap: 8 }),
    'graphql.pokeapi.co:443': Object.freeze({ host: 'graphql.pokeapi.co', counter: 'graphql_pokeapi_connects', cap: 2 }),
  }),
});
export const ALLOWED_TCG_CONNECT_AUTHORITY = 'api.tcgdex.net:443';

export function getConnectRule(authority, policy = 'tcg') {
  if (typeof authority !== 'string') return null;
  const rules = CONNECT_POLICIES[policy];
  if (!rules) return null;
  return rules[authority.toLowerCase()] ?? null;
}

export function isAllowedConnect(authority, approvedCounts, policy = 'tcg') {
  const rule = getConnectRule(authority, policy);
  if (!rule) return false;
  const approved = approvedCounts?.[rule.counter] ?? 0;
  return Number.isSafeInteger(approved) && approved >= 0 && approved < rule.cap;
}

export function isAllowedTcgConnect(authority, approvedConnects) {
  return isAllowedConnect(authority, { tcgdex_connects: approvedConnects }, 'tcg');
}

const policy = process.env.ISOLATED_EGRESS_POLICY ?? 'tcg';
const counters = {
  policy,
  connect_attempts: 0,
  approved_connects: 0,
  upstream_connects: 0,
  rejected_connects: 0,
  upstream_connect_errors: 0,
  blocked_http_requests: 0,
  tcgdex_connects: 0,
  pokeapi_connects: 0,
  graphql_pokeapi_connects: 0,
};
const sockets = new Set();
let shuttingDown = false;
let reported = false;

const server = createServer((_request, response) => {
  counters.blocked_http_requests += 1;
  response.writeHead(403, { connection: 'close' });
  response.end();
});

server.on('connect', (request, client, head) => {
  counters.connect_attempts += 1;
  const rule = getConnectRule(request.url, policy);
  if (!rule || !isAllowedConnect(request.url, counters, policy)) {
    counters.rejected_connects += 1;
    client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }

  counters.approved_connects += 1;
  counters[rule.counter] += 1;
  client.pause();
  sockets.add(client);
  client.once('close', () => sockets.delete(client));
  client.once('error', () => undefined);

  // Destination hosts are taken from the fixed policy table, never from the
  // incoming CONNECT request, so the proxy cannot be redirected arbitrarily.
  const upstream = connect({ host: rule.host, port: 443 });
  let established = false;
  sockets.add(upstream);
  upstream.once('close', () => sockets.delete(upstream));
  upstream.on('error', () => {
    if (established) {
      client.destroy();
      return;
    }
    counters.upstream_connect_errors += 1;
    client.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
  });
  upstream.once('connect', () => {
    established = true;
    counters.upstream_connects += 1;
    if (shuttingDown) {
      client.destroy();
      upstream.destroy();
      return;
    }
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length > 0) upstream.write(head);
    client.pipe(upstream);
    upstream.pipe(client);
    client.resume();
  });
});

server.on('clientError', (_error, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const socket of sockets) socket.destroy();
  const report = () => {
    if (reported) return;
    reported = true;
    process.stdout.write(`${JSON.stringify(counters)}\n`, () => process.exit(0));
  };
  server.close(() => {
    report();
  });
  setTimeout(report, 1_000).unref();
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  if (!Object.hasOwn(CONNECT_POLICIES, policy)) {
    process.stderr.write('egress_policy_invalid=true\n');
    process.exit(78);
  }
  server.listen(3128, '0.0.0.0');
}
