"""Pure helpers for the temporary OVH stability audit schedule."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from typing import Any


AUDIT_SCHEDULES = {
    "6 19 21 11 *": ("2026-11-21", "2026-11-21-19-06-utc"),
    "6 13 22 11 *": ("2026-11-22", "2026-11-22-13-06-utc"),
    "6 13 23 11 *": ("2026-11-23", "2026-11-23-13-06-utc"),
}

WATCHDOG_SCHEDULES = {
    "21 19 21 11 *": (
        "2026-11-21",
        "2026-11-21-19-06-utc",
        "2026-11-21T19:06:00Z",
        "2026-11-21T19:21:00Z",
    ),
    "21 13 22 11 *": (
        "2026-11-22",
        "2026-11-22-13-06-utc",
        "2026-11-22T13:06:00Z",
        "2026-11-22T13:21:00Z",
    ),
    "21 13 23 11 *": (
        "2026-11-23",
        "2026-11-23-13-06-utc",
        "2026-11-23T13:06:00Z",
        "2026-11-23T13:21:00Z",
    ),
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
    event_schedule: str,
    manual_slot: str,
    utc_date: str,
) -> SlotResolution:
    """Resolve an audit slot and reject stale or unexpected scheduled events."""
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


def _run_window_matches(run: dict[str, Any], start: str, end: str, current_run_id: str) -> bool:
    if str(run.get("id", "")) == current_run_id:
        return False
    created_at = run.get("created_at")
    return isinstance(created_at, str) and start <= created_at < end


def build_watchdog_report(
    *,
    event_schedule: str,
    utc_date: str,
    current_run_id: str,
    runs_payload: str,
) -> tuple[str, int]:
    """Return a watchdog summary and nonzero status unless its audit is verified."""
    schedule = WATCHDOG_SCHEDULES.get(event_schedule)
    if schedule is None:
        slot = "unknown"
        error = "watchdog schedule expression is not allowlisted"
        matching_runs: list[dict[str, Any]] = []
    else:
        expected_date, slot, target_start, target_end = schedule
        error = ""
        if not _valid_iso_date(utc_date):
            error = "watchdog runner UTC date is missing or invalid"
        elif utc_date != expected_date:
            error = f"watchdog runner UTC date {utc_date} differs from expected date {expected_date}"

        try:
            payload = json.loads(runs_payload)
            workflow_runs = payload["workflow_runs"]
            if not isinstance(workflow_runs, list):
                raise ValueError("workflow_runs is not a list")
            matching_runs = [
                run
                for run in workflow_runs
                if isinstance(run, dict) and _run_window_matches(run, target_start, target_end, current_run_id)
            ]
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            error = error or "Actions run history is missing or could not be parsed"
            matching_runs = []

    if error:
        verdict = "INCOMPLETE"
        detail = error
        exit_code = 1
    elif len(matching_runs) == 0:
        verdict = "MISSED"
        detail = "no scheduled audit run was created within 15 minutes of its UTC slot"
        exit_code = 1
    elif len(matching_runs) != 1:
        verdict = "INCOMPLETE"
        detail = f"expected one scheduled audit run; found {len(matching_runs)}"
        exit_code = 1
    else:
        audit_run = matching_runs[0]
        status = audit_run.get("status", "unknown")
        conclusion = audit_run.get("conclusion") or "pending"
        url = audit_run.get("html_url", "unavailable")
        if status == "completed" and conclusion == "success":
            verdict = "COMPLETE"
            detail = f"scheduled audit succeeded: [{url}]({url})"
            exit_code = 0
        elif status == "completed":
            verdict = "FAILED"
            detail = f"scheduled audit concluded {conclusion}: [{url}]({url})"
            exit_code = 1
        else:
            verdict = "INCOMPLETE"
            detail = f"scheduled audit is {status} with conclusion {conclusion}: [{url}]({url})"
            exit_code = 1

    lines = [
        f"## Scheduled audit watchdog: {slot}",
        "",
        f"**{verdict}:** {detail}.",
        "",
        "A manual replacement does not erase a missed scheduled event. If this watchdog is absent or incomplete, check Actions and run the audit manually with confirmation.",
    ]
    return "\n".join(lines) + "\n", exit_code


def main() -> int:
    import os
    import sys

    report, exit_code = build_watchdog_report(
        event_schedule=os.environ.get("EVENT_SCHEDULE", ""),
        utc_date=os.environ.get("RUNNER_UTC_DATE", ""),
        current_run_id=os.environ.get("CURRENT_RUN_ID", ""),
        runs_payload=sys.stdin.read(),
    )
    print(report, end="")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
