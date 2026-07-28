import {
  hasValidSchedulerAuthorization,
  isSafePushEndpoint,
  type DnsResolver,
} from './security.ts';

const publicDns: DnsResolver = async (_hostname, recordType) =>
  recordType === 'A' ? ['142.250.184.206'] : ['2607:f8b0:4004:c1f::5e'];

Deno.test('accepts only the exact Bearer scheduler credential', async () => {
  const secret = 'scheduler-secret';
  if (!await hasValidSchedulerAuthorization(`Bearer ${secret}`, secret)) {
    throw new Error('Expected the configured Bearer credential to be accepted');
  }
  if (await hasValidSchedulerAuthorization('Bearer wrong-secret', secret)) {
    throw new Error('Expected a wrong credential to be rejected');
  }
  if (await hasValidSchedulerAuthorization(null, secret)) {
    throw new Error('Expected a missing credential to be rejected');
  }
});

Deno.test('accepts a public HTTPS push endpoint', async () => {
  if (!await isSafePushEndpoint('https://fcm.googleapis.com/fcm/send/test', publicDns)) {
    throw new Error('Expected a public HTTPS endpoint to be accepted');
  }
});

Deno.test('rejects non-HTTPS and private push endpoints before a fetch', async () => {
  const privateDns: DnsResolver = async () => ['10.0.0.1'];
  const endpoints = [
    'http://fcm.googleapis.com/fcm/send/test',
    'https://localhost/push',
    'https://127.0.0.1/push',
    'https://[::1]/push',
    'https://attacker.example/push',
  ];
  for (const endpoint of endpoints) {
    const resolver = endpoint.includes('attacker.example') ? privateDns : publicDns;
    if (await isSafePushEndpoint(endpoint, resolver)) {
      throw new Error(`Expected ${endpoint} to be rejected`);
    }
  }
});
