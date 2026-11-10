import { existsSync } from 'node:fs';
import path from 'node:path';
import { appiumBin, chooseDevice, getDeviceRecords, projectRoot, run, withAppiumEnvironment, withXcodeEnvironment } from './constants.mjs';

const checks = new Set(process.argv.slice(2));
const checkAll = checks.size === 0;
const failures = [];
const tunnelRegistryUrl = 'http://127.0.0.1:42314/remotexpc/tunnels';

function pass(message) {
  process.stdout.write(`✓ ${message}\n`);
}

function fail(message) {
  failures.push(message);
  process.stderr.write(`✗ ${message}\n`);
}

async function hasRegisteredTunnel(udid) {
  try {
    const response = await fetch(tunnelRegistryUrl, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return false;
    const payload = await response.json();
    const tunnels = payload && typeof payload === 'object' ? payload.tunnels : undefined;
    return Boolean(tunnels && typeof tunnels === 'object'
      && Object.keys(tunnels).some((key) => key.toLowerCase() === udid.toLowerCase()));
  } catch {
    return false;
  }
}

if (Number(process.versions.node.split('.')[0]) < 22) {
  fail(`Node.js 22 or later is required (found ${process.versions.node}).`);
} else {
  pass(`Node.js ${process.versions.node}`);
}

if (existsSync(path.join(projectRoot, 'node_modules', '@playwright', 'test'))) {
  pass('Playwright test package is installed');
} else {
  fail('Playwright is missing. Run npm ci from the repository root.');
}

if (checkAll || checks.has('--playwright')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= '0';
  try {
    const { webkit } = await import('@playwright/test');
    if (existsSync(webkit.executablePath())) pass('Playwright WebKit browser is installed');
    else fail('Playwright WebKit is missing. Run npm run test:mobile:install-webkit.');
    if (existsSync(webkit.executablePath())) {
      try {
        const browser = await webkit.launch({ headless: true });
        await browser.close();
        pass('Playwright WebKit launches successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const detail = message.split('\n').find((line) => line.includes('Abort trap'))
          || message.split('\n')[0]
          || 'unknown browser launch error';
        fail(`Playwright WebKit could not launch (${detail.trim()}).`);
      }
    }
  } catch (error) {
    fail(`Could not resolve Playwright WebKit: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (checkAll || checks.has('--ios')) {
  if (process.platform !== 'darwin') {
    fail('Real iPhone automation requires macOS with Xcode.');
  } else {
    const xcode = run('xcodebuild', ['-version'], { env: withXcodeEnvironment() });
    if (xcode.status === 0) pass(`Xcode ${xcode.stdout.split('\n')[0]?.replace('Xcode ', '') ?? 'available'}`);
    else fail('Full Xcode is unavailable. Install/open Xcode 27 or set MOBILE_DEVELOPER_DIR; the Command Line Tools package alone cannot pair or automate an iPhone.');

    if (!existsSync(appiumBin)) {
      fail('Appium is missing. Run npm run test:mobile:setup.');
    } else {
      const version = run(appiumBin, ['--version'], { env: withAppiumEnvironment() });
      const versionOutput = version.stdout.trim() || 'available';
      if (version.status === 0) pass(`Appium ${versionOutput}`);
      else fail('Appium could not start. Re-run npm run test:mobile:setup.');

      const drivers = run(appiumBin, ['driver', 'list', '--installed'], { env: withAppiumEnvironment() });
      const driverOutput = `${drivers.stdout ?? ''}\n${drivers.stderr ?? ''}`;
      if (drivers.status === 0 && /xcuitest@12\.22\.8/i.test(driverOutput)) pass('XCUITest 12.22.8 driver is installed');
      else fail('XCUITest driver is missing. Run npm run test:mobile:setup.');
    }

    try {
      const devices = getDeviceRecords();
      const selected = chooseDevice(devices);
      const label = selected.name ? ` (${selected.name})` : '';
      pass(`One paired physical iPhone is available${label}`);
      const osMajor = Number.parseInt(selected.operatingSystemVersion ?? '', 10);
      if (osMajor >= 27 && ['network', 'localNetwork'].includes(selected.interface)) {
        if (await hasRegisteredTunnel(selected.identifier)) {
          pass('iOS 27 Wi-Fi RemoteXPC tunnel is registered');
        } else {
          const appiumHome = process.env.MOBILE_APPIUM_HOME || path.join(projectRoot, 'node_modules', '.cache', 'appium');
          fail(
            `iOS ${selected.operatingSystemVersion} Wi-Fi device requires an active RemoteXPC tunnel before Appium can create a session. `
            + `Run the XCUITest tunnel helper as administrator and keep it running; see docs/testing/mobile.md. `
            + `Command: sudo env DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer `
            + `APPIUM_HOME="${appiumHome}" "${appiumBin}" driver run xcuitest tunnel-creation -- --udid "${selected.identifier}"`,
          );
        }
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`\n${failures.length} mobile prerequisite${failures.length === 1 ? '' : 's'} need attention.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nMobile prerequisites are ready.\n');
}
