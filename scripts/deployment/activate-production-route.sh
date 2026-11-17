#!/usr/bin/env bash
set -Eeuo pipefail

confirmation="$1"
if [[ "$confirmation" != "ACTIVATE_PRODUCTION_ROUTE" ]]; then
  echo "Pass ACTIVATE_PRODUCTION_ROUTE only after the approved DNS cutover." >&2
  exit 64
fi

expected_ipv4=51.255.40.19
expected_ipv6=2001:41d0:305:2100::1:916d
for hostname in lunidex.app www.lunidex.app; do
  ipv4="$(getent ahostsv4 "$hostname" | awk '{print $1}' | sort -u)"
  if [[ "$ipv4" != "$expected_ipv4" ]]; then
    echo "Refusing route activation: $hostname does not resolve only to the OVH IPv4." >&2
    exit 78
  fi
  ipv6="$(getent ahostsv6 "$hostname" | awk '{print $1}' | sort -u || true)"
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
if [[ -e "$backup" ]]; then
  echo "A pre-production Caddyfile backup already exists; inspect it before retrying." >&2
  exit 78
fi

docker cp /opt/lunidex-production/deploy/production/Caddyfile.production \
  lunidex-caddy:/data/Caddyfile.production
docker exec lunidex-caddy caddy validate --config /data/Caddyfile.production --adapter caddyfile
cp -p /opt/lunidex/Caddyfile "$backup"
install -m 0644 /opt/lunidex-production/deploy/production/Caddyfile.production \
  /opt/lunidex/Caddyfile
if ! docker compose -f /opt/lunidex/compose.yaml exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
  install -m 0644 "$backup" /opt/lunidex/Caddyfile
  docker compose -f /opt/lunidex/compose.yaml exec -T caddy \
    caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
  echo "Caddy reload failed; the preproduction configuration was restored." >&2
  exit 1
fi

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
