import { createServer } from 'node:http';
import { connect } from 'node:net';

export const ALLOWED_TCG_CONNECT_AUTHORITY = 'api.tcgdex.net:443';

export function isAllowedTcgConnect(authority, approvedConnects) {
  return typeof authority === 'string'
    && authority.toLowerCase() === ALLOWED_TCG_CONNECT_AUTHORITY
    && approvedConnects === 0;
}

const counters = {
  connect_attempts: 0,
  approved_connects: 0,
  upstream_connects: 0,
  rejected_connects: 0,
  upstream_connect_errors: 0,
  blocked_http_requests: 0,
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
  if (!isAllowedTcgConnect(request.url, counters.approved_connects)) {
    counters.rejected_connects += 1;
    client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }

  counters.approved_connects += 1;
  client.pause();
  sockets.add(client);
  client.once('close', () => sockets.delete(client));
  client.once('error', () => undefined);

  const upstream = connect({ host: 'api.tcgdex.net', port: 443 });
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

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(3128, '0.0.0.0');
}
