#!/usr/bin/env bash
set -Eeuo pipefail

readonly ca_file='/opt/lunidex-production/supabase-ca.crt'
readonly expected_fingerprint='807025ADD50DED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA'

if [[ ! -f "$ca_file" || -L "$ca_file" || ! -s "$ca_file" || ! -r "$ca_file" ]]; then
  echo 'The Supabase root CA file is missing, unreadable, empty, or a symlink; install it before deployment.' >&2
  exit 78
fi

ca_mode="$(stat -c '%a' "$ca_file" 2>/dev/null || true)"
if [[ "$ca_mode" != '644' && "$ca_mode" != '444' ]]; then
  echo 'The Supabase root CA must be readable by the unprivileged app container (mode 0644 or 0444).' >&2
  exit 78
fi

if ! command -v openssl >/dev/null 2>&1 \
  || ! openssl x509 -in "$ca_file" -noout -checkend 0 >/dev/null 2>&1 \
  || ! openssl x509 -in "$ca_file" -noout -ext basicConstraints 2>/dev/null | grep -q 'CA:TRUE'; then
  echo 'The Supabase root CA file must be a current PEM CA certificate.' >&2
  exit 78
fi

fingerprint="$(openssl x509 -in "$ca_file" -noout -fingerprint -sha256 | sed 's/.*=//; s/://g' | tr '[:lower:]' '[:upper:]')"
if [[ "$fingerprint" != "$expected_fingerprint" ]]; then
  echo 'The installed Supabase root CA fingerprint does not match the pinned certificate.' >&2
  exit 78
fi

echo 'Supabase root CA file is present and valid for the read-only app mount.'
