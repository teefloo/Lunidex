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
report_caddy_route_state() {
  echo "Caddy active route projection (admin API fields only):" >&2
  local admin_config=''
  admin_config="$(docker exec "$caddy_container" sh -c '
    if command -v wget >/dev/null 2>&1; then
      wget -q -T 4 -O - http://127.0.0.1:2019/config/
    elif command -v curl >/dev/null 2>&1; then
      curl -fsS --max-time 4 http://127.0.0.1:2019/config/
    else
      exit 127
    fi
  ' 2>/dev/null)" || admin_config=''
  if [[ -z "$admin_config" ]]; then
    echo "Caddy admin API config: unavailable" >&2
  elif ! printf '%s' "$admin_config" | python3 -c '
import json
import sys
from urllib.parse import urlsplit

def strings(value):
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    return []

def collect_route_hosts(node, hosts):
    if isinstance(node, list):
        for item in node:
            collect_route_hosts(item, hosts)
    elif isinstance(node, dict):
        matchers = node.get("match", [])
        if isinstance(matchers, dict):
            matchers = [matchers]
        for matcher in matchers if isinstance(matchers, list) else []:
            if isinstance(matcher, dict):
                hosts.update(strings(matcher.get("host")))
        for key in ("routes", "handle"):
            if key in node:
                collect_route_hosts(node[key], hosts)

try:
    config = json.load(sys.stdin)
    apps = config.get("apps", {})
    http = apps.get("http", {}) if isinstance(apps, dict) else {}
    servers = http.get("servers", {}) if isinstance(http, dict) else {}
    rows = []
    if isinstance(servers, dict):
        for name, server in servers.items():
            if not isinstance(server, dict):
                continue
            hosts = set()
            collect_route_hosts(server.get("routes", []), hosts)
            safe_policies = []
            connection_policies = server.get("tls_connection_policies", [])
            for policy in connection_policies if isinstance(connection_policies, list) else []:
                if not isinstance(policy, dict):
                    continue
                match = policy.get("match", [])
                if isinstance(match, dict):
                    match = [match]
                sni = set()
                for matcher in match if isinstance(match, list) else []:
                    if isinstance(matcher, dict):
                        sni.update(strings(matcher.get("sni")))
                safe = {"match_sni": sorted(sni), "alpn": strings(policy.get("alpn"))}
                for field in ("protocol_min", "protocol_max"):
                    if isinstance(policy.get(field), str):
                        safe[field] = policy[field]
                safe_policies.append(safe)
            rows.append({
                "name": name if isinstance(name, str) else "",
                "listen": strings(server.get("listen")),
                "route_hosts": sorted(hosts),
                "tls_connection_policies": safe_policies,
            })

    tls = apps.get("tls", {}) if isinstance(apps, dict) else {}
    automation = tls.get("automation", {}) if isinstance(tls, dict) else {}
    policies = automation.get("policies", []) if isinstance(automation, dict) else []
    safe_automation = []
    for policy in policies if isinstance(policies, list) else []:
        if not isinstance(policy, dict):
            continue
        issuers = []
        configured_issuers = policy.get("issuers", [])
        for issuer in configured_issuers if isinstance(configured_issuers, list) else []:
            if not isinstance(issuer, dict):
                continue
            safe_issuer = {}
            if isinstance(issuer.get("module"), str):
                safe_issuer["module"] = issuer["module"]
            ca = issuer.get("ca")
            if isinstance(ca, str):
                try:
                    ca_host = urlsplit(ca).hostname
                    if ca_host:
                        safe_issuer["ca_host"] = ca_host
                except ValueError:
                    pass
            issuers.append(safe_issuer)
        safe = {"subjects": strings(policy.get("subjects")), "issuers": issuers}
        if isinstance(policy.get("on_demand"), bool):
            safe["on_demand"] = policy["on_demand"]
        safe_automation.append(safe)

    print(json.dumps({"servers": rows, "tls_automation_policies": safe_automation}, separators=(",", ":")))
except (AttributeError, TypeError, ValueError, json.JSONDecodeError):
    sys.exit(1)
' >&2; then
    echo "Caddy admin API config: unavailable or unparseable" >&2
  fi

  echo "Caddy published ports:" >&2
  for port in 80 443; do
    local mapping=''
    mapping="$(docker port "$caddy_container" "${port}/tcp" 2>/dev/null || true)"
    printf '  %s/tcp: %s\n' "$port" "${mapping:-unpublished}" >&2
  done
  if command -v ss >/dev/null 2>&1; then
    echo "Host listeners on ports 80/443:" >&2
    ss -ltnH 2>/dev/null | awk '$4 ~ /:(80|443)$/ { print "  " $1, $4 }' >&2 || true
  else
    echo "Host listeners on ports 80/443: ss unavailable" >&2
  fi

  for hostname in lunidex.app www.lunidex.app; do
    local probe_output=''
    local probe_exit=0
    probe_output="$(curl --silent --show-error --insecure --connect-timeout 3 --max-time 8 \
      --resolve "$hostname:443:127.0.0.1" --output /dev/null \
      --write-out 'http_code=%{http_code} remote_ip=%{remote_ip} ssl_verify_result=%{ssl_verify_result}' \
      "https://$hostname/api/healthz" 2>&1)" || probe_exit=$?
    probe_output="${probe_output//$'\n'/ }"
    printf 'Internal TLS probe %s: exit=%s result=%s\n' \
      "$hostname" "$probe_exit" "${probe_output:0:400}" >&2
  done

  if docker exec "$caddy_container" sh -c '
    if command -v wget >/dev/null 2>&1; then
      wget -q -T 8 -O /dev/null https://acme-v02.api.letsencrypt.org/directory
    elif command -v curl >/dev/null 2>&1; then
      curl -fsS --connect-timeout 3 --max-time 8 -o /dev/null https://acme-v02.api.letsencrypt.org/directory
    else
      exit 127
    fi
  ' >/dev/null 2>&1; then
    echo "ACME directory egress from Caddy container: reachable" >&2
  else
    echo "ACME directory egress from Caddy container: failed or unavailable" >&2
  fi
}

restore_route_after_failure() {
  local original_status=$?
  trap - EXIT
  if [[ "$original_status" -ne 0 && "$route_switch_attempted" == true ]]; then
    report_caddy_route_state || echo "Caddy route diagnostics could not be completed." >&2
    echo "Recent Caddy TLS/ACME diagnostics (last 15 minutes, at most 80 events; request details omitted):" >&2
    docker logs --since 15m "$caddy_container" 2>&1 \
      | python3 -c '
import json
import sys
from collections import deque

events = deque(maxlen=80)
relevant_loggers = {"tls.obtain", "tls.handshake", "http.acme_client", "http.auto_https"}
for line in sys.stdin:
    try:
        entry = json.loads(line)
    except (TypeError, ValueError):
        continue
    logger = entry.get("logger")
    message = entry.get("msg")
    if not isinstance(logger, str) or not isinstance(message, str):
        continue
    if logger not in relevant_loggers and not logger.startswith("tls.issuance."):
        continue
    combined = (logger + " " + message).lower()
    if not any(token in combined for token in ("acme", "certificate", "challenge", "tls", "issuance", "obtaining", "obtained", "error", "failed", "failure")):
        continue
    fields = ("ts", "level", "logger", "msg", "error", "identifier", "challenge_type", "issuer", "ca", "attempt", "status", "phase", "remaining")
    scalar_types = (str, int, float, bool)
    safe_entry = {
        field: entry[field]
        for field in fields
        if field in entry and isinstance(entry[field], scalar_types)
    }
    events.append(json.dumps(safe_entry, ensure_ascii=True, separators=(",", ":"))[:1600])

for event in events:
    print(event)
' >&2 || true
    if [[ -f "$backup" ]]; then
      if install -m 0644 "$backup" "$active_caddyfile"; then
        if docker cp "$backup" "$caddy_container:/data/Caddyfile.previous" \
          && docker exec "$caddy_container" caddy validate \
            --config /data/Caddyfile.previous --adapter caddyfile \
          && docker exec "$caddy_container" caddy reload \
            --config /data/Caddyfile.previous --adapter caddyfile; then
          echo "The previous Caddyfile was restored after production route activation failed." >&2
        else
          echo "The previous Caddyfile was restored, but Caddy reload failed; the original activation error remains." >&2
        fi
        docker exec "$caddy_container" rm -f /data/Caddyfile.previous >/dev/null 2>&1 || true
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
docker exec "$caddy_container" caddy reload \
  --config /data/Caddyfile.production --adapter caddyfile
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
    echo "Caddy did not serve trusted HTTPS for $hostname. Keep DNS on OVH while diagnosing; use the previous OVH image for application rollback." >&2
    exit 1
  fi
done

echo "Production Caddy route is serving trusted HTTPS for both hostnames."
