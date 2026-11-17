#!/usr/bin/env bash
set -Eeuo pipefail

job="${1:-}"
case "$job" in
  metrics-retention|tcg-sealed-sync) ;;
  *) echo "Unknown Lunidex cron job." >&2; exit 64 ;;
esac

cd /opt/lunidex
exec /usr/bin/flock --wait 300 /run/lunidex-cron/shared.lock \
  docker compose exec -T app node --input-type=module -e '
    const routes = {
      "metrics-retention": "/api/cron/metrics-retention",
      "tcg-sealed-sync": "/api/cron/tcg-sealed-sync",
    };
    const job = process.argv[1];
    const route = routes[job];
    const secret = process.env.LUNIDEX_CRON_SECRET ?? process.env.CRON_SECRET;
    if (!route || !secret) {
      console.error("Lunidex cron configuration is unavailable.");
      process.exit(1);
    }
    try {
      const response = await fetch(`http://127.0.0.1:3000${route}`, {
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(300_000),
      });
      console.log(`${job}: HTTP ${response.status}`);
      if (!response.ok) process.exitCode = 1;
    } catch (error) {
      console.error(`${job}: request failed (${error instanceof Error ? error.name : "unknown error"})`);
      process.exitCode = 1;
    }
  ' "$job"
