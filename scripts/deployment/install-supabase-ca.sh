#!/usr/bin/env bash
set -Eeuo pipefail

readonly incoming_ca="${1:-}"
readonly ca_file='/opt/lunidex-production/supabase-ca.crt'
if [[ "$incoming_ca" != /opt/lunidex-production/.supabase-ca.*.tmp \
  || ! -f "$incoming_ca" || -L "$incoming_ca" || ! -s "$incoming_ca" ]]; then
  echo 'A non-empty staged Supabase CA file is required.' >&2
  exit 78
fi

bash /opt/lunidex-production/scripts/deployment/verify-supabase-ca.sh "$incoming_ca"

temporary_install="${ca_file}.install.$$"
trap 'rm -f -- "$temporary_install" "$incoming_ca"' EXIT
install -m 0644 -- "$incoming_ca" "$temporary_install"
mv -f -- "$temporary_install" "$ca_file"
bash /opt/lunidex-production/scripts/deployment/require-supabase-ca.sh
