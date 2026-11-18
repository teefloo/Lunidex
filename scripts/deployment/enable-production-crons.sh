#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Run this script as an administrator, for example: sudo bash $0 ENABLE_PRODUCTION_CRONS." >&2
  exit 77
fi

confirmation="${1:-}"
if [[ "$confirmation" != "ENABLE_PRODUCTION_CRONS" ]]; then
  echo "Pass ENABLE_PRODUCTION_CRONS only after legacy schedules have been disabled and the production cutover is verified." >&2
  exit 64
fi
cd /opt/lunidex-production
if [[ ! -f LEGACY_SCHEDULES_DISABLED ]]; then
  echo "Create LEGACY_SCHEDULES_DISABLED after verifying no other scheduler can target production." >&2
  exit 78
fi
if [[ ! -f .env || ! -f app.env ]]; then
  echo "Production environment files are missing." >&2
  exit 78
fi
if ! id -u lunidex-deploy >/dev/null 2>&1 || ! getent group lunidex-deploy >/dev/null; then
  echo "The lunidex-deploy service account or group is missing." >&2
  exit 78
fi

for unit in \
  lunidex-cron@metrics-retention.timer \
  lunidex-cron@tcg-sealed-sync.timer; do
  if systemctl is-enabled --quiet "$unit" \
    || systemctl is-active --quiet "$unit"; then
    echo "A preproduction timer is enabled or active: $unit" >&2
    exit 78
  fi
done

bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh
install -o root -g root -m 0755 /opt/lunidex-production/scripts/deployment/run-production-cron.sh \
  /usr/local/bin/lunidex-production-cron
install -o root -g root -m 0644 deploy/systemd-production/lunidex-production-cron@.service \
  /etc/systemd/system/lunidex-production-cron@.service
install -o root -g root -m 0644 deploy/systemd-production/lunidex-production-cron@metrics-retention.timer \
  /etc/systemd/system/lunidex-production-cron@metrics-retention.timer
install -o root -g root -m 0644 deploy/systemd-production/lunidex-production-cron@tcg-sealed-sync.timer \
  /etc/systemd/system/lunidex-production-cron@tcg-sealed-sync.timer
systemctl daemon-reload

marker=/opt/lunidex-production/ENABLE_PRODUCTION_CRONS
marker_tmp="$(mktemp /opt/lunidex-production/.ENABLE_PRODUCTION_CRONS.XXXXXX)"
trap 'rm -f "$marker_tmp"' EXIT
printf 'enabled\n' > "$marker_tmp"
chown lunidex-deploy:lunidex-deploy "$marker_tmp"
chmod 0600 "$marker_tmp"
mv -f "$marker_tmp" "$marker"
trap - EXIT

if ! systemctl enable --now \
  lunidex-production-cron@metrics-retention.timer \
  lunidex-production-cron@tcg-sealed-sync.timer; then
  rm -f "$marker"
  systemctl disable --now \
    lunidex-production-cron@metrics-retention.timer \
    lunidex-production-cron@tcg-sealed-sync.timer || true
  echo "Could not enable production timers; the cron marker was removed." >&2
  exit 1
fi
echo "Production timers enabled; Persistent=false prevents missed-run catch-up."
