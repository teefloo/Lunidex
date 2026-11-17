#!/usr/bin/env bash
set -Eeuo pipefail

confirmation="$1"
if [[ "$confirmation" != "ENABLE_PRODUCTION_CRONS" ]]; then
  echo "Pass ENABLE_PRODUCTION_CRONS only after Vercel schedules have been disabled." >&2
  exit 64
fi
cd /opt/lunidex-production
if [[ ! -f VERCEL_CRONS_DISABLED ]]; then
  echo "Create VERCEL_CRONS_DISABLED after verifying no Vercel cron can target production." >&2
  exit 78
fi
if [[ ! -f .env || ! -f app.env ]]; then
  echo "Production environment files are missing." >&2
  exit 78
fi

for unit in \
  lunidex-cron@metrics-retention.timer \
  lunidex-cron@tcg-sealed-sync.timer; do
  if sudo -n systemctl is-enabled --quiet "$unit" \
    || sudo -n systemctl is-active --quiet "$unit"; then
    echo "A preproduction timer is enabled or active: $unit" >&2
    exit 78
  fi
done

bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh
sudo -n install -m 0755 /opt/lunidex-production/scripts/deployment/run-production-cron.sh \
  /usr/local/bin/lunidex-production-cron
sudo -n install -m 0644 deploy/systemd-production/lunidex-production-cron@.service \
  /etc/systemd/system/lunidex-production-cron@.service
sudo -n install -m 0644 deploy/systemd-production/lunidex-production-cron@metrics-retention.timer \
  /etc/systemd/system/lunidex-production-cron@metrics-retention.timer
sudo -n install -m 0644 deploy/systemd-production/lunidex-production-cron@tcg-sealed-sync.timer \
  /etc/systemd/system/lunidex-production-cron@tcg-sealed-sync.timer
sudo -n systemctl daemon-reload
printf 'enabled\n' > ENABLE_PRODUCTION_CRONS
chmod 0600 ENABLE_PRODUCTION_CRONS
sudo -n systemctl enable --now \
  lunidex-production-cron@metrics-retention.timer \
  lunidex-production-cron@tcg-sealed-sync.timer
echo "Production timers enabled; Persistent=false prevents missed-run catch-up."
