import unittest
from pathlib import Path

from render_ovh_stability_report import build_report, normalize_environment


def healthy_audit(**overrides):
    values = {
        "audit_result": "success",
        "event_name": "schedule",
        "event_schedule": "6 13 23 11 *",
        "audit_utc_date": "2026-11-23",
        "audit_date_valid": "true",
        "manual_audit_slot": "adhoc",
        "confirm_read_only_inspection": "false",
        "container_started_at": "2026-11-21T13:06:14.823655053Z",
        "container_status": "running",
        "container_health": "healthy",
        "restart_count": "0",
        "container_oom_killed": "false",
        "log_capture_available": "true",
        "v8_heap_oom": "false",
        "node_fatal": "false",
        "docker_cpu_pct": "42.93",
        "host_ram_available_bytes": "2791728742",
        "root_fs_free_bytes": "17762816000",
        "cgroup_current_bytes": "754720768",
        "cgroup_peak_bytes": "778629120",
        "cgroup_anon_bytes": "567111680",
        "cgroup_file_bytes": "168394752",
        "cgroup_inactive_file_bytes": "167886848",
        "cgroup_slab_bytes": "6031056",
        "cgroup_kernel_bytes": "19214336",
        "cgroup_event_max": "0",
        "cgroup_oom": "0",
        "cgroup_oom_kill": "0",
        "cgroup_oom_group_kill": "0",
        "node_rss_kib": "625580",
        "node_cpu_pct": "42.9",
        "caddy_access_logs_available": "false",
        "healthz_status": "200",
        "home_status": "200",
        "tcg_status": "200",
        "manifest_status": "200",
        "service_worker_status": "200",
        "auth_session_status": "200",
        "profile_status": "401",
        "tls_verify_result": "0",
        "audit_captured_at": "2026-11-23T13:12:00Z",
    }
    values.update(overrides)
    return values


class RenderOvhStabilityReportTests(unittest.TestCase):
    def test_t48_report_compares_against_t1_without_stale_cleanup_notice(self):
        report, status = build_report(healthy_audit())

        self.assertEqual(status, 0)
        self.assertIn("**Verdict: GO**", report)
        self.assertIn("T+1 reference", report)
        self.assertIn("625580 KiB", report)
        self.assertNotIn("Temporary schedule cleanup required", report)
        self.assertIn("cannot calculate an HTTP 5xx rate", report)
        self.assertIn("2026-11-22T15:45:38Z", report)
        self.assertIn("T+24 catch-up (2h39 late)", report)
        self.assertIn("Cgroup memory.events max / oom / oom-kill / group-kill", report)
        self.assertIn("| Cgroup memory.events max / oom / oom-kill / group-kill | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |", report)
        self.assertIn("anon` is cgroup anonymous memory, not a V8 heap measurement", report)
        self.assertIn("cgroup hors inactive_file (pas le heap)", report)
        self.assertIn("1014181888", report)
        self.assertIn("not Node RSS or a V8 heap size", report)
        self.assertIn("Memory capture UTC: `2026-11-23T13:12:00Z`", report)

    def test_memory_growth_over_t48_ceiling_is_no_go(self):
        report, status = build_report(
            healthy_audit(node_rss_kib="800000")
        )

        self.assertEqual(status, 1)
        self.assertIn("**Verdict: NO-GO**", report)
        self.assertIn("**OVH memory verdict: NO-GO**", report)
        self.assertIn("exceeds 125% of the T+1 reference", report)
        self.assertIn("/ 0 / 0 / 0 |", report)

    def test_t48_anonymous_memory_growth_is_no_go_without_oom(self):
        report, status = build_report(
            healthy_audit(cgroup_anon_bytes="900000000")
        )

        self.assertEqual(status, 1)
        self.assertIn("**OVH memory verdict: NO-GO**", report)
        self.assertIn("cgroup anonymous memory exceeds 125% of the T+1 reference", report)
        self.assertIn("Cgroup memory.events max / oom / oom-kill / group-kill", report)
        self.assertIn(" / 0 / 0 / 0 |", report)

    def test_t48_cache_growth_can_explain_cgroup_total_without_becoming_heap(self):
        report, status = build_report(
            healthy_audit(
                cgroup_current_bytes="1800000000",
                cgroup_anon_bytes="480000000",
                cgroup_file_bytes="1300000000",
                cgroup_inactive_file_bytes="1250000000",
                node_rss_kib="625580",
            )
        )

        self.assertEqual(status, 0)
        self.assertIn("**OVH memory verdict: GO**", report)
        self.assertIn("1250000000 B", report)
        self.assertIn("550000000 B", report)
        self.assertIn("only the cgroup total excluding this file-cache category", report)

    def test_t48_cgroup_memory_max_pressure_is_no_go_without_oom(self):
        report, status = build_report(healthy_audit(cgroup_event_max="1"))

        self.assertEqual(status, 1)
        self.assertIn("cgroup memory.events max pressure count is 1", report)
        self.assertIn("| Cgroup memory.events max / oom / oom-kill / group-kill | 0 / 0 / 0 / 0 | 1 / 0 / 0 / 0 |", report)

    def test_t48_unexplained_cgroup_growth_is_no_go(self):
        report, status = build_report(
            healthy_audit(
                cgroup_current_bytes="1800000000",
                cgroup_anon_bytes="480000000",
                cgroup_file_bytes="600000000",
                cgroup_inactive_file_bytes="500000000",
                node_rss_kib="625580",
            )
        )

        self.assertEqual(status, 1)
        self.assertIn("**OVH memory verdict: NO-GO**", report)
        self.assertIn("cgroup outside inactive_file exceeds 125% of the T+1 reference", report)

    def test_t48_remainder_over_limit_is_no_go_even_when_total_is_under_limit(self):
        report, status = build_report(
            healthy_audit(
                cgroup_current_bytes="900000000",
                cgroup_anon_bytes="500000000",
                cgroup_file_bytes="350000000",
                cgroup_inactive_file_bytes="100000000",
                node_rss_kib="625580",
            )
        )

        self.assertLess(900_000_000, int(754_720_768 * 1.25))
        self.assertGreater(800_000_000, int((754_720_768 - 167_886_848) * 1.25))
        self.assertEqual(status, 1)
        self.assertIn("**OVH memory verdict: NO-GO**", report)
        self.assertIn("cgroup outside inactive_file exceeds 125% of the T+1 reference", report)
        self.assertIn("this cgroup remainder is not a heap measurement", report)

    def test_t48_invalid_current_or_cache_metrics_are_incomplete_not_go(self):
        report, status = build_report(
            healthy_audit(cgroup_current_bytes="800000000", cgroup_inactive_file_bytes="900000000")
        )

        self.assertEqual(status, 2)
        self.assertIn("**OVH memory verdict: INCOMPLETE**", report)
        self.assertIn("cgroup current and inactive_file are missing or inconsistent", report)
        self.assertNotIn("**Verdict: GO**", report)

    def test_oom_signature_is_no_go(self):
        report, status = build_report(
            healthy_audit(v8_heap_oom="true", cgroup_oom_kill="1")
        )

        self.assertEqual(status, 1)
        self.assertIn("V8 heap OOM signature", report)
        self.assertIn("cgroup_oom_kill is 1", report)

    def test_supabase_auth_402_keeps_memory_verdict_independent_at_t24_and_t48(self):
        for schedule, utc_date in (
            ("6 13 22 11 *", "2026-11-22"),
            ("6 13 23 11 *", "2026-11-23"),
        ):
            with self.subTest(schedule=schedule):
                report, status = build_report(
                    healthy_audit(
                        event_name="schedule",
                        event_schedule=schedule,
                        audit_utc_date=utc_date,
                        auth_session_status="402",
                        audit_result="failure",
                    )
                )

                self.assertEqual(status, 1)
                self.assertIn("Audit job: `failure`", report)
                self.assertIn("**OVH memory verdict: GO**", report)
                self.assertIn("**Supabase Auth verdict: NO-GO**", report)
                self.assertIn("Supabase Auth session endpoint returned HTTP 402", report)
                self.assertIn("**Verdict: NO-GO**", report)
                self.assertNotIn("**OVH memory NO-GO reasons:**", report)

    def test_missing_metrics_and_skipped_run_are_incomplete(self):
        report, status = build_report(
            {
                "audit_result": "skipped",
                "event_name": "workflow_dispatch",
                "confirm_read_only_inspection": "false",
                "manual_audit_slot": "adhoc",
            }
        )

        self.assertEqual(status, 2)
        self.assertIn("**Verdict: INCOMPLETE**", report)
        self.assertIn("required read-only confirmation", report)
        self.assertIn("node_rss_kib is missing or unavailable", report)

    def test_missing_health_or_v8_classification_is_incomplete(self):
        report, status = build_report(
            healthy_audit(container_health="", v8_heap_oom="")
        )

        self.assertEqual(status, 2)
        self.assertIn("**Verdict: INCOMPLETE**", report)
        self.assertIn("Docker health status is missing", report)
        self.assertIn("V8 OOM log classification is missing", report)

    def test_missing_log_capture_makes_v8_classification_unverified(self):
        report, status = build_report(
            healthy_audit(log_capture_available="false")
        )

        self.assertEqual(status, 2)
        self.assertIn("recent production logs could not be captured", report)
        self.assertNotIn("a V8 heap OOM signature was found", report)

    def test_unavailable_boolean_values_are_incomplete_not_no_go(self):
        report, status = build_report(
            healthy_audit(container_oom_killed="unavailable", v8_heap_oom="unavailable")
        )

        self.assertEqual(status, 2)
        self.assertIn("Docker OOM-killed state is missing", report)
        self.assertIn("V8 OOM log classification is missing or unavailable", report)
        self.assertNotIn("**NO-GO reasons:**", report)

    def test_wrong_year_or_date_is_incomplete(self):
        report, status = build_report(
            healthy_audit(audit_utc_date="2027-11-23", audit_date_valid="false")
        )

        self.assertEqual(status, 2)
        self.assertIn("expected UTC date 2026-11-23", report)

    def test_manual_recovery_slot_is_reported(self):
        report, status = build_report(
            healthy_audit(
                event_name="workflow_dispatch",
                event_schedule="",
                audit_utc_date="2026-11-22",
                manual_audit_slot="2026-11-22-13-06-utc",
                confirm_read_only_inspection="true",
            )
        )

        self.assertEqual(status, 0)
        self.assertIn("2026-11-22-13-06-utc", report)

    def test_manual_recovery_slot_cannot_be_reused_on_another_utc_date(self):
        report, status = build_report(
            healthy_audit(
                event_name="workflow_dispatch",
                event_schedule="",
                audit_utc_date="2026-11-24",
                manual_audit_slot="2026-11-22-13-06-utc",
                confirm_read_only_inspection="true",
            )
        )

        self.assertEqual(status, 2)
        self.assertIn("manual recovery expected UTC date 2026-11-22", report)

    def test_missing_audit_date_or_failed_inspection_is_incomplete_never_go(self):
        report, status = build_report(
            healthy_audit(audit_utc_date="", audit_result="failure")
        )

        self.assertEqual(status, 2)
        self.assertIn("**Verdict: INCOMPLETE**", report)
        self.assertNotIn("**Verdict: GO**", report)
        self.assertIn("runner UTC date is missing or invalid", report)

    def test_manual_dispatch_without_confirmation_cannot_be_go(self):
        report, status = build_report(
            {
                "audit_result": "skipped",
                "event_name": "workflow_dispatch",
                "audit_utc_date": "2026-11-21",
                "manual_audit_slot": "adhoc",
                "confirm_read_only_inspection": "false",
            }
        )

        self.assertEqual(status, 2)
        self.assertIn("**Verdict: INCOMPLETE**", report)
        self.assertNotIn("**Verdict: GO**", report)

    def test_github_step_environment_names_are_normalized(self):
        values = {key.upper(): value for key, value in healthy_audit().items()}
        report, status = build_report(normalize_environment(values))

        self.assertEqual(status, 0)
        self.assertIn("**Verdict: GO**", report)
        self.assertIn("Audit UTC date: `2026-11-23`", report)

    def test_workflow_keeps_manual_confirmation_and_removes_temporary_schedules(self):
        repo_root = Path(__file__).resolve().parents[2]
        workflow = (repo_root / ".github/workflows/audit-ovh-resources.yml").read_text()

        for cron in (
            "6 19 21 11 *",
            "6 13 22 11 *",
            "6 13 23 11 *",
            "21 19 21 11 *",
            "21 13 22 11 *",
            "21 13 23 11 *",
        ):
            self.assertNotIn(f"cron: '{cron}'", workflow)
        self.assertNotIn("  schedule:", workflow)
        self.assertNotIn("github.event.schedule", workflow)
        self.assertNotIn("  watchdog:", workflow)
        self.assertNotIn("Report missing, failed, or incomplete scheduled audit", workflow)
        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn("environment: ovh-preproduction", workflow)
        self.assertNotIn("actions: read", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("contents: write", workflow)
        inspect_job = workflow.split("\n  inspect:\n", 1)[1].split("\n  report:\n", 1)[0]
        self.assertIn("github.event_name == 'workflow_dispatch'", inspect_job)
        self.assertIn("inputs.confirm_read_only_inspection", inspect_job)
        self.assertIn("confirm_read_only_inspection:\n        description:", workflow)
        self.assertIn("        required: true", workflow)
        self.assertIn("        type: boolean", workflow)
        self.assertIn("always() &&\n      github.event_name == 'workflow_dispatch'", workflow)
        self.assertIn("Probe essential production HTTPS routes", workflow)
        self.assertIn("bash scripts/deployment/probe_ovh_https.sh", workflow)
        self.assertIn("cgroup_anon_bytes: ${{ steps.diagnostics.outputs.app_cgroup_memory_stat_anon_bytes }}", workflow)
        self.assertIn("cgroup_event_max: ${{ steps.diagnostics.outputs.app_cgroup_memory_event_max }}", workflow)
        self.assertIn("cgroup_memory_stat_file_bytes|app_cgroup_memory_stat_inactive_file_bytes", workflow)
        self.assertIn("memory_captured_at: ${{ steps.diagnostics.outputs.audit_memory_captured_at }}", workflow)
        self.assertNotIn("github.run_started_at", workflow)
        self.assertIn("date -u +%F", workflow)
        self.assertIn("audit_utc_date", workflow)

if __name__ == "__main__":
    unittest.main()
