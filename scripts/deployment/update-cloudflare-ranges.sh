#!/usr/bin/env bash
set -Eeuo pipefail

destination="${1:-./cloudflare-ips.env}"
tmp_v4="$(mktemp)"
tmp_v6="$(mktemp)"
tmp_env="$(mktemp)"
trap 'rm -f "$tmp_v4" "$tmp_v6" "$tmp_env"' EXIT

curl --fail --silent --show-error --location --max-time 15 \
  https://www.cloudflare.com/ips-v4 > "$tmp_v4"
curl --fail --silent --show-error --location --max-time 15 \
  https://www.cloudflare.com/ips-v6 > "$tmp_v6"

python3 - "$tmp_v4" "$tmp_v6" "$tmp_env" <<'PY'
from ipaddress import ip_network
from pathlib import Path
import sys

files = [(Path(sys.argv[1]), 4), (Path(sys.argv[2]), 6)]
ranges = []
for path, expected_version in files:
    entries = [line.strip() for line in path.read_text().splitlines() if line.strip()]
    if not entries:
        raise SystemExit(f"Cloudflare returned an empty IPv{expected_version} range list")
    for entry in entries:
        network = ip_network(entry, strict=True)
        if network.version != expected_version:
            raise SystemExit(f"Unexpected address family in {entry}")
        ranges.append(str(network))

Path(sys.argv[3]).write_text(
    "CLOUDFLARE_TRUSTED_PROXIES='" + " ".join(ranges) + "'\n",
    encoding="utf-8",
)
PY

install -D -m 0644 "$tmp_env" "$destination"
printf 'Updated Cloudflare proxy ranges in %s. Restart Caddy with docker compose restart caddy.\n' "$destination"
