import { mkdirSync } from 'node:fs';
import { appiumBin, appiumHome, playwrightBin, run, withAppiumEnvironment } from './constants.mjs';

mkdirSync(appiumHome, { recursive: true });

const driverList = run(appiumBin, ['driver', 'list', '--installed'], { env: withAppiumEnvironment() });
const driverOutput = `${driverList.stdout ?? ''}\n${driverList.stderr ?? ''}`;
const installedDriver = driverList.status === 0 && /xcuitest@12\.22\.8/i.test(driverOutput);
if (installedDriver) {
  process.stdout.write('XCUITest 12.22.8 is already installed in the project-local Appium home.\n');
} else {
  process.stdout.write('Installing XCUITest 12.22.8 into the project-local Appium home…\n');
  const installDriver = run(appiumBin, ['driver', 'install', 'xcuitest@12.22.8'], {
    env: withAppiumEnvironment(),
    stdio: 'inherit',
  });
  if (installDriver.status !== 0) {
    process.stderr.write('XCUITest driver installation failed.\n');
    process.exit(installDriver.status ?? 1);
  }
}

process.stdout.write('Installing the matching Playwright WebKit browser…\n');
const installWebKit = run(playwrightBin, ['install', 'webkit'], {
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
  stdio: 'inherit',
});
if (installWebKit.status !== 0) {
  process.stderr.write('WebKit installation failed.\n');
  process.exit(installWebKit.status ?? 1);
}

process.stdout.write('\nMobile browser dependencies are installed.\n');
