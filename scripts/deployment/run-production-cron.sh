#!/usr/bin/env bash
set -Eeuo pipefail

job="$1"
case "$job" in
  metrics-retention|tcg-sealed-sync) ;;
  *) echo "Unknown production Lunidex cron job." >&2; exit 64 ;;
esac

marker=/opt/lunidex-production/ENABLE_PRODUCTION_CRONS
if [[ ! -f "$marker" ]]; then
  echo "Production cron is not enabled; scheduled invocation skipped."
  exit 0
fi

cd /opt/lunidex-production
if /usr/bin/flock --nonblock --conflict-exit-code 75 \
  /run/lunidex-cron/shared.lock \
  /usr/bin/docker compose -f compose.production.yaml exec -T app \
  node --input-type=module -e '
    const routes = {
      "metrics-retention": "/api/cron/metrics-retention",
      "tcg-sealed-sync": "/api/cron/tcg-sealed-sync",
    };
    const job = process.argv[1];
    const route = routes[job];
    const secret = process.env.LUNIDEX_CRON_SECRET;
    if (!route || !secret) {
      console.error("Production cron configuration is unavailable.");
      process.exit(1);
    }
    try {
      const response = await fetch("http://127.0.0.1:3000" + route, {
        headers: { authorization: "Bearer " + secret },
        signal: AbortSignal.timeout(300_000),
      });
      console.log(job + ": HTTP " + response.status);
      if (!response.ok) process.exitCode = 1;
    } catch (error) {
      console.error(job + ": request failed (" + (error instanceof Error ? error.name : "unknown error") + ")");
      process.exitCode = 1;
    }
  ' "$job"; then
  exit 0
else
  status="$?"
  if [[ "$status" == "75" ]]; then
    echo "Production cron skipped because another Lunidex scheduled task holds the shared lock."
    exit 0
  fi
  exit "$status"
fi
