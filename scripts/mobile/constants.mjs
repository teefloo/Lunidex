import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const appiumHome = path.join(projectRoot, 'node_modules', '.cache', 'appium');
export const appiumBin = path.join(projectRoot, 'node_modules', '.bin', 'appium');
export const nextBin = path.join(projectRoot, 'node_modules', '.bin', 'next');
export const playwrightBin = path.join(projectRoot, 'node_modules', '.bin', 'playwright');
export const mobileArtifactsDir = path.resolve(
  process.env.MOBILE_ARTIFACTS_DIR || path.join(projectRoot, 'test-results', 'mobile'),
);

const defaultXcodeDeveloperDir = '/Applications/Xcode.app/Contents/Developer';

export function withXcodeEnvironment(extra = {}) {
  const developerDir = process.env.MOBILE_DEVELOPER_DIR
    || (existsSync(defaultXcodeDeveloperDir) ? defaultXcodeDeveloperDir : process.env.DEVELOPER_DIR);
  return {
    ...process.env,
    ...(developerDir ? { DEVELOPER_DIR: developerDir } : {}),
    ...extra,
  };
}

export function withAppiumEnvironment(extra = {}) {
  return withXcodeEnvironment({
    APPIUM_HOME: process.env.MOBILE_APPIUM_HOME || appiumHome,
    APPIUM_XCUITEST_PREFER_DEVICECTL: process.env.APPIUM_XCUITEST_PREFER_DEVICECTL || 'true',
    ...extra,
  });
}

export function getPrivateIpv4Address() {
  const interfaces = os.networkInterfaces();
  const preferredNames = ['en0', 'en1'];
  const candidates = Object.entries(interfaces)
    .flatMap(([name, addresses]) => (addresses ?? [])
      .filter((address) => address.family === 'IPv4' && !address.internal && isPrivateIpv4(address.address))
      .map((address) => ({ name, address: address.address })));

  for (const preferred of preferredNames) {
    const candidate = candidates.find(({ name }) => name === preferred);
    if (candidate) return candidate.address;
  }
  return candidates[0]?.address;
}

function isPrivateIpv4(value) {
  const octets = value.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

export function getDeviceRecords() {
  const result = run('xcrun', ['xcdevice', 'list', '--timeout', '8'], { env: withXcodeEnvironment() });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Xcode device discovery failed.');
  }
  const records = JSON.parse(result.stdout);
  if (!Array.isArray(records)) throw new Error('xcrun xcdevice returned an unexpected device list.');
  return records.filter(isAvailablePhysicalDevice);
}

export function isAvailablePhysicalDevice(record) {
  const isIosDevice = record.platform === 'iOS'
    || record.platform === 'com.apple.platform.iphoneos'
    || record.platformIdentifier === 'com.apple.platform.iphoneos';
  return isIosDevice && record.simulator !== true && record.available === true;
}

export function chooseDevice(records) {
  const requestedUdid = process.env.APPIUM_UDID;
  if (requestedUdid) {
    const match = records.find((record) => record.identifier === requestedUdid);
    if (!match) throw new Error('APPIUM_UDID does not match an available, paired physical iPhone.');
    return match;
  }
  if (records.length === 1) return records[0];
  if (records.length === 0) throw new Error('No paired physical iPhone is visible to Xcode.');
  throw new Error('More than one physical iPhone is visible. Set APPIUM_UDID to select the test device.');
}

export function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}
