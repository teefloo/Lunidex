export type DnsRecordType = 'A' | 'AAAA';

export type DnsResolver = (
  hostname: string,
  recordType: DnsRecordType,
) => Promise<string[]>;

const encoder = new TextEncoder();

/**
 * Compare scheduler credentials without leaking the first mismatching byte.
 * Hashing also gives both inputs a fixed-size representation before comparison.
 */
export async function hasValidSchedulerAuthorization(
  authorization: string | null,
  secret: string,
): Promise<boolean> {
  const expected = `Bearer ${secret}`;
  const received = authorization ?? '';
  const [expectedHash, receivedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
  ]);

  const expectedBytes = new Uint8Array(expectedHash);
  const receivedBytes = new Uint8Array(receivedHash);
  let difference = expected.length ^ received.length;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ receivedBytes[index];
  }
  return difference === 0;
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19 || second === 51)) ||
    (first === 203 && second === 0)
  );
}

function isPrivateIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    return isPrivateIpv4(normalized);
  }

  if (!normalized.includes(':')) return true;
  if (normalized === '::' || normalized === '::1') return true;
  if (/^(?:fc|fd|fe[89ab]|ff)/.test(normalized)) return true;

  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4[1]) : false;
}

function isIpLiteral(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '');
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized) || normalized.includes(':');
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized === 'metadata.google.internal'
  );
}

async function defaultDnsResolver(
  hostname: string,
  recordType: DnsRecordType,
): Promise<string[]> {
  return Deno.resolveDns(hostname, recordType);
}

async function resolvesOnlyToPublicAddresses(
  hostname: string,
  resolveDns: DnsResolver,
): Promise<boolean> {
  // This is a fail-closed preflight check, not DNS pinning: fetch performs its
  // own resolution, so a hostile DNS zone could rebind after this lookup. A
  // provider-host allowlist or network-layer egress controls are required to
  // eliminate that residual DNS-rebinding risk without rejecting valid future
  // browser Push providers.
  const results = await Promise.allSettled([
    resolveDns(hostname, 'A'),
    resolveDns(hostname, 'AAAA'),
  ]);
  const addresses = results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );

  return addresses.length > 0 && addresses.every((address) => !isPrivateIpAddress(address));
}

/**
 * Browser Push endpoints are HTTPS URLs. Validate the stored endpoint again
 * at send time because the service-role worker must not trust user JSON.
 */
export async function isSafePushEndpoint(
  rawEndpoint: string,
  resolveDns: DnsResolver = defaultDnsResolver,
): Promise<boolean> {
  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint);
  } catch {
    return false;
  }

  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    !endpoint.hostname
  ) {
    return false;
  }

  if (isPrivateHostname(endpoint.hostname)) return false;
  if (isIpLiteral(endpoint.hostname)) return !isPrivateIpAddress(endpoint.hostname);

  try {
    return await resolvesOnlyToPublicAddresses(endpoint.hostname, resolveDns);
  } catch {
    return false;
  }
}
