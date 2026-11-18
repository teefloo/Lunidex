#!/usr/bin/env bash
set -Eeuo pipefail

confirmation="$1"
if [[ "$confirmation" != "ACTIVATE_PRODUCTION_ROUTE" ]]; then
  echo "Pass ACTIVATE_PRODUCTION_ROUTE only after the approved DNS cutover." >&2
  exit 64
fi

expected_ipv4=51.255.40.19
expected_ipv6=2001:41d0:305:2100::1:916d
caddy_container=lunidex-caddy
for hostname in lunidex.app www.lunidex.app; do
  ipv4="$(getent ahostsv4 "$hostname" | awk '{print $1}' | sort -u)"
  if [[ "$ipv4" != "$expected_ipv4" ]]; then
    echo "Refusing route activation: $hostname does not resolve only to the OVH IPv4." >&2
    exit 78
  fi
  # `ahostsv6` sets AI_V4MAPPED and can return an IPv4-only A record as
  # `::ffff:x.x.x.x`. Inspect the AF_UNSPEC list instead, then keep only
  # native IPv6 literals so the IPv4-mapped fallback cannot fail this guard.
  ipv6="$(getent ahosts "$hostname" | awk 'index($1, ":") { print tolower($1) }' | sort -u || true)"
  if [[ -n "$ipv6" && "$ipv6" != "$expected_ipv6" ]]; then
    echo "Refusing route activation: $hostname has a non-OVH IPv6 record." >&2
    exit 78
  fi
done

cd /opt/lunidex-production
bash /opt/lunidex-production/scripts/deployment/healthcheck-production.sh
if [[ ! -f /opt/lunidex/Caddyfile ]]; then
  echo "The existing preproduction Caddyfile is missing." >&2
  exit 78
fi
backup=/opt/lunidex-production/Caddyfile.before-production
production_caddyfile=/opt/lunidex-production/deploy/production/Caddyfile.production
active_caddyfile=/opt/lunidex/Caddyfile
if [[ -e "$backup" || -L "$backup" ]]; then
  if [[ -f "$backup" && ! -L "$backup" && -f "$active_caddyfile" && ! -L "$active_caddyfile" ]] \
    && cmp -s -- "$backup" "$active_caddyfile"; then
    rm -f -- "$backup"
    echo "Removed stale Caddyfile backup identical to the active configuration; retrying route activation." >&2
  else
    echo "A pre-production Caddyfile backup already exists and does not safely match the active configuration; inspect it before retrying." >&2
    exit 78
  fi
fi

route_switch_attempted=false
restore_route_after_failure() {
  local original_status=$?
  trap - EXIT
  if [[ "$original_status" -ne 0 && "$route_switch_attempted" == true ]]; then
    echo "Recent Caddy ACME/TLS/certificate/challenge warnings and errors (last 15 minutes, at most 80 lines):" >&2
    docker logs --since 15m --tail 300 "$caddy_container" 2>&1 \
      | awk 'tolower($0) ~ /(acme|tls|certificate|challenge|error|warn)/ { print substr($0, 1, 500) }' \
      | tail -n 80 >&2 || true
    if [[ -f "$backup" ]]; then
      if install -m 0644 "$backup" "$active_caddyfile"; then
        if docker compose -f /opt/lunidex/compose.yaml exec -T caddy \
          caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
          echo "The previous Caddyfile was restored after production route activation failed." >&2
        else
          echo "The previous Caddyfile was restored, but Caddy reload failed; the original activation error remains." >&2
        fi
      else
        echo "Could not restore the previous Caddyfile after production route activation failed." >&2
      fi
    else
      echo "The Caddy backup is missing; automatic route restoration was not possible." >&2
    fi
  fi
  exit "$original_status"
}
trap restore_route_after_failure EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

docker cp "$production_caddyfile" \
  "$caddy_container:/data/Caddyfile.production"
docker exec "$caddy_container" caddy validate --config /data/Caddyfile.production --adapter caddyfile
cp -p "$active_caddyfile" "$backup"
route_switch_attempted=true
install -m 0644 "$production_caddyfile" "$active_caddyfile"
docker compose -f /opt/lunidex/compose.yaml exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "Production Caddy configuration loaded."

for hostname in lunidex.app www.lunidex.app; do
  ready=false
  for attempt in $(seq 1 36); do
    if curl --fail --silent --max-time 10 --resolve "$hostname:443:127.0.0.1" \
      "https://$hostname/api/healthz" --output /dev/null; then
      ready=true
      break
    fi
    sleep 5
  done
  if [[ "$ready" != true ]]; then
    echo "Caddy did not serve trusted HTTPS for $hostname. Keep DNS on OVH while diagnosing; Vercel is not a working rollback target." >&2
    exit 1
  fi
done

echo "Production Caddy route is serving trusted HTTPS for both hostnames."
