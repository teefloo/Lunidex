#!/usr/bin/env python3
"""Read-only, redacted OVH production container diagnostics.

The resource-audit workflow sends this file to the VPS over SSH and runs it as
``python3 -``. It is deliberately dependency-free and never prints raw logs,
paths, request IDs, IP addresses, command arguments, or environment values.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
from collections import Counter
from pathlib import Path
from typing import Sequence


APP_CONTAINER = "lunidex-production-app"
CADDY_CONTAINER = "lunidex-caddy"
LOCALES = {"en", "fr", "es", "de", "it", "ja", "ko", "zh"}
ACCESS_LOG_PREFIX = "http.log.access"

CGROUP_EVENT_KEYS = (
    "low",
    "high",
    "max",
    "oom",
    "oom_kill",
    "oom_group_kill",
)
CGROUP_STAT_KEYS = (
    "anon",
    "file",
    "kernel",
    "kernel_stack",
    "pagetables",
    "sock",
    "shmem",
    "slab",
    "slab_reclaimable",
    "slab_unreclaimable",
    "active_anon",
    "inactive_anon",
    "active_file",
    "inactive_file",
)
PROC_STATUS_KEYS = ("VmPeak", "VmSize", "VmHWM", "VmRSS", "RssAnon", "RssFile", "RssShmem")
STATIC_METADATA_PATHS = {"/robots.txt", "/manifest.webmanifest", "/sitemap.xml", "/sw.js"}
LOCALIZED_ROUTE_FAMILIES = {
    "pokedex": "localized_pokedex",
    "pokemon": "localized_pokemon",
    "tcg": "localized_tcg",
    "team": "localized_team",
    "quiz": "localized_quiz",
}


def parse_numeric_pairs(text: str, allowed_keys: Sequence[str]) -> dict[str, int]:
    allowed = set(allowed_keys)
    parsed: dict[str, int] = {}
    for line in text.splitlines():
        fields = line.split()
        if len(fields) != 2 or fields[0] not in allowed or not fields[1].isdigit():
            continue
        parsed[fields[0]] = int(fields[1])
    return parsed


def parse_proc_status(text: str) -> dict[str, str]:
    allowed = set(PROC_STATUS_KEYS)
    parsed: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if not separator or key not in allowed:
            continue
        numeric = value.strip().split()
        if numeric and numeric[0].isdigit():
            parsed[key] = numeric[0]
    return parsed


def heap_sampler_status(environment: Sequence[str], now: int | None = None) -> dict[str, str]:
    """Return only redacted state labels, never environment values."""
    values: dict[str, str] = {}
    for entry in environment:
        name, separator, value = entry.partition("=")
        if separator and name in {
            "NODE_ENV",
            "LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC",
            "LUNIDEX_HEAP_SAMPLER_EXPIRES_AT",
            "LUNIDEX_HEAP_SAMPLER_RUN_ID",
        }:
            values[name] = value

    current_time = int(time.time()) if now is None else now
    enabled = values.get("LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC") == "enabled"
    expiration = values.get("LUNIDEX_HEAP_SAMPLER_EXPIRES_AT", "")
    if not expiration:
        expiry_state = "missing"
    elif not expiration.isdigit():
        expiry_state = "invalid"
    else:
        expiry_state = "future" if int(expiration) > current_time else "expired"

    run_id_valid = bool(re.fullmatch(r"[0-9]+-[0-9]+", values.get("LUNIDEX_HEAP_SAMPLER_RUN_ID", "")))
    window_active = (
        values.get("NODE_ENV") == "production"
        and enabled
        and expiry_state == "future"
        and run_id_valid
    )
    return {
        "enabled": str(enabled).lower(),
        "expiry_state": expiry_state,
        "run_id_valid": str(run_id_valid).lower(),
        "configured_window_active": str(window_active).lower(),
    }


def heap_sampler_summary_seen(log_text: str) -> bool:
    return any(
        re.search(r"(?:^|\s)LUNIDEX_HEAP_SAMPLE_SUMMARY_[0-9]+-[0-9]+=", line)
        for line in log_text.splitlines()
    )


def route_family(uri: object) -> str:
    """Map a Caddy URI to a fixed family name without retaining its path."""
    if not isinstance(uri, str) or not uri.startswith("/"):
        return "unclassified"

    # Caddy's URI includes the query string. Remove it before classification;
    # route identifiers are used only transiently and never enter the result.
    path = uri.split("?", 1)[0].split("#", 1)[0]
    if path in STATIC_METADATA_PATHS:
        return "static_metadata"

    segments = [segment for segment in path.split("/") if segment]
    if not segments:
        return "unclassified"

    if segments[0] == "api":
        if len(segments) > 1 and segments[1] == "healthz":
            return "api_health"
        if len(segments) > 1 and segments[1] == "auth":
            return "api_auth"
        if len(segments) > 1 and segments[1] == "cron":
            return "api_cron"
        return "api_other"

    if segments[0] not in LOCALES:
        return "unclassified"
    if len(segments) == 1:
        return "localized_home"
    return LOCALIZED_ROUTE_FAMILIES.get(segments[1], "localized_other")


def summarize_caddy_access_logs(text: str) -> tuple[bool, Counter[str]]:
    """Return access-log presence and route-family counts only."""
    counts: Counter[str] = Counter()
    found_access_log = False
    for line in text.splitlines():
        try:
            event = json.loads(line)
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(event, dict):
            continue
        logger = event.get("logger")
        request = event.get("request")
        is_access = (
            isinstance(logger, str)
            and logger.startswith(ACCESS_LOG_PREFIX)
            and isinstance(request, dict)
        ) or (event.get("msg") == "handled request" and isinstance(request, dict))
        if not is_access:
            continue
        found_access_log = True
        counts[route_family(request.get("uri"))] += 1
    return found_access_log, counts


def run_command(arguments: Sequence[str], timeout: int = 15) -> str | None:
    try:
        result = subprocess.run(
            arguments,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return result.stdout if result.returncode == 0 else None


def read_file(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return None


def emit(name: str, value: object) -> None:
    print(f"{name}={value}")


def container_details() -> tuple[str, int] | None:
    details = run_command(
        ["docker", "inspect", "--format", "{{.Id}} {{.State.Pid}}", APP_CONTAINER]
    )
    if not details:
        return None
    fields = details.strip().split()
    if len(fields) != 2 or not re.fullmatch(r"[a-f0-9]{64}", fields[0]) or not fields[1].isdigit():
        return None
    pid = int(fields[1])
    return (fields[0], pid) if pid > 0 else None


def container_cgroup_directory(container_id: str, host_pid: int) -> Path | None:
    cgroup_text = read_file(Path("/proc") / str(host_pid) / "cgroup")
    if cgroup_text is None:
        return None
    relative_path = next(
        (line.split("::", 1)[1] for line in cgroup_text.splitlines() if line.startswith("0::")),
        None,
    )
    if not relative_path or container_id not in relative_path:
        return None

    cgroup_root = Path("/sys/fs/cgroup")
    try:
        root_resolved = cgroup_root.resolve(strict=True)
        candidate = (cgroup_root / relative_path.lstrip("/")).resolve(strict=True)
        if not candidate.is_relative_to(root_resolved) or not candidate.is_dir():
            return None
    except OSError:
        return None
    return candidate


def report_cgroup_memory(cgroup_directory: Path | None) -> None:
    print("--- Production app cgroup memory ---")
    if cgroup_directory is None:
        emit("app_cgroup_memory_available", "false")
        return

    emit("app_cgroup_memory_available", "true")
    for filename, label in (("memory.current", "current"), ("memory.peak", "peak")):
        content = read_file(cgroup_directory / filename)
        value = content.strip() if content and content.strip().isdigit() else "unavailable"
        emit(f"app_cgroup_memory_{label}_bytes", value)

    events_text = read_file(cgroup_directory / "memory.events")
    events = parse_numeric_pairs(events_text or "", CGROUP_EVENT_KEYS)
    for key in CGROUP_EVENT_KEYS:
        emit(f"app_cgroup_memory_event_{key}", events.get(key, "unavailable"))

    stat_text = read_file(cgroup_directory / "memory.stat")
    stats = parse_numeric_pairs(stat_text or "", CGROUP_STAT_KEYS)
    for key in CGROUP_STAT_KEYS:
        emit(f"app_cgroup_memory_stat_{key}_bytes", stats.get(key, "unavailable"))


def parse_host_node_processes(process_table: str) -> list[tuple[int, str, int]]:
    matching_processes: list[tuple[int, str, int]] = []
    for line in process_table.splitlines()[1:]:
        fields = line.split(maxsplit=3)
        if len(fields) < 4 or not fields[0].isdigit() or not fields[2].isdigit():
            continue
        command = fields[3].strip()
        is_node_process = command == "node" or command == "next-server" or command.startswith(
            "next-server (v"
        )
        if not is_node_process:
            continue
        cpu = fields[1]
        if not re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", cpu):
            continue
        matching_processes.append((int(fields[0]), cpu, int(fields[2])))
    return matching_processes


def report_container_processes() -> None:
    print("--- Production app host process CPU / RSS ---")
    process_table = run_command(
        ["docker", "top", APP_CONTAINER, "-eo", "pid,pcpu,rss,comm"]
    )
    matching_processes = parse_host_node_processes(process_table or "")
    if not matching_processes:
        emit("app_host_runtime_processes", "unavailable")
        return
    for index, (pid, cpu, rss) in enumerate(matching_processes[:4], start=1):
        prefix = f"app_host_runtime_{index}"
        emit(f"{prefix}_pid", pid)
        emit(f"{prefix}_cpu_pct", cpu)
        emit(f"{prefix}_ps_rss_kib", rss)
        proc_text = read_file(Path("/proc") / str(pid) / "status")
        proc_status = parse_proc_status(proc_text or "")
        for key in ("VmRSS", "VmHWM", "RssAnon"):
            value = proc_status.get(key)
            emit(f"{prefix}_{key.lower()}_kib", value if value is not None else "unavailable")


def report_heap_sampler() -> None:
    print("--- Optional heap sampler state (values redacted) ---")
    environment_json = run_command(
        ["docker", "inspect", "--format", "{{json .Config.Env}}", APP_CONTAINER]
    )
    if environment_json is None:
        emit("heap_sampler_state_available", "false")
        return
    try:
        environment = json.loads(environment_json)
    except json.JSONDecodeError:
        emit("heap_sampler_state_available", "false")
        return
    if not isinstance(environment, list) or not all(isinstance(value, str) for value in environment):
        emit("heap_sampler_state_available", "false")
        return

    emit("heap_sampler_state_available", "true")
    for key, value in heap_sampler_status(environment).items():
        emit(f"heap_sampler_{key}", value)
    app_log_text = run_command(
        ["docker", "logs", "--since", "6h", "--tail", "5000", APP_CONTAINER]
    )
    if app_log_text is None:
        emit("heap_sampler_summary_log_available", "false")
    else:
        emit("heap_sampler_summary_seen_last_6h", str(heap_sampler_summary_seen(app_log_text)).lower())


def report_caddy_access_logs() -> None:
    print("--- Caddy access logs (route-family counts only) ---")
    log_text = run_command(["docker", "logs", "--since", "6h", "--tail", "5000", CADDY_CONTAINER])
    if log_text is None:
        emit("caddy_access_logs_available", "false")
        emit("caddy_access_logs_reason", "container_unavailable_or_unreadable")
        return
    available, counts = summarize_caddy_access_logs(log_text)
    emit("caddy_access_logs_available", str(available).lower())
    if not available:
        return
    emit("caddy_access_log_request_count", sum(counts.values()))
    for family in sorted(counts):
        emit(f"caddy_route_family_{family}_count", counts[family])


def main() -> None:
    details = container_details()
    if details is None:
        print("--- Production app container diagnostics ---")
        emit("app_container_available", "false")
        report_heap_sampler()
        report_caddy_access_logs()
        return

    container_id, host_pid = details
    print("--- Production app container diagnostics ---")
    emit("app_container_available", "true")
    report_cgroup_memory(container_cgroup_directory(container_id, host_pid))
    report_container_processes()
    report_heap_sampler()
    report_caddy_access_logs()


if __name__ == "__main__":
    main()
