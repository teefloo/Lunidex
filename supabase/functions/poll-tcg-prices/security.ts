export type DnsRecordType = 'A' | 'AAAA';

export type DnsResolver = (
  hostname: string,
  recordType: DnsRecordType,
) => Promise<string[]>;

const encoder = new TextEncoder();

/**
 * The legacy worker must never become a general HTTPS relay if it is
 * re-enabled. Keep this list aligned with the browser providers accepted by
 * the current Neon push route and reject every other hostname by default.
 */
const ALLOWED_PUSH_PROVIDER_RULES = [
  { host: 'fcm.googleapis.com', pathPrefix: '/fcm/send/' },
  { host: 'updates.push.services.mozilla.com', pathPrefix: '/wpush/v2/' },
  { host: 'web.push.apple.com' },
  { host: 'api.push.apple.com' },
] as const;

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

function parseIpv6Words(address: string): number[] | null {
  let normalized = address.toLowerCase();
  if (normalized.includes('.')) {
    const separator = normalized.lastIndexOf(':');
    if (separator < 0) return null;
    const octets = normalized.slice(separator + 1).split('.').map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return null;
    }
    const highWord = ((octets[0] << 8) | octets[1]).toString(16);
    const lowWord = ((octets[2] << 8) | octets[3]).toString(16);
    normalized = `${normalized.slice(0, separator + 1)}${highWord}:${lowWord}`;
  }

  const sections = normalized.split('::');
  if (sections.length > 2) return null;
  const left = sections[0] ? sections[0].split(':') : [];
  const right = sections.length === 2 && sections[1] ? sections[1].split(':') : [];
  const words = [...left, ...right];
  if (
    words.some((word) => !/^[\da-f]{1,4}$/.test(word)) ||
    words.length > 8 ||
    (sections.length === 1 && words.length !== 8) ||
    (sections.length === 2 && words.length === 8)
  ) {
    return null;
  }

  const compressionLength = sections.length === 2 ? 8 - words.length : 0;
  const expanded = [
    ...left,
    ...Array.from({ length: compressionLength }, () => '0'),
    ...right,
  ];
  return expanded.map((word) => Number.parseInt(word, 16));
}

function ipv4FromMappedIpv6(address: string): string | null {
  const words = parseIpv6Words(address);
  if (
    !words ||
    words.length !== 8 ||
    words.slice(0, 5).some((word) => word !== 0) ||
    words[5] !== 0xffff
  ) {
    return null;
  }

  return [
    words[6] >> 8,
    words[6] & 0xff,
    words[7] >> 8,
    words[7] & 0xff,
  ].join('.');
}

function isPrivateIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    return isPrivateIpv4(normalized);
  }

  if (!normalized.includes(':')) return true;
  if (normalized === '::' || normalized === '::1') return true;
  if (/^(?:fc|fd|fe[89ab]|ff)/.test(normalized)) return true;

  const mappedIpv4 = ipv4FromMappedIpv6(normalized);
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false;
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

function isAllowedPushProvider(endpoint: URL): boolean {
  if (endpoint.port || endpoint.search || endpoint.hash) return false;

  const rule = ALLOWED_PUSH_PROVIDER_RULES.find(({ host }) => endpoint.hostname === host);
  if (!rule) return false;

  const pathPrefix = 'pathPrefix' in rule ? rule.pathPrefix : undefined;
  if (pathPrefix) {
    return endpoint.pathname.startsWith(pathPrefix)
      && endpoint.pathname.length > pathPrefix.length;
  }

  return endpoint.pathname.length > 1;
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

  if (!isAllowedPushProvider(endpoint)) return false;
  if (isPrivateHostname(endpoint.hostname)) return false;
  if (isIpLiteral(endpoint.hostname)) return !isPrivateIpAddress(endpoint.hostname);

  try {
    return await resolvesOnlyToPublicAddresses(endpoint.hostname, resolveDns);
  } catch {
    return false;
  }
}
