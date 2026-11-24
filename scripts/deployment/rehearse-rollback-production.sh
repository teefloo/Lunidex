#!/usr/bin/env bash
set -Eeuo pipefail

echo 'Live rollback rehearsals are retired. Validate images in the isolated GitHub runner; use rollback-production.sh only for an authorized production recovery.' >&2
exit 64
