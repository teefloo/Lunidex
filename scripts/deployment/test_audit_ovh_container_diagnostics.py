import json
import unittest
from collections import Counter

from audit_ovh_container_diagnostics import (
    heap_sampler_status,
    heap_sampler_summary_seen,
    parse_host_node_processes,
    parse_numeric_pairs,
    parse_proc_status,
    route_family,
    summarize_caddy_access_logs,
    summarize_route_family_diagnostics,
)


class AuditOvhContainerDiagnosticsTests(unittest.TestCase):
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
