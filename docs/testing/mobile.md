# Tests mobiles

Lunidex has two separate mobile test paths:

- Playwright WebKit emulates an iPhone viewport for fast layout and interaction checks.
- Appium + XCUITest drives Safari on a paired physical iPhone. The script uses DOM accessibility attributes and WebDriver touch actions, saves an actual device screenshot, and captures browser diagnostics when Safari exposes them.

Reports, screenshots, traces, and Appium/Next logs are written under `test-results/` and ignored by Git. Set `MOBILE_ARTIFACTS_DIR` to keep a particular run’s files in a separate directory.

## Prerequisites

- Node.js 22 and npm from the repository lockfile.
- Xcode 27 installed and opened once to finish first-launch setup. iOS 27 wireless pairing requires Xcode 27 Device Hub. The mobile scripts prefer `/Applications/Xcode.app/Contents/Developer` through a per-process `DEVELOPER_DIR`; they do not change macOS’s global `xcode-select` setting. Set `MOBILE_DEVELOPER_DIR` if Xcode is installed elsewhere.
- An iPhone on the same Wi-Fi network as the Mac, paired from Device Hub using **+ → Pair Nearby Device…**. Keep the device unlocked during setup and tests.
- Developer Mode enabled on the iPhone. When needed, iOS shows the control under **Settings → Privacy & Security → Developer Mode** after pairing begins, then asks for a restart and confirmation.
- Safari **Web Inspector** and **Remote Automation** enabled under **Settings → Apps → Safari → Advanced**. If the Developer menu appears, enable **UI Automation** there as well.
- A signing team in Xcode may be needed for WebDriverAgent. Set `IOS_TEAM_ID` for the team identifier and optionally `IOS_SIGNING_ID` (defaults to `Apple Development`). Do not put Apple account credentials in the project or chat.

Install the pinned Appium server, XCUITest driver, and Playwright WebKit browser:

```sh
npm run test:mobile:setup
```

The repository pins Appium 3.9.0 and XCUITest 12.22.8. The driver’s current compatibility table lists iOS 27+ for XCUITest 11.1.2+ with WebDriverAgent 14.1.1+, and lists XCUITest 12.22.8 as Appium 3 compatible and supported by Xcode 26+. Appium installs its matching WebDriverAgent package with the driver.

Check the current machine before a run:

```sh
npm run test:mobile:preflight
```

## Commands

```sh
npm run test:mobile:install-webkit # only install/update the local WebKit browser
npm run test:mobile:webkit         # iPhone 14 viewport emulation in WebKit
npm run test:mobile:pwa            # production build, manifest + service worker checks
npm run test:mobile:ios            # physical iPhone, Safari, interaction, screenshot, logs
npm run test:mobile                # attempts WebKit, production PWA, and physical iPhone stages
```

The WebKit viewport suite checks the home screen, mobile menu navigation, Pokédex/team/TCG/quiz routes, the team import dialog and text input, scrolling, horizontal overflow at narrow widths, JavaScript errors, same-origin HTTP failures, and the PWA manifest. The production PWA run additionally waits for the service worker to control the page. The development server intentionally disables the service worker, so that assertion is reserved for `test:mobile:pwa`.

The aggregate `test:mobile` command runs all three stages even if an earlier stage fails, then returns a nonzero result after printing their individual statuses.

## Physical iPhone and local HTTPS

`test:mobile:ios` discovers the single paired physical iPhone through Xcode. If several devices are paired, set `APPIUM_UDID` to the intended device identifier. Appium listens on loopback, while Next.js binds only to the Mac’s private Wi-Fi IPv4 address (normally `en0`); it does not create a public tunnel. Set `MOBILE_HOST` if automatic interface selection is unsuitable. The Mac and iPhone must be on the same LAN, and local client isolation must be off.

The Appium server launched by this runner sets `APPIUM_XCUITEST_PREFER_DEVICECTL=true` by default, so the XCUITest driver can find a wirelessly paired iPhone through Xcode’s `devicectl` list. To inspect Appium’s device discovery manually, run:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
APPIUM_HOME="$PWD/node_modules/.cache/appium" \
./node_modules/.bin/appium driver run xcuitest list-real-devices -- --devicectl

APPIUM_HOME="$PWD/node_modules/.cache/appium" \
./node_modules/.bin/appium driver run xcuitest list-real-devices
```

The second command checks the usbmux list used by the RemoteXPC tunnel helper. Current Mac status: `xcdevice` and the driver's `--devicectl` list see the paired iPhone, but the default usbmux list is empty, so Appium remains blocked until that same device appears in the default list. The Device Hub pairing screen in this setup did not expose a Wi-Fi-sync toggle; `devicectl` pairing alone does not satisfy the usbmux prerequisite. Do not run the tunnel helper while the default list is empty: it enumerates usbmux and cannot create the missing device record. Only after `list-real-devices` shows the target UDID may the XCUITest tunnel helper be attempted. It configures a TUN/TAP interface and needs administrator privileges; keep it running in a second Terminal while the mobile test runs:

```bash
APPIUM_UDID="<paired-iphone-udid>"
sudo env \
  DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer" \
  APPIUM_HOME="$PWD/node_modules/.cache/appium" \
  ./node_modules/.bin/appium driver run xcuitest tunnel-creation -- --udid "$APPIUM_UDID"
```

Stop the helper with `Ctrl-C` after `npm run test:mobile:ios` finishes. If the iPhone appears only in the `devicectl` list, stop there; the repository runner does not request administrator privileges or create system tunnels itself.

By default the iPhone runner starts a Next.js development server on the Mac’s private Wi-Fi address. Safari can use that for layout and navigation. Supplying `MOBILE_HTTPS_CERT` and `MOBILE_HTTPS_KEY` makes that development server HTTPS, but it still cannot validate PWA registration or installation: `next-pwa` disables the service worker in development. The HTTPS development server is only for secure-context interaction checks.

To test the PWA on the physical iPhone, build and serve a **production** build over local HTTPS on the private LAN, using a trusted local TLS certificate. Then point Appium at that server with `MOBILE_BASE_URL`; do not use the runner’s development server for the PWA check. For example:

```sh
npm run build
# Serve `next start` behind a LAN-only HTTPS terminator with the trusted certificate.
MOBILE_BASE_URL=https://<mac-private-ip>:<https-port>/en npm run test:mobile:ios
```

The production URL must be reachable from the iPhone and its certificate trusted on both devices. For secure-context checks that do not require the service worker, the development server can use a local certificate:

```sh
MOBILE_HTTPS_CERT=/path/to/lan-cert.pem \
MOBILE_HTTPS_KEY=/path/to/lan-key.pem \
npm run test:mobile:ios
```

`MOBILE_HTTPS_CA` can point to the certificate authority file if the Next.js TLS setup needs it. The ignored `test-results/mobile-https/` directory can contain a local test CA and an IP-SAN server certificate for the Mac's current LAN address (`<mac-private-ip>`):

```text
test-results/mobile-https/root-ca.crt       public CA certificate
test-results/mobile-https/root-ca.key       private CA key; keep on this Mac
test-results/mobile-https/server.crt        HTTPS certificate for <mac-private-ip>
test-results/mobile-https/server.key        HTTPS private key; keep on this Mac
test-results/mobile-https/root-ca.mobileconfig  unsigned profile with only the root certificate
```

The profile does not contain either private key. The artifact directory is mode `0700`; private keys and the profile are mode `0600`. If the Mac's LAN IP changes, issue a new server certificate with that IP before testing. For the development-server interaction check, use these files with the runner:

```sh
MOBILE_HTTPS_CERT="$PWD/test-results/mobile-https/server.crt" \
MOBILE_HTTPS_KEY="$PWD/test-results/mobile-https/server.key" \
MOBILE_HTTPS_CA="$PWD/test-results/mobile-https/root-ca.crt" \
npm run test:mobile:ios
```

To install the CA manually, AirDrop `root-ca.mobileconfig` from Finder to the iPhone. Open the received profile, then install it from **Settings → Profile Downloaded** (or **Settings → General → VPN & Device Management**). Manual installation alone does not enable TLS trust: go to **Settings → General → About → Certificate Trust Settings** and enable full trust for **Lunidex Local Test Root CA**. Apple documents [profile installation](https://support.apple.com/en-gb/102400) and [manual certificate trust](https://support.apple.com/en-gb/102390). Remove the profile from **VPN & Device Management** after testing. Keep the root private key on the Mac; this CA is only for local testing.

For physical PWA checks, use the same certificate and root CA with a LAN-only HTTPS terminator in front of a production `next start` server and set `MOBILE_BASE_URL` to `https://<mac-private-ip>:<https-port>/en`. The development server still disables the service worker, so the certificate alone does not make dev mode suitable for PWA installation. The runner does not bypass Safari certificate warnings; do not use a public tunnel for this local test setup.

`MOBILE_BASE_URL` must not use `localhost` or `127.0.0.1`, because those names refer to the iPhone when Safari opens them. Optional ports are `MOBILE_WEB_PORT` (default `3100`), `APPIUM_PORT` (default `4723`), and `APPIUM_WDA_PORT` (default `8100`). The runner stops with an actionable message if a chosen port is occupied.

The actual-device flow opens Safari, dismisses the first-run install and cookie prompts when present, opens the home page’s **Open Menu** button and follows the Pokédex link through DOM accessibility attributes, performs a touch scroll sized to the live viewport, then opens the team import dialog, enters text, and checks that iOS exposes the software keyboard in its native accessibility tree. It stores screenshots of the Pokédex and keyboard state plus logs and a JSON report in `test-results/mobile/`. If the keyboard cannot be verified, the run fails and keeps the partial screenshots/logs.

## Installed Home Screen PWA

Install the PWA manually in Safari with **Share → Add to Home Screen** after serving the app from a trusted HTTPS origin. iOS exposes the installed web app as a separate home-screen web clip. XCUITest may be able to launch it as a native SpringBoard app, but Safari’s remote Web Inspector does not consistently expose the standalone web clip as a debuggable Safari tab. The automated runner therefore reports Safari web-content results and does not claim that the installed PWA DOM or JavaScript console was inspected.

For the installed PWA, use the device screenshot and Xcode Device Hub for native-visible checks. Use Safari’s Develop menu on the Mac for web diagnostics when iOS exposes the web clip there. If Safari does not list the web clip, test its offline/standalone behavior manually on the device and keep automated DOM coverage in the production Playwright PWA run.

### Wi-Fi visual smoke check

A one-off PWA smoke was verified over the existing Device Hub/`devicectl` pairing with IPB CoreDevice HID gestures: visible navigation, scrolling, and a device screenshot. This is not Appium automation and provides no DOM selectors or browser console. `ipb ui` is not a workaround for this no-cable setup: its accessibility-tree mode requires Python 3.11+ and an existing USB pairing. IPB is an external diagnostic tool, not a project dependency or npm script. Treat the PWA check as a point-in-time visual smoke only; repeatable physical automation remains blocked until the iPhone appears in Appium’s default usbmux device list.

## Troubleshooting

- **No Xcode device list or `xcodebuild` error:** install/open Xcode 27 and finish its first-launch components. The scripts use Xcode’s Developer directory with `DEVELOPER_DIR` for each command; the Command Line Tools package alone cannot pair or automate an iPhone. For a nonstandard install path, set `MOBILE_DEVELOPER_DIR`.
- **Phone absent in Xcode:** confirm the Mac and iPhone share Wi-Fi, start **Pair Nearby Device…** in Device Hub, and approve the pairing and Developer Mode prompts on the iPhone.
- **WebDriverAgent build or signing failure:** confirm Xcode is open and selected; check the device’s Developer Mode and UI Automation switches; set `IOS_TEAM_ID` for an available development team. Appium logs are saved under `test-results/mobile/`.
- **Safari cannot reach the app:** keep both devices on the same Wi-Fi, check that the router allows local client-to-client traffic, and use the Mac’s private IP in Safari. Do not use the Mac’s `localhost` address on the iPhone.
- **Secure-context or service-worker failure:** use a certificate issued for the private LAN host and trusted on iOS. Accepting an untrusted-certificate warning is not part of the runner.
- **Playwright WebKit exits with `Abort trap: 6` in a sandboxed Codex command:** retry the Playwright stage through an unsandboxed execution. On this Mac the same WebKit 27.2 arm64 launch succeeds outside the sandbox. Keep WebKit as the configured browser; do not silently substitute Chromium.
- **Appium reports an unknown UDID:** confirm the phone appears in both `list-real-devices -- --devicectl` and the default `list-real-devices` output. If it appears only through `devicectl`, Appium remains blocked; the tunnel helper cannot run until usbmux lists the device. The current Device Hub pairing screen has no Wi-Fi-sync toggle, so do not follow a tunnel instruction while the default usbmux list is empty.
- **Safari log endpoint unavailable:** the report records the available Appium log types and the reason diagnostics could not be collected. Playwright still records page errors, failed requests, same-origin HTTP failures, and failure traces.
