/**
 * Web Push endpoints are supplied by a browser's PushManager, but they are
 * subsequently used by the server as outbound HTTPS destinations. Keep the
 * accepted providers deliberately narrow so a user cannot turn the push
 * routes into a general HTTPS relay.
 *
 * These are the production endpoint shapes emitted by the browsers currently
 * supported by Lunidex: Chromium/Chrome (FCM), Firefox (Autopush), and Safari
 * (Apple Web Push). Unknown providers fail closed; add a narrowly scoped rule
 * here only after reviewing the provider's ownership and endpoint format.
 */
const ALLOWED_ENDPOINT_RULES = [
  { host: 'fcm.googleapis.com', pathPrefix: '/fcm/send/' },
  { host: 'updates.push.services.mozilla.com', pathPrefix: '/wpush/v2/' },
  { host: 'web.push.apple.com' },
  { host: 'api.push.apple.com' },
] as const;

const MAX_PUSH_ENDPOINT_LENGTH = 2048;

/**
 * Returns true only for a production Web Push endpoint that the server is
 * explicitly prepared to contact.
 */
export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PUSH_ENDPOINT_LENGTH) {
    return false;
  }

  // URL parsing trims surrounding whitespace. Reject it before parsing so the
  // value used for the ownership lookup is exactly the value we validated.
  if (value.trim() !== value) return false;

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return false;
  }

  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.port ||
    endpoint.search ||
    endpoint.hash
  ) {
    return false;
  }

  const rule = ALLOWED_ENDPOINT_RULES.find(({ host }) => endpoint.hostname === host);
  if (!rule) return false;

  // Every supported provider puts a subscription token after the provider's
  // endpoint prefix. Apple uses a provider-specific path without a stable
  // prefix, so only reject its root path here.
  const pathPrefix = 'pathPrefix' in rule ? rule.pathPrefix : undefined;
  if (pathPrefix) {
    return endpoint.pathname.startsWith(pathPrefix) && endpoint.pathname.length > pathPrefix.length;
  }
  return endpoint.pathname.length > 1;
}
