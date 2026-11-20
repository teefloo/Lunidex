#!/usr/bin/env bash
set -Eeuo pipefail

normalized_state="$(cat)"
[[ "$normalized_state" =~ ^\{.*\"healthy\":true\}$ ]]
