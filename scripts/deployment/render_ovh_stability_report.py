#!/usr/bin/env python3
"""Write a compact stability report for the temporary 2026 OVH audits."""

from __future__ import annotations

import os
import sys
from collections.abc import Mapping

from ovh_audit_schedule import resolve_audit_slot


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
    "cgroup_anon_bytes": 567_111_680,
    "cgroup_file_bytes": 168_394_752,
    "cgroup_inactive_file_bytes": 167_886_848,
    "cgroup_slab_bytes": 6_031_056,
    "cgroup_kernel_bytes": 19_214_336,
    "cgroup_event_max": 0,
    "cgroup_oom": 0,
    "cgroup_oom_kill": 0,
    "cgroup_oom_group_kill": 0,
    "node_rss_kib": 625_580,
    "docker_cpu_pct": 42.93,
    "node_cpu_pct": 42.9,
    "root_fs_free_bytes": 17_762_816_000,
}
MEMORY_HISTORY = (
    {
        "label": "T+1",
        "captured_at": "2026-11-21T14:06:51Z",
        "run_id": "44912208340",
        "node_rss_kib": 625_580,
        "cgroup_current_bytes": 754_720_768,
        "cgroup_anon_bytes": 567_111_680,
        "cgroup_file_bytes": 168_394_752,
        "cgroup_inactive_file_bytes": 167_886_848,
    },
    {
        "label": "T+9",
        "captured_at": "2026-11-21T22:13:31Z",
        "run_id": "44955592498",
        "node_rss_kib": 986_920,
        "cgroup_current_bytes": 1_668_022_272,
        "cgroup_anon_bytes": 929_988_608,
        "cgroup_file_bytes": 695_971_840,
        "cgroup_inactive_file_bytes": 694_792_192,
    },
    {
        "label": "T+24 catch-up (2h39 late)",
        "captured_at": "2026-11-22T15:45:38Z",
        "run_id": "45040040090",
        "node_rss_kib": 1_165_308,
        "cgroup_current_bytes": 2_197_082_112,
        "cgroup_anon_bytes": 1_112_657_920,
        "cgroup_file_bytes": 1_014_181_888,
        "cgroup_inactive_file_bytes": 983_101_440,
    },
    {
        "label": "T+24 follow-up",
        "captured_at": "2026-11-22T16:01:05Z",
        "run_id": "45041417570",
        "node_rss_kib": 1_186_432,
        "cgroup_current_bytes": 2_206_162_944,
        "cgroup_anon_bytes": 1_134_288_896,
        "cgroup_file_bytes": 1_001_369_600,
        "cgroup_inactive_file_bytes": 970_244_096,
    },
)
PUBLIC_HTTPS_EXPECTED = {
    "healthz_status": "200",
    "home_status": "200",
    "tcg_status": "200",
    "manifest_status": "200",
    "service_worker_status": "200",
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
    "cgroup_event_max",
    "node_rss_kib",
    "cgroup_anon_bytes",
    "cgroup_file_bytes",
    "cgroup_inactive_file_bytes",
    "cgroup_slab_bytes",
    "cgroup_kernel_bytes",
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


def cgroup_without_inactive_file(values: Mapping[str, str]) -> int | None:
    current = _numeric(values, "cgroup_current_bytes", integer=True)
    inactive_file = _numeric(values, "cgroup_inactive_file_bytes", integer=True)
    if current is None or inactive_file is None or current < inactive_file:
        return None
    return current - inactive_file


def show_cgroup_without_inactive_file(values: Mapping[str, str]) -> str:
    value = cgroup_without_inactive_file(values)
    return str(value) if value is not None else "unavailable"


def _slot(values: Mapping[str, str]) -> tuple[str, str | None]:
    resolution = resolve_audit_slot(
        event_name=values.get("event_name", ""),
        event_schedule=values.get("event_schedule", ""),
        manual_slot=values.get("manual_audit_slot", "adhoc") or "adhoc",
        utc_date=values.get("audit_utc_date", ""),
    )
    date_valid_output = values.get("audit_date_valid", "").strip().lower()
    if date_valid_output == "false" and not resolution.error:
        return resolution.slot, values.get("audit_date_error", "") or "runner UTC date did not pass validation"
    return resolution.slot, resolution.error


def build_report(values: Mapping[str, str]) -> tuple[str, int]:
    """Return Markdown plus process exit status (0=GO, 1=NO-GO, 2=incomplete)."""
    slot, slot_error = _slot(values)
    audit_result = values.get("audit_result", "unknown")
    confirmation = values.get("confirm_read_only_inspection", "false").lower() == "true"
    memory_reasons: list[str] = []
    memory_incomplete: list[str] = []
    auth_reasons: list[str] = []
    auth_incomplete: list[str] = []
    https_reasons: list[str] = []
    https_incomplete: list[str] = []
    overall_reasons: list[str] = []
    overall_incomplete: list[str] = []

    if slot_error:
        overall_incomplete.append(slot_error)
    if audit_result != "success":
        if audit_result == "skipped" and values.get("event_name") == "workflow_dispatch" and not confirmation:
            overall_incomplete.append("manual dispatch omitted the required read-only confirmation")
        elif audit_result == "skipped":
            overall_incomplete.append("inspection job was skipped; no audit result exists")
        elif audit_result == "failure":
            overall_incomplete.append("inspection job failed before all audit steps completed")
        else:
            overall_incomplete.append(f"inspection job result is {audit_result}")

    for key in REQUIRED_NUMERIC:
        if _numeric(values, key, integer=key not in {"docker_cpu_pct", "node_cpu_pct"}) is None:
            memory_incomplete.append(f"{key} is missing or unavailable")
    if _missing(values, "audit_captured_at"):
        memory_incomplete.append("memory capture UTC timestamp is missing")

    started_at = values.get("container_started_at", "")
    if not started_at:
        memory_incomplete.append("container start time is missing")
    elif started_at != REFERENCE["container_started_at"]:
        memory_reasons.append("container start time differs from the T+1 reference")

    if _missing(values, "container_status"):
        memory_incomplete.append("container status is missing")
    elif values.get("container_status") != "running":
        memory_reasons.append("production container is not running")
    if _missing(values, "container_health"):
        memory_incomplete.append("Docker health status is missing")
    elif values.get("container_health") != "healthy":
        memory_reasons.append("Docker health is not healthy")
    if _numeric(values, "restart_count", integer=True) != 0:
        if _numeric(values, "restart_count", integer=True) is not None:
            memory_reasons.append("container has restarted since deployment")
    if values.get("container_oom_killed", "").lower() not in {"true", "false"}:
        memory_incomplete.append("Docker OOM-killed state is missing")
    elif values.get("container_oom_killed", "").lower() == "true":
        memory_reasons.append("Docker reports the production container was OOM-killed")
    log_capture_available = values.get("log_capture_available", "").lower() == "true"
    if not log_capture_available:
        memory_incomplete.append("recent production logs could not be captured; V8 and Node error classifications are unverified")
    else:
        if values.get("v8_heap_oom", "").lower() not in {"true", "false"}:
            memory_incomplete.append("V8 OOM log classification is missing or unavailable")
        elif values.get("v8_heap_oom", "").lower() == "true":
            memory_reasons.append("a V8 heap OOM signature was found in recent logs")
        if values.get("node_fatal", "").lower() not in {"true", "false"}:
            memory_incomplete.append("Node fatal log classification is missing or unavailable")
        elif values.get("node_fatal", "").lower() == "true":
            memory_reasons.append("a Node fatal error signature was found in recent logs")
    for key in ("cgroup_event_max", "cgroup_oom", "cgroup_oom_kill", "cgroup_oom_group_kill"):
        value = _numeric(values, key, integer=True)
        if value is not None and value != 0:
            if key == "cgroup_event_max":
                memory_reasons.append(f"cgroup memory.events max pressure count is {int(value)}")
            else:
                memory_reasons.append(f"{key} is {int(value)}")
    for key, expected in PUBLIC_HTTPS_EXPECTED.items():
        if _missing(values, key):
            https_incomplete.append(f"HTTPS probe {key} is missing")
        elif values.get(key) != expected:
            https_reasons.append(f"HTTPS probe {key} returned {values.get(key, 'missing')} (expected {expected})")
    if _missing(values, "auth_session_status"):
        auth_incomplete.append("Supabase Auth session probe is missing")
    elif values.get("auth_session_status") != "200":
        auth_reasons.append(f"Supabase Auth session endpoint returned HTTP {values.get('auth_session_status')}")

    is_final = slot == "2026-11-23-13-06-utc"
    rss = _numeric(values, "node_rss_kib", integer=True)
    cgroup_anon = _numeric(values, "cgroup_anon_bytes", integer=True)
    if is_final:
        # A 25% ceiling flags sustained process/anonymous-memory growth even without OOMs.
        if rss is not None and rss > int(REFERENCE["node_rss_kib"] * 1.25):
            memory_reasons.append("T+48 Node RSS exceeds 125% of the T+1 reference")
        if cgroup_anon is not None and cgroup_anon > int(REFERENCE["cgroup_anon_bytes"] * 1.25):
            memory_reasons.append("T+48 cgroup anonymous memory exceeds 125% of the T+1 reference")
        cgroup_excluding_inactive_file = cgroup_without_inactive_file(values)
        if cgroup_excluding_inactive_file is None:
            memory_incomplete.append(
                "T+48 cgroup current and inactive_file are missing or inconsistent; "
                "the cgroup remainder cannot be compared"
            )
        elif cgroup_excluding_inactive_file > int(
            (REFERENCE["cgroup_current_bytes"] - REFERENCE["cgroup_inactive_file_bytes"]) * 1.25
        ):
            memory_reasons.append(
                "T+48 cgroup outside inactive_file exceeds 125% of the T+1 reference; "
                "this cgroup remainder is not a heap measurement"
            )

    def classify(reasons: list[str], incomplete: list[str]) -> str:
        if reasons:
            return "NO-GO"
        if incomplete:
            return "INCOMPLETE"
        return "GO"

    memory_verdict = classify(memory_reasons, memory_incomplete)
    auth_verdict = classify(auth_reasons, auth_incomplete)
    https_verdict = classify(https_reasons, https_incomplete)
    if memory_reasons:
        overall_reasons.extend(f"OVH memory: {reason}" for reason in memory_reasons)
    if auth_reasons:
        overall_reasons.extend(f"Supabase Auth: {reason}" for reason in auth_reasons)
    if https_reasons:
        overall_reasons.extend(f"HTTPS: {reason}" for reason in https_reasons)
    if memory_incomplete:
        overall_incomplete.extend(f"OVH memory: {reason}" for reason in memory_incomplete)
    if auth_incomplete:
        overall_incomplete.extend(f"Supabase Auth: {reason}" for reason in auth_incomplete)
    if https_incomplete:
        overall_incomplete.extend(f"HTTPS: {reason}" for reason in https_incomplete)

    verdict = classify(overall_reasons, overall_incomplete)
    exit_code = {"GO": 0, "NO-GO": 1, "INCOMPLETE": 2}[verdict]

    def show(key: str) -> str:
        return values.get(key, "unavailable") or "unavailable"

    lines = [
        f"## OVH stability audit: {slot}",
        "",
        f"**Verdict: {verdict}**",
        f"**OVH memory verdict: {memory_verdict}**",
        f"**Supabase Auth verdict: {auth_verdict}**",
        f"**Public HTTPS verdict: {https_verdict}**",
        f"Audit job: `{audit_result}`. Reference: T+1 run [{REFERENCE_RUN_ID}](https://github.com/teefloo/Lunidex/actions/runs/{REFERENCE_RUN_ID}) captured {REFERENCE_CAPTURED_AT}.",
        f"Audit UTC date: `{values.get('audit_utc_date', 'unavailable') or 'unavailable'}`.",
        f"Memory capture UTC: `{values.get('audit_captured_at', 'unavailable') or 'unavailable'}`.",
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
        f"| Cgroup hors inactive_file (pas le heap) | {REFERENCE['cgroup_current_bytes'] - REFERENCE['cgroup_inactive_file_bytes']} B | {show_cgroup_without_inactive_file(values)} B |",
        f"| Cgroup anon (not V8 heap) | {REFERENCE['cgroup_anon_bytes']} B | {show('cgroup_anon_bytes')} B |",
        f"| Cgroup file / inactive_file cache | {REFERENCE['cgroup_file_bytes']} / {REFERENCE['cgroup_inactive_file_bytes']} B | {show('cgroup_file_bytes')} / {show('cgroup_inactive_file_bytes')} B |",
        f"| Cgroup kernel / slab | {REFERENCE['cgroup_kernel_bytes']} / {REFERENCE['cgroup_slab_bytes']} B | {show('cgroup_kernel_bytes')} / {show('cgroup_slab_bytes')} B |",
        f"| Cgroup memory.events max / oom / oom-kill / group-kill | {REFERENCE['cgroup_event_max']} / 0 / 0 / 0 | {show('cgroup_event_max')} / {show('cgroup_oom')} / {show('cgroup_oom_kill')} / {show('cgroup_oom_group_kill')} |",
        f"| Node RSS | {REFERENCE['node_rss_kib']} KiB | {show('node_rss_kib')} KiB |",
        f"| CPU (Docker / Node) | {REFERENCE['docker_cpu_pct']}% / {REFERENCE['node_cpu_pct']}% | {show('docker_cpu_pct')}% / {show('node_cpu_pct')}% |",
        f"| Host RAM available | ~2.6 GiB | {show('host_ram_available_bytes')} B |",
        f"| Root filesystem free | {REFERENCE['root_fs_free_bytes']} B | {show('root_fs_free_bytes')} B |",
        "| HTTPS: health, home, TCG, manifest, service worker | 200, 200, 200, 200, 200 | "
        f"{show('healthz_status')}, {show('home_status')}, {show('tcg_status')}, {show('manifest_status')}, {show('service_worker_status')} |",
        f"| HTTPS: auth session / unauthenticated profile / TLS verification | 200 / 401 / 0 | {show('auth_session_status')} / {show('profile_status')} / {show('tls_verify_result')} |",
        "",
    ]
    lines.extend(
        [
            "### Memory trend snapshots",
            "",
            "| Capture UTC | Sample | Run | Node RSS (KiB) | cgroup current (B) | anon (B) | file (B) | inactive_file (B) | cgroup hors inactive_file (pas le heap) (B) |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for sample in MEMORY_HISTORY:
        lines.append(
            f"| {sample['captured_at']} | {sample['label']} | "
            f"[{sample['run_id']}](https://github.com/teefloo/Lunidex/actions/runs/{sample['run_id']}) | "
            f"{sample['node_rss_kib']} | {sample['cgroup_current_bytes']} | {sample['cgroup_anon_bytes']} | "
            f"{sample['cgroup_file_bytes']} | {sample['cgroup_inactive_file_bytes']} | "
            f"{sample['cgroup_current_bytes'] - sample['cgroup_inactive_file_bytes']} |"
        )
    lines.append(
        f"| {values.get('audit_captured_at', 'unavailable') or 'unavailable'} | Current audit | current | "
        f"{show('node_rss_kib')} | {show('cgroup_current_bytes')} | {show('cgroup_anon_bytes')} | "
        f"{show('cgroup_file_bytes')} | {show('cgroup_inactive_file_bytes')} | "
        f"{show_cgroup_without_inactive_file(values)} |"
    )
    lines.extend(
        [
            "",
            "`anon` is cgroup anonymous memory, not a V8 heap measurement. `inactive_file` is shown separately as file-cache memory. `cgroup hors inactive_file` is only the cgroup total excluding this file-cache category; it is not Node RSS or a V8 heap size. These are point-in-time samples, not continuous profiling.",
            "",
        ]
    )
    if values.get("caddy_access_logs_available", "").lower() != "true":
        lines.extend(["**Observability note:** Caddy access logs are unavailable; this audit cannot calculate an HTTP 5xx rate.", ""])
    if memory_incomplete:
        lines.append("**OVH memory incomplete:** " + "; ".join(memory_incomplete) + ".")
    if memory_reasons:
        lines.append("**OVH memory NO-GO reasons:** " + "; ".join(memory_reasons) + ".")
    if auth_incomplete:
        lines.append("**Supabase Auth incomplete:** " + "; ".join(auth_incomplete) + ".")
    if auth_reasons:
        lines.append("**Supabase Auth NO-GO reasons:** " + "; ".join(auth_reasons) + ".")
    if https_incomplete:
        lines.append("**HTTPS incomplete:** " + "; ".join(https_incomplete) + ".")
    if https_reasons:
        lines.append("**HTTPS NO-GO reasons:** " + "; ".join(https_reasons) + ".")
    if overall_incomplete:
        lines.append("**Overall incomplete:** " + "; ".join(overall_incomplete) + ".")
    if overall_reasons:
        lines.append("**Overall NO-GO reasons:** " + "; ".join(overall_reasons) + ".")
    if is_final:
        lines.extend(
            [
                "",
                "T+48 memory gate: OVH memory GO requires Node RSS, cgroup anonymous memory, and cgroup current outside inactive_file each to remain at or below 125% of their T+1 references, zero cgroup max/OOM events, and healthy Docker status. Missing or inconsistent cgroup/current cache metrics make memory INCOMPLETE. Supabase Auth and HTTPS are reported independently.",
            ]
        )
    lines.append("")
    return "\n".join(lines), exit_code


def normalize_environment(values: Mapping[str, str]) -> dict[str, str]:
    """Normalize GitHub's uppercase step environment names for report keys."""
    return {key.lower(): value for key, value in values.items()}


def main() -> int:
    report, exit_code = build_report(normalize_environment(os.environ))
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(report)
    else:
        print(report, end="")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
