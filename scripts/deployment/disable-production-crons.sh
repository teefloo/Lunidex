#!/usr/bin/env bash
set -Eeuo pipefail

sudo -n systemctl disable --now \
  lunidex-production-cron@metrics-retention.timer \
  lunidex-production-cron@tcg-sealed-sync.timer || true
rm -f /opt/lunidex-production/ENABLE_PRODUCTION_CRONS
echo "Production cron timers are stopped and disabled."
