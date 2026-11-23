"""Pure helpers for manual OVH stability audit slots."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


AUDIT_SCHEDULES = {
    "6 19 21 11 *": ("2026-11-21", "2026-11-21-19-06-utc"),
    "6 13 22 11 *": ("2026-11-22", "2026-11-22-13-06-utc"),
    "6 13 23 11 *": ("2026-11-23", "2026-11-23-13-06-utc"),
}

MANUAL_SLOTS = {
    "2026-11-21-19-06-utc": "2026-11-21",
    "2026-11-22-13-06-utc": "2026-11-22",
    "2026-11-23-13-06-utc": "2026-11-23",
    "adhoc": None,
}


@dataclass(frozen=True)
class SlotResolution:
    slot: str
    utc_date: str
    valid: bool
    error: str | None = None


def _valid_iso_date(value: str) -> bool:
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return False
    return parsed.isoformat() == value


def resolve_audit_slot(
    *,
    event_name: str,
    event_schedule: str = "",
    manual_slot: str,
    utc_date: str,
) -> SlotResolution:
    """Resolve audit slots and reject stale or unexpected invocations."""
    if not _valid_iso_date(utc_date):
        return SlotResolution("invalid-date", utc_date, False, "runner UTC date is missing or invalid")

    if event_name == "schedule":
        scheduled = AUDIT_SCHEDULES.get(event_schedule)
        if scheduled is None:
            return SlotResolution("invalid-schedule", utc_date, False, "schedule expression is not allowlisted")
        expected_date, slot = scheduled
        if utc_date != expected_date:
            return SlotResolution(slot, utc_date, False, f"scheduled audit expected UTC date {expected_date}")
        return SlotResolution(slot, utc_date, True)

    if event_name != "workflow_dispatch":
        return SlotResolution("invalid-event", utc_date, False, "event type is not allowlisted")

    expected_date = MANUAL_SLOTS.get(manual_slot)
    if manual_slot not in MANUAL_SLOTS:
        return SlotResolution("invalid-manual-slot", utc_date, False, "manual audit slot is not allowlisted")
    if expected_date is not None and utc_date != expected_date:
        return SlotResolution(manual_slot, utc_date, False, f"manual recovery expected UTC date {expected_date}")
    return SlotResolution(manual_slot, utc_date, True)
