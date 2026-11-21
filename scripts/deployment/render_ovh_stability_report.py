#!/usr/bin/env python3
"""Write a compact stability report for the temporary 2026 OVH audits."""

from __future__ import annotations

import os
import sys
from collections.abc import Mapping


REFERENCE_RUN_ID = "44912208340"
REFERENCE_CAPTURED_AT = "2026-11-21T14:06:45Z"
REFERENCE = {
    "container_started_at": "2026-11-21T13:06:14.823655053Z",
    "restart_count": 0,
    "container_status": "running",
    "container_health": "healthy",
    "container_oom_killed": False,
    "v8_heap_oom": False,
    "node_fatal": False,
    "cgroup_current_bytes": 754_720_768,
    "cgroup_peak_bytes": 778_629_120,
    "cgroup_oom": 0,
    "cgroup_oom_kill": 0,
    "cgroup_oom_group_kill": 0,
    "node_rss_kib": 625_580,
    "docker_cpu_pct": 42.93,
    "node_cpu_pct": 42.9,
    "root_fs_free_bytes": 17_762_816_000,
}
ALLOWED_SLOTS = {
    "2026-11-21-19-06-utc",
    "2026-11-22-13-06-utc",
    "2026-11-23-13-06-utc",
    "adhoc",
}
SCHEDULE_SLOTS = {
    "6 19 21 11 *": ("2026-11-21", "2026-11-21-19-06-utc"),
    "6 13 22 11 *": ("2026-11-22", "2026-11-22-13-06-utc"),
    "6 13 23 11 *": ("2026-11-23", "2026-11-23-13-06-utc"),
}
HTTPS_EXPECTED = {
    "healthz_status": "200",
    "home_status": "200",
    "tcg_status": "200",
    "manifest_status": "200",
    "service_worker_status": "200",
    "auth_session_status": "200",
    "profile_status": "401",
    "tls_verify_result": "0",
}
REQUIRED_NUMERIC = (
    "restart_count",
    "docker_cpu_pct",
    "host_ram_available_bytes",
    "root_fs_free_bytes",
    "cgroup_current_bytes",
    "cgroup_peak_bytes",
    "cgroup_oom",
    "cgroup_oom_kill",
    "cgroup_oom_group_kill",
    "node_rss_kib",
    "node_cpu_pct",
)


def _numeric(values: Mapping[str, str], key: str, *, integer: bool = False) -> int | float | None:
    raw = values.get(key, "").strip()
    if not raw or raw == "unavailable":
        return None
    try:
        return int(raw) if integer else float(raw)
    except ValueError:
        return None


def _missing(values: Mapping[str, str], key: str) -> bool:
    return values.get(key, "").strip().lower() in {"", "unavailable"}


def _slot(values: Mapping[str, str]) -> tuple[str, str | None]:
    event_name = values.get("event_name", "")
    if event_name == "schedule":
        schedule = values.get("event_schedule", "")
        expected = SCHEDULE_SLOTS.get(schedule)
        run_started_at = values.get("run_started_at", "")
        if expected is None:
            return "invalid-schedule", "schedule expression is not allowlisted"
        expected_date, slot = expected
        if not run_started_at.startswith(expected_date):
            return slot, f"scheduled event ran outside its allowlisted UTC date ({expected_date})"
        return slot, None

    manual_slot = values.get("manual_audit_slot", "adhoc") or "adhoc"
    if manual_slot not in ALLOWED_SLOTS:
        return "invalid-manual-slot", "manual audit slot is not allowlisted"
    if manual_slot != "adhoc":
        expected_date = manual_slot[:10]
        run_started_at = values.get("run_started_at", "")
        if not run_started_at.startswith(expected_date):
            return manual_slot, f"manual replacement ran outside its allowlisted UTC date ({expected_date})"
    return manual_slot, None


def build_report(values: Mapping[str, str]) -> tuple[str, int]:
    """Return Markdown plus process exit status (0=GO, 1=NO-GO, 2=incomplete)."""
    slot, slot_error = _slot(values)
    audit_result = values.get("audit_result", "unknown")
    confirmation = values.get("confirm_read_only_inspection", "false").lower() == "true"
    reasons: list[str] = []
    incomplete: list[str] = []

    if slot_error:
        incomplete.append(slot_error)
    if audit_result != "success":
        if audit_result == "skipped" and values.get("event_name") == "workflow_dispatch" and not confirmation:
            incomplete.append("manual dispatch omitted the required read-only confirmation")
        elif audit_result == "skipped":
            incomplete.append("inspection job was skipped; no audit result exists")
        elif audit_result == "failure":
            reasons.append("inspection job failed before all audit steps completed")
        else:
            incomplete.append(f"inspection job result is {audit_result}")

    for key in REQUIRED_NUMERIC:
        if _numeric(values, key, integer=key not in {"docker_cpu_pct", "node_cpu_pct"}) is None:
            incomplete.append(f"{key} is missing or unavailable")

    started_at = values.get("container_started_at", "")
    if not started_at:
        incomplete.append("container start time is missing")
    elif started_at != REFERENCE["container_started_at"]:
        reasons.append("container start time differs from the T+1 reference")

    if _missing(values, "container_status"):
        incomplete.append("container status is missing")
    elif values.get("container_status") != "running":
        reasons.append("production container is not running")
    if _missing(values, "container_health"):
        incomplete.append("Docker health status is missing")
    elif values.get("container_health") != "healthy":
        reasons.append("Docker health is not healthy")
    if _numeric(values, "restart_count", integer=True) != 0:
        if _numeric(values, "restart_count", integer=True) is not None:
            reasons.append("container has restarted since deployment")
    if values.get("container_oom_killed", "").lower() not in {"true", "false"}:
        incomplete.append("Docker OOM-killed state is missing")
    elif values.get("container_oom_killed", "").lower() == "true":
        reasons.append("Docker reports the production container was OOM-killed")
    log_capture_available = values.get("log_capture_available", "").lower() == "true"
    if not log_capture_available:
        incomplete.append("recent production logs could not be captured; V8 and Node error classifications are unverified")
    else:
        if values.get("v8_heap_oom", "").lower() not in {"true", "false"}:
            incomplete.append("V8 OOM log classification is missing or unavailable")
        elif values.get("v8_heap_oom", "").lower() == "true":
            reasons.append("a V8 heap OOM signature was found in recent logs")
        if values.get("node_fatal", "").lower() not in {"true", "false"}:
            incomplete.append("Node fatal log classification is missing or unavailable")
        elif values.get("node_fatal", "").lower() == "true":
            reasons.append("a Node fatal error signature was found in recent logs")
    for key in ("cgroup_oom", "cgroup_oom_kill", "cgroup_oom_group_kill"):
        value = _numeric(values, key, integer=True)
        if value is not None and value != 0:
            reasons.append(f"{key} is {int(value)}")
    for key, expected in HTTPS_EXPECTED.items():
        if _missing(values, key):
            incomplete.append(f"HTTPS probe {key} is missing")
        elif values.get(key) != expected:
            reasons.append(f"HTTPS probe {key} returned {values.get(key, 'missing')} (expected {expected})")

    is_final = slot == "2026-11-23-13-06-utc"
    rss = _numeric(values, "node_rss_kib", integer=True)
    cgroup_current = _numeric(values, "cgroup_current_bytes", integer=True)
    if is_final:
        # A 25% ceiling gives room for normal load variance while flagging sustained growth.
        if rss is not None and rss > int(REFERENCE["node_rss_kib"] * 1.25):
            reasons.append("T+48 Node RSS exceeds 125% of the T+1 reference")
        if cgroup_current is not None and cgroup_current > int(REFERENCE["cgroup_current_bytes"] * 1.25):
            reasons.append("T+48 cgroup memory exceeds 125% of the T+1 reference")

    if reasons:
        verdict, exit_code = "NO-GO", 1
    elif incomplete:
        verdict, exit_code = "INCOMPLETE", 2
    else:
        verdict, exit_code = "GO", 0

    def show(key: str) -> str:
        return values.get(key, "unavailable") or "unavailable"

    lines = [
        f"## OVH stability audit: {slot}",
        "",
        f"**Verdict: {verdict}**",
        f"Audit job: `{audit_result}`. Reference: T+1 run [{REFERENCE_RUN_ID}](https://github.com/teefloo/Lunidex/actions/runs/{REFERENCE_RUN_ID}) captured {REFERENCE_CAPTURED_AT}.",
        "",
        "| Metric | T+1 reference | Current audit |",
        "|---|---:|---:|",
        f"| Restart count | {REFERENCE['restart_count']} | {show('restart_count')} |",
        f"| Container start | `{REFERENCE['container_started_at']}` | `{show('container_started_at')}` |",
        f"| Docker status / health | running / healthy | {show('container_status')} / {show('container_health')} |",
        f"| Container OOM-killed | false | {show('container_oom_killed')} |",
        f"| Recent log capture | true | {show('log_capture_available')} |",
        f"| V8 / Node fatal signature | false / false | {show('v8_heap_oom')} / {show('node_fatal')} |",
        f"| Cgroup current / peak | {REFERENCE['cgroup_current_bytes']} / {REFERENCE['cgroup_peak_bytes']} B | {show('cgroup_current_bytes')} / {show('cgroup_peak_bytes')} B |",
        f"| Cgroup OOM / OOM-kill / group kill | 0 / 0 / 0 | {show('cgroup_oom')} / {show('cgroup_oom_kill')} / {show('cgroup_oom_group_kill')} |",
        f"| Node RSS | {REFERENCE['node_rss_kib']} KiB | {show('node_rss_kib')} KiB |",
        f"| CPU (Docker / Node) | {REFERENCE['docker_cpu_pct']}% / {REFERENCE['node_cpu_pct']}% | {show('docker_cpu_pct')}% / {show('node_cpu_pct')}% |",
        f"| Host RAM available | ~2.6 GiB | {show('host_ram_available_bytes')} B |",
        f"| Root filesystem free | {REFERENCE['root_fs_free_bytes']} B | {show('root_fs_free_bytes')} B |",
        "| HTTPS: health, home, TCG, manifest, service worker | 200, 200, 200, 200, 200 | "
        f"{show('healthz_status')}, {show('home_status')}, {show('tcg_status')}, {show('manifest_status')}, {show('service_worker_status')} |",
        f"| HTTPS: auth session / unauthenticated profile / TLS verification | 200 / 401 / 0 | {show('auth_session_status')} / {show('profile_status')} / {show('tls_verify_result')} |",
        "",
    ]
    if values.get("caddy_access_logs_available", "").lower() != "true":
        lines.extend(["**Observability note:** Caddy access logs are unavailable; this audit cannot calculate an HTTP 5xx rate.", ""])
    if incomplete:
        lines.append("**Incomplete:** " + "; ".join(incomplete) + ".")
    if reasons:
        lines.append("**NO-GO reasons:** " + "; ".join(reasons) + ".")
    if is_final:
        lines.extend(
            [
                "",
                "T+48 memory gate: GO requires Node RSS and cgroup current memory each to remain at or below 125% of the T+1 reference, in addition to zero restarts/OOMs and healthy HTTPS probes.",
                "**Temporary schedule cleanup required:** remove the 2026 audit and watchdog cron entries in a follow-up PR after this report. No write permission is granted to this workflow.",
            ]
        )
    lines.append("")
    return "\n".join(lines), exit_code


def main() -> int:
    report, exit_code = build_report(os.environ)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(report)
    else:
        print(report, end="")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
