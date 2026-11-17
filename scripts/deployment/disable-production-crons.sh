#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Run this script as an administrator, for example: sudo bash $0." >&2
  exit 77
fi

rm -f /opt/lunidex-production/ENABLE_PRODUCTION_CRONS
for unit in \
  lunidex-production-cron@metrics-retention.timer \
  lunidex-production-cron@tcg-sealed-sync.timer; do
  if systemctl is-active --quiet "$unit"; then
    systemctl stop "$unit"
  fi
  if systemctl is-enabled --quiet "$unit"; then
    systemctl disable "$unit"
  fi
done
echo "Production cron timers are stopped and disabled."
