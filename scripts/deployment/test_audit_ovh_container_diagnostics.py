import json
import unittest
from collections import Counter
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from audit_ovh_container_diagnostics import (
    parse_dangling_images,
    parse_docker_system_df,
    parse_root_disk_free_kib,
    heap_sampler_status,
    heap_sampler_summary_seen,
    parse_host_node_processes,
    parse_numeric_pairs,
    parse_proc_status,
    report_disk_resources,
    route_family,
    summarize_caddy_access_logs,
    summarize_route_family_diagnostics,
)


class AuditOvhContainerDiagnosticsTests(unittest.TestCase):
    def test_root_disk_parser_returns_only_root_available_blocks(self):
        df_output = (
            "Filesystem 1024-blocks Used Available Capacity Mounted on\n"
            "/dev/private-root 1000000 750000 250000 75% /\n"
            "/dev/private-opt 500000 400000 100000 80% /opt\n"
        )

        self.assertEqual(parse_root_disk_free_kib(df_output), 250000)
        self.assertIsNone(parse_root_disk_free_kib("filesystem malformed\n/dev/root 10 9 x 90% /\n"))

    def test_docker_system_df_parser_keeps_allowlisted_categories_and_numeric_totals(self):
        docker_df = "\n".join(
            [
                json.dumps({
                    "Type": "Images",
                    "TotalCount": "8",
                    "Active": "6",
                    "Size": "12.34GB",
                    "Reclaimable": "2.50GB (20%)",
                }),
                json.dumps({
                    "Type": "Containers",
                    "TotalCount": "4",
                    "Active": "2",
                    "Size": "1.5GiB",
                    "Reclaimable": "512MiB (33%)",
                }),
                json.dumps({
                    "Type": "Build Cache",
                    "TotalCount": "42",
                    "Active": "0",
                    "Size": "4.25GB",
                    "Reclaimable": "4.25GB (100%)",
                }),
                json.dumps({
                    "Type": "Private data /mnt/secret",
                    "TotalCount": 1,
                    "Active": 0,
                    "Size": "secret-size",
                    "Reclaimable": "secret-reclaimable",
                }),
                "not-json private-volume-name",
            ]
        )

        parsed = parse_docker_system_df(docker_df)
        self.assertEqual(
            parsed,
            {
                "images": {
                    "total_count": 8,
                    "active_count": 6,
                    "size_bytes_estimate": 12_340_000_000,
                    "reclaimable_bytes_estimate": 2_500_000_000,
                },
                "containers": {
                    "total_count": 4,
                    "active_count": 2,
                    "size_bytes_estimate": 1_610_612_736,
                    "reclaimable_bytes_estimate": 536_870_912,
                },
                "build_cache": {
                    "total_count": 42,
                    "active_count": 0,
                    "size_bytes_estimate": 4_250_000_000,
                    "reclaimable_bytes_estimate": 4_250_000_000,
                },
            },
        )
        self.assertNotIn("private", json.dumps(parsed))

    def test_dangling_image_parser_aggregates_count_and_size_without_emitting_ids(self):
        dangling_images = (
            "a1b2c3d4e5f6|1.25GB\n"
            "abcdef123456|250MB\n"
            "not-an-image-id|999GB\n"
            "0123456789ab|private-size\n"
        )

        self.assertEqual(
            parse_dangling_images(dangling_images),
            {"count": 3, "size_bytes_estimate": None},
        )
        self.assertEqual(
            parse_dangling_images("a1b2c3d4e5f6|1.25GB\nabcdef123456|250MB\n"),
            {"count": 2, "size_bytes_estimate": 1_500_000_000},
        )

    def test_disk_report_emits_only_aggregate_metrics_and_redacts_identifiers(self):
        command_results = {
            ("df", "-Pk", "/"): (
                "Filesystem 1024-blocks Used Available Capacity Mounted on\n"
                "/dev/private-root 1000000 750000 250000 75% /\n"
            ),
            ("docker", "system", "df", "--format", "json"): json.dumps({
                "Type": "Images",
                "TotalCount": 2,
                "Active": 1,
                "Size": "3.00GB",
                "Reclaimable": "2.00GB (66%)",
            }) + "\n" + json.dumps({
                "Type": "Build Cache",
                "TotalCount": 10,
                "Active": 0,
                "Size": "1.00GB",
                "Reclaimable": "1.00GB (100%)",
            }) + "\n" + json.dumps({
                "Type": "private-volume-secret",
                "TotalCount": 1,
                "Active": 0,
                "Size": "private-size-token",
                "Reclaimable": "private-reclaimable-token",
            }) + "\n",
            ("docker", "image", "ls", "--filter", "dangling=true", "--format", "{{.ID}}|{{.Size}}"):
                "a1b2c3d4e5f6|1.25GB\n",
        }
        invoked_commands = []

        def fake_run_command(arguments, timeout=15):
            invoked_commands.append(tuple(arguments))
            return command_results.get(tuple(arguments))

        output = StringIO()
        with patch("audit_ovh_container_diagnostics.run_command", side_effect=fake_run_command):
            with redirect_stdout(output):
                report_disk_resources()

        report = output.getvalue()
        self.assertIn("root_fs_free_kib=250000", report)
        self.assertIn("root_fs_free_bytes=256000000", report)
        self.assertIn("docker_system_df_images_reclaimable_bytes_estimate=2000000000", report)
        self.assertIn("docker_system_df_build_cache_reclaimable_bytes_estimate=1000000000", report)
        self.assertIn("docker_dangling_images_count=1", report)
        self.assertIn("docker_dangling_images_size_bytes_estimate=1250000000", report)
        for sensitive_value in (
            "/dev/private-root",
            "a1b2c3d4e5f6",
            "private-volume-secret",
            "private-size-token",
            "private-reclaimable-token",
            "1.25GB",
        ):
            self.assertNotIn(sensitive_value, report)
        self.assertTrue(all("prune" not in argument for command in invoked_commands for argument in command))

    def test_resource_audit_workflow_invokes_the_redacted_disk_report(self):
        repo_root = Path(__file__).resolve().parents[2]
        workflow = (repo_root / ".github/workflows/audit-ovh-resources.yml").read_text()

        self.assertIn("name: Inspect production memory, disk usage, and route-family logs by diagnostic run", workflow)
        self.assertIn("< scripts/deployment/audit_ovh_container_diagnostics.py", workflow)
        self.assertIn("python3 -m unittest discover -s scripts/deployment -p 'test_audit_ovh_container_diagnostics.py'", workflow)

    def test_cgroup_parsers_keep_only_selected_numeric_fields(self):
        events = parse_numeric_pairs(
            "low 0\nhigh 2\noom_kill 1\nsecret_field 99\nmalformed value\n",
            ("low", "high", "oom_kill"),
        )
        self.assertEqual(events, {"low": 0, "high": 2, "oom_kill": 1})

        status = parse_proc_status(
            "Name:\tnode\nVmHWM:\t120000 kB\nVmRSS:\t80000 kB\nUid:\t1001\n"
        )
        self.assertEqual(status, {"VmHWM": "120000", "VmRSS": "80000"})

    def test_host_process_parser_matches_next_server_comm_with_version_suffix(self):
        process_table = (
            "PID %CPU RSS COMMAND\n"
            "410 0.0 744 docker-init\n"
            "418 52.4 2125532 next-server (v22.23.4)\n"
            "419 21.0 100000 next-server (v22.23\n"
            "422 0.1 24000 sh\n"
        )
        self.assertEqual(
            parse_host_node_processes(process_table),
            [(418, "52.4", 2125532), (419, "21.0", 100000)],
        )

    def test_heap_sampler_reports_state_without_environment_values(self):
        result = heap_sampler_status(
            [
                "NODE_ENV=production",
                "LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC=enabled",
                "LUNIDEX_HEAP_SAMPLER_EXPIRES_AT=2000",
                "LUNIDEX_HEAP_SAMPLER_RUN_ID=1234-2",
                "DATABASE_URL=private-value",
            ],
            now=1000,
        )
        self.assertEqual(
            result,
            {
                "enabled": "true",
                "expiry_state": "future",
                "run_id_valid": "true",
                "configured_window_active": "true",
            },
        )
        self.assertNotIn("private-value", " ".join(result.values()))
        self.assertNotIn("2000", " ".join(result.values()))

    def test_sampler_window_is_inactive_when_expired_or_run_id_is_invalid(self):
        result = heap_sampler_status(
            [
                "NODE_ENV=production",
                "LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC=enabled",
                "LUNIDEX_HEAP_SAMPLER_EXPIRES_AT=1000",
                "LUNIDEX_HEAP_SAMPLER_RUN_ID=secret-run-id",
            ],
            now=1000,
        )
        self.assertEqual(result["expiry_state"], "expired")
        self.assertEqual(result["run_id_valid"], "false")
        self.assertEqual(result["configured_window_active"], "false")
        self.assertNotIn("secret-run-id", " ".join(result.values()))

    def test_sampler_log_check_returns_presence_without_returning_log_content(self):
        self.assertTrue(
            heap_sampler_summary_seen(
                "LUNIDEX_HEAP_SAMPLE_SUMMARY_1234-2={\"frames\":[\"private-source\"]}"
            )
        )
        self.assertFalse(heap_sampler_summary_seen("ordinary startup log with no diagnostic marker"))

    def test_route_family_diagnostic_counts_only_allowlisted_fields(self):
        log_text = "\n".join(
            [
                "2026-11-19T12:00:00Z LUNIDEX_ROUTE_FAMILY_V1 run=1234-5 family=localized_tcg_cards method=GET",
                "2026-11-19T12:00:00Z LUNIDEX_ROUTE_FAMILY_V1 run=1234-5 family=localized_tcg_collection method=GET",
                "2026-11-19T12:00:00Z LUNIDEX_ROUTE_FAMILY_V1 run=1234-5 family=localized_tcg method=GET",
                "2026-11-19T12:00:01Z LUNIDEX_ROUTE_FAMILY_V1 run=1234-5 family=scanner_probe method=HEAD",
                "2026-11-19T12:00:02Z LUNIDEX_ROUTE_FAMILY_V1 run=1234-5 family=secret-path method=GET",
                "2026-11-19T12:00:03Z LUNIDEX_ROUTE_FAMILY_V1 run=1234-5 family=localized_tcg method=DELETE",
                "2026-11-19T12:00:04Z LUNIDEX_ROUTE_FAMILY_V1 run=2345-6 family=localized_tcg method=GET",
                "unrelated log private-card-id /en/tcg/cards/private-card-id?token=private-query",
            ]
        )

        counts = summarize_route_family_diagnostics(log_text, "1234-5")
        summary = " ".join(f"{key}={value}" for key, value in sorted(counts.items()))

        self.assertEqual(
            counts,
            Counter({
                "localized_tcg": 1,
                "localized_tcg_cards": 1,
                "localized_tcg_collection": 1,
                "scanner_probe": 1,
            }),
        )
        self.assertEqual(summarize_route_family_diagnostics(log_text, "invalid-run-id"), Counter())
        self.assertNotIn("private-card-id", summary)
        self.assertNotIn("private-query", summary)
        self.assertNotIn("secret-path", summary)

    def test_route_family_strips_query_and_dynamic_identifiers(self):
        self.assertEqual(
            route_family("/en/pokemon/private-pokemon-id?token=private-query"),
            "localized_pokemon",
        )
        self.assertEqual(route_family("/en/tcg"), "localized_tcg_home")
        self.assertEqual(
            route_family("/en/tcg/cards/private-card-id?token=private-query"),
            "localized_tcg_cards",
        )
        self.assertEqual(route_family("/fr/tcg/sets/private-set-id"), "localized_tcg_sets")
        self.assertEqual(
            route_family("/en/tcg/collection/fr/private-set-id"),
            "localized_tcg_collection",
        )
        self.assertEqual(
            route_family("/en/tcg/sealed/market/private-product-id"),
            "localized_tcg_sealed",
        )
        self.assertEqual(
            route_family("/en/tcg/illustrators/private-artist"),
            "localized_tcg_illustrators",
        )
        self.assertEqual(route_family("/en/tcg/pull-rates/private-study"), "localized_tcg_other")
        self.assertEqual(route_family("/api/auth/callback?code=private-code"), "api_auth")
        self.assertEqual(route_family("/fr/pokedex/anything"), "localized_pokedex")
        self.assertEqual(route_family("/manifest.webmanifest"), "static_metadata")

    def test_caddy_summary_emits_only_allowlisted_route_families(self):
        raw_events = [
            {
                "logger": "http.log.access.log0",
                "msg": "handled request",
                "request": {
                    "uri": "/en/pokemon/private-pokemon-id?token=private-query",
                    "remote_ip": "203.0.113.18",
                },
            },
            {
                "logger": "http.log.access.log0",
                "msg": "handled request",
                "request": {
                    "uri": "/api/auth/session?session_id=private-session-id",
                    "remote_ip": "203.0.113.19",
                },
            },
            {"level": "info", "msg": "server running", "request": {"uri": "/private-path"}},
        ]
        available, counts = summarize_caddy_access_logs(
            "\n".join(json.dumps(event) for event in raw_events)
        )
        summary = " ".join(f"{key}={value}" for key, value in sorted(counts.items()))
        self.assertTrue(available)
        self.assertEqual(
            counts,
            Counter({"localized_pokemon": 1, "api_auth": 1}),
        )
        for sensitive_value in (
            "private-pokemon-id",
            "private-query",
            "private-session-id",
            "203.0.113.18",
            "203.0.113.19",
            "/private-path",
        ):
            self.assertNotIn(sensitive_value, summary)

    def test_non_access_caddy_logs_are_reported_as_absent(self):
        available, counts = summarize_caddy_access_logs(
            '{"level":"info","msg":"server running","logger":"admin.api"}\n'
            "plain text error line\n"
        )
        self.assertFalse(available)
        self.assertEqual(counts, Counter())


if __name__ == "__main__":
    unittest.main()
