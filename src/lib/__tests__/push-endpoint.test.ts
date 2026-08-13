import { describe, expect, it } from 'vitest';
import { isAllowedPushEndpoint } from '../push-endpoint';

describe('isAllowedPushEndpoint', () => {
  it('accepts the production endpoint shapes used by supported browsers', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/browser-token')).toBe(true);
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/browser-token')).toBe(true);
    expect(isAllowedPushEndpoint('https://web.push.apple.com/browser-token')).toBe(true);
  });

  it('rejects arbitrary hosts and endpoint variants that could widen the outbound relay', () => {
    expect(isAllowedPushEndpoint('https://attacker.example/push')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.attacker.example/fcm/send/token')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com:8443/fcm/send/token')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/token?redirect=https://attacker.example')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/')).toBe(false);
  });
});
