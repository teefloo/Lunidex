import unittest
from pathlib import Path

from render_ovh_stability_report import build_report


def healthy_audit(**overrides):
    values = {
        "audit_result": "success",
        "event_name": "schedule",
        "event_schedule": "6 13 23 11 *",
        "run_started_at": "2026-11-23T13:06:45Z",
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
    }
    values.update(overrides)
    return values


class RenderOvhStabilityReportTests(unittest.TestCase):
    def test_t48_report_compares_against_t1_and_contains_cleanup_notice(self):
        report, status = build_report(healthy_audit())

        self.assertEqual(status, 0)
        self.assertIn("**Verdict: GO**", report)
        self.assertIn("T+1 reference", report)
        self.assertIn("625580 KiB", report)
        self.assertIn("Temporary schedule cleanup required", report)
        self.assertIn("cannot calculate an HTTP 5xx rate", report)

    def test_memory_growth_over_t48_ceiling_is_no_go(self):
        report, status = build_report(
            healthy_audit(node_rss_kib="800000")
        )

        self.assertEqual(status, 1)
        self.assertIn("**Verdict: NO-GO**", report)
        self.assertIn("exceeds 125% of the T+1 reference", report)

    def test_oom_signature_is_no_go(self):
        report, status = build_report(
            healthy_audit(v8_heap_oom="true", cgroup_oom_kill="1")
        )

        self.assertEqual(status, 1)
        self.assertIn("V8 heap OOM signature", report)
        self.assertIn("cgroup_oom_kill is 1", report)

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

    def test_year_or_date_mismatch_is_incomplete(self):
        report, status = build_report(
            healthy_audit(run_started_at="2027-11-23T13:06:45Z")
        )

        self.assertEqual(status, 2)
        self.assertIn("outside its allowlisted UTC date", report)

    def test_manual_recovery_slot_is_reported(self):
        report, status = build_report(
            healthy_audit(
                event_name="workflow_dispatch",
                event_schedule="",
                run_started_at="2026-11-22T13:06:45Z",
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
                run_started_at="2026-11-24T13:06:45Z",
                manual_audit_slot="2026-11-22-13-06-utc",
                confirm_read_only_inspection="true",
            )
        )

        self.assertEqual(status, 2)
        self.assertIn("manual replacement ran outside its allowlisted UTC date", report)

    def test_workflow_keeps_manual_confirmation_and_read_only_permissions(self):
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
            self.assertIn(f"- cron: '{cron}'", workflow)
        self.assertIn("inputs.confirm_read_only_inspection", workflow)
        self.assertIn("environment: ovh-preproduction", workflow)
        self.assertIn("actions: read", workflow)
        self.assertNotIn("contents: write", workflow)
        self.assertIn("github.event.schedule == '6 13 23 11 *'", workflow)
        self.assertIn("startsWith(github.run_started_at, '2026-11-23')", workflow)
        self.assertIn("Probe essential production HTTPS routes", workflow)
        self.assertIn("Report missing, failed, or incomplete scheduled audit", workflow)
        self.assertIn("actions: read", workflow)
        watchdog = workflow.split("  watchdog:", maxsplit=1)[1]
        self.assertIn("startsWith(github.run_started_at, '2026-')", watchdog)
        self.assertNotIn("startsWith(github.run_started_at, '2026-11-21')", watchdog)


if __name__ == "__main__":
    unittest.main()
