#!/usr/bin/env python3
"""Read current Free-plan Neon project usage and render quota warnings."""

from __future__ import annotations

import json
import math
import os
import re
import sys
from collections.abc import Mapping
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


FREE_COMPUTE_CU_HOURS = 100
FREE_EGRESS_BYTES = 5_000_000_000
ALERT_THRESHOLDS = (50, 75, 90)
EXPECTED_PROJECT_ID = "withered-block-08834461"
PROJECT_ID_PATTERN = re.compile(r"^[a-z0-9-]{1,64}$")


def _project(payload: Any) -> Mapping[str, Any] | None:
    if not isinstance(payload, Mapping):
        return None
    project = payload.get("project", payload)
    return project if isinstance(project, Mapping) else None


def _nonnegative_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        number = float(value)
    except (OverflowError, ValueError):
        return None
    if not math.isfinite(number) or number < 0:
        return None
    return number


def _crossed_thresholds(usage: float, limit: float) -> list[int]:
    percent = usage / limit * 100
    return [threshold for threshold in ALERT_THRESHOLDS if percent >= threshold]


def assess_usage(
    payload: Any,
    *,
    api_key_present: bool,
    api_error: str | None = None,
) -> tuple[dict[str, Any], int]:
    """Return a safe summary and exit code: 0=below alert, 1=90%+, 2=incomplete."""
    if not api_key_present:
        return ({"status": "INCOMPLETE", "reason": "NEON_API_KEY is not configured"}, 2)
    if api_error:
        return ({"status": "INCOMPLETE", "reason": api_error}, 2)

    project = _project(payload)
    if project is None:
        return ({"status": "INCOMPLETE", "reason": "Neon API response did not include a project"}, 2)

    compute_seconds = _nonnegative_number(project.get("compute_time_seconds"))
    egress_bytes = _nonnegative_number(project.get("data_transfer_bytes"))
    if compute_seconds is None or egress_bytes is None:
        return ({"status": "INCOMPLETE", "reason": "Neon API response is missing valid compute or egress usage"}, 2)

    compute_cu_hours = compute_seconds / 3_600
    egress_gb = egress_bytes / 1_000_000_000
    compute_alerts = _crossed_thresholds(compute_cu_hours, FREE_COMPUTE_CU_HOURS)
    egress_alerts = _crossed_thresholds(egress_bytes, FREE_EGRESS_BYTES)
    status = "ALERT" if compute_alerts or egress_alerts else "GO"
    return ({
        "status": status,
        "compute_cu_hours": round(compute_cu_hours, 3),
        "compute_limit_cu_hours": FREE_COMPUTE_CU_HOURS,
        "compute_percent": round(compute_cu_hours / FREE_COMPUTE_CU_HOURS * 100, 1),
        "compute_alerts": compute_alerts,
        "egress_gb": round(egress_gb, 3),
        "egress_limit_gb": FREE_EGRESS_BYTES / 1_000_000_000,
        "egress_percent": round(egress_bytes / FREE_EGRESS_BYTES * 100, 1),
        "egress_alerts": egress_alerts,
        "quota_reset_at": str(project.get("quota_reset_at") or "unavailable"),
    }, 1 if max(compute_alerts + egress_alerts, default=0) >= 90 else 0)


def fetch_project(api_key: str, project_id: str) -> Mapping[str, Any]:
    if project_id != EXPECTED_PROJECT_ID or not PROJECT_ID_PATTERN.fullmatch(project_id):
        raise ValueError("NEON_PROJECT_ID does not match the configured Lunidex project")
    request = Request(
        f"https://console.neon.tech/api/v2/projects/{project_id}",
        headers={"Accept": "application/json", "Authorization": f"Bearer {api_key}"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"Neon API returned HTTP {error.code}") from None
    except URLError:
        raise RuntimeError("Neon API request failed before a response was received") from None
    if not isinstance(payload, Mapping):
        raise RuntimeError("Neon API returned an invalid JSON object")
    return payload


def _write_summary(report: Mapping[str, Any]) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    lines = ["## Neon Free quota monitor", "", f"**Status: {report['status']}**", ""]
    if report["status"] == "INCOMPLETE":
        lines.append(f"No usage verdict: {report.get('reason', 'required usage unavailable')}.")
    else:
        lines.extend([
            "| Resource | Usage | Quota | Used | Thresholds reached |",
            "|---|---:|---:|---:|---|",
            f"| Compute | {report['compute_cu_hours']} CU-h | {report['compute_limit_cu_hours']} CU-h | {report['compute_percent']}% | {report['compute_alerts'] or 'none'} |",
            f"| Public egress | {report['egress_gb']} GB | {report['egress_limit_gb']} GB | {report['egress_percent']}% | {report['egress_alerts'] or 'none'} |",
            "",
            f"Quota period reset: `{report['quota_reset_at']}`.",
            "Usage was read from the Neon Management API only; no SQL or Auth request was made.",
        ])
    content = "\n".join(lines) + "\n"
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(content)
    else:
        sys.stdout.write(content)


def main() -> int:
    api_key = os.environ.get("NEON_API_KEY", "")
    project_id = os.environ.get("NEON_PROJECT_ID", EXPECTED_PROJECT_ID)
    if not api_key:
        report, exit_code = assess_usage(None, api_key_present=False)
    else:
        try:
            payload = fetch_project(api_key, project_id)
            report, exit_code = assess_usage(payload, api_key_present=True)
        except (RuntimeError, ValueError) as error:
            report, exit_code = assess_usage(None, api_key_present=True, api_error=str(error))

    _write_summary(report)
    if report["status"] != "INCOMPLETE":
        for resource in ("compute", "egress"):
            for threshold in report[f"{resource}_alerts"]:
                percent = report[f"{resource}_percent"]
                command = "error" if threshold == 90 else "warning"
                print(f"::{command} title=Neon quota {threshold}%::{resource} usage is {percent}% of its Free-plan quota.")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
