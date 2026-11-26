#!/usr/bin/env bash
set -Eeuo pipefail

readonly expected_fingerprint='807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA'
readonly ca_file="${1:-}"

if [[ -z "$ca_file" || ! -f "$ca_file" || -L "$ca_file" || ! -s "$ca_file" || ! -r "$ca_file" ]]; then
  echo 'The Supabase root CA file is missing, unreadable, empty, or a symlink.' >&2
  exit 78
fi


if ! command -v openssl >/dev/null 2>&1 \
  || ! openssl x509 -in "$ca_file" -noout -checkend 0 >/dev/null 2>&1 \
  || ! openssl x509 -in "$ca_file" -noout -text 2>/dev/null | grep -q 'CA:TRUE'; then
  echo 'The Supabase root CA file must be a current PEM CA certificate.' >&2
  exit 78
fi

fingerprint="$(openssl x509 -in "$ca_file" -noout -fingerprint -sha256 | sed 's/.*=//; s/://g' | tr '[:lower:]' '[:upper:]')"
if [[ "$fingerprint" != "$expected_fingerprint" ]]; then
  echo 'The Supabase root CA fingerprint does not match the pinned certificate.' >&2
  exit 78
fi

echo 'Supabase root CA fingerprint matches pinned certificate.'
