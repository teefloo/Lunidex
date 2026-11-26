#!/usr/bin/env bash
set -Eeuo pipefail

readonly ca_file='/opt/lunidex-production/supabase-ca.crt'
if [[ ! -f "$ca_file" || -L "$ca_file" || ! -s "$ca_file" || ! -r "$ca_file" ]]; then
  echo 'The Supabase root CA file is missing, unreadable, empty, or a symlink; install it before deployment.' >&2
  exit 78
fi

ca_mode="$(stat -c '%a' "$ca_file" 2>/dev/null || true)"
if [[ "$ca_mode" != '644' && "$ca_mode" != '444' ]]; then
  echo 'The Supabase root CA must be readable by the unprivileged app container (mode 0644 or 0444).' >&2
  exit 78
fi

bash /opt/lunidex-production/scripts/deployment/verify-supabase-ca.sh "$ca_file"

echo 'Supabase root CA file is present and valid for the read-only app mount.'
