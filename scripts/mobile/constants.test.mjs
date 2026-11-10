import assert from 'node:assert/strict';
import test from 'node:test';

import { isAvailablePhysicalDevice } from './constants.mjs';

test('accepts Xcode device records with the current platform identifier shape', () => {
  assert.equal(isAvailablePhysicalDevice({
    platform: 'com.apple.platform.iphoneos',
    simulator: false,
    available: true,
  }), true);
});

test('continues to accept the legacy physical iOS device shape', () => {
  assert.equal(isAvailablePhysicalDevice({
    platformIdentifier: 'com.apple.platform.iphoneos',
    simulator: false,
    available: true,
  }), true);
  assert.equal(isAvailablePhysicalDevice({
    platform: 'iOS',
    simulator: false,
    available: true,
  }), true);
});

test('excludes simulators and unavailable devices', () => {
  assert.equal(isAvailablePhysicalDevice({
    platform: 'com.apple.platform.iphoneos',
    simulator: true,
    available: true,
  }), false);
  assert.equal(isAvailablePhysicalDevice({
    platform: 'com.apple.platform.iphoneos',
    simulator: false,
    available: false,
  }), false);
});
