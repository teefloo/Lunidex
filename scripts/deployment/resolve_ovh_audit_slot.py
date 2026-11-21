#!/usr/bin/env python3
"""Resolve and validate an OVH audit slot using the runner's UTC date."""

from __future__ import annotations

import os

from ovh_audit_schedule import resolve_audit_slot


def main() -> int:
    resolution = resolve_audit_slot(
        event_name=os.environ.get("EVENT_NAME", ""),
        event_schedule=os.environ.get("EVENT_SCHEDULE", ""),
        manual_slot=os.environ.get("MANUAL_AUDIT_SLOT", "adhoc"),
        utc_date=os.environ.get("RUNNER_UTC_DATE", ""),
    )
    print(f"audit_slot={resolution.slot}")
    print(f"audit_utc_date={resolution.utc_date}")
    print(f"audit_date_valid={'true' if resolution.valid else 'false'}")
    print(f"audit_date_error={resolution.error or ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
