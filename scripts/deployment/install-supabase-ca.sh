#!/usr/bin/env bash
set -Eeuo pipefail

readonly incoming_ca="${1:-}"
readonly ca_file='/opt/lunidex-production/supabase-ca.crt'
readonly expected_fingerprint='807025ADD50DED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA'

if [[ "$incoming_ca" != /opt/lunidex-production/.supabase-ca.*.tmp \
  || ! -f "$incoming_ca" || -L "$incoming_ca" || ! -s "$incoming_ca" ]]; then
  echo 'A non-empty staged Supabase CA file is required.' >&2
  exit 78
fi

fingerprint="$(openssl x509 -in "$incoming_ca" -noout -fingerprint -sha256 | sed 's/.*=//; s/://g' | tr '[:lower:]' '[:upper:]')"
if [[ "$fingerprint" != "$expected_fingerprint" ]] \
  || ! openssl x509 -in "$incoming_ca" -noout -checkend 0 >/dev/null 2>&1 \
  || ! openssl x509 -in "$incoming_ca" -noout -text 2>/dev/null | grep -q 'CA:TRUE'; then
  echo 'The staged certificate does not match the pinned current Supabase root CA.' >&2
  exit 78
fi

temporary_install="${ca_file}.install.$$"
trap 'rm -f -- "$temporary_install" "$incoming_ca"' EXIT
install -m 0644 -- "$incoming_ca" "$temporary_install"
mv -f -- "$temporary_install" "$ca_file"
bash /opt/lunidex-production/scripts/deployment/require-supabase-ca.sh
