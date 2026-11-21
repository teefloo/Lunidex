import json
import unittest
from pathlib import Path

from ovh_audit_schedule import build_watchdog_report, resolve_audit_slot


class ResolveAuditSlotTests(unittest.TestCase):
    def test_scheduled_event_uses_schedule_expression_and_runner_utc_date(self):
        result = resolve_audit_slot(
            event_name="schedule",
            event_schedule="6 13 22 11 *",
            manual_slot="adhoc",
            utc_date="2026-11-22",
        )

        self.assertTrue(result.valid)
        self.assertEqual(result.slot, "2026-11-22-13-06-utc")
        self.assertEqual(result.utc_date, "2026-11-22")

    def test_delayed_scheduled_event_on_wrong_date_is_rejected(self):
        result = resolve_audit_slot(
            event_name="schedule",
            event_schedule="6 13 22 11 *",
            manual_slot="adhoc",
            utc_date="2026-11-23",
        )

        self.assertFalse(result.valid)
        self.assertIn("expected UTC date 2026-11-22", result.error)

    def test_incorrect_schedule_expression_is_rejected(self):
        result = resolve_audit_slot(
            event_name="schedule",
            event_schedule="6 13 24 11 *",
            manual_slot="adhoc",
            utc_date="2026-11-22",
        )

        self.assertFalse(result.valid)
        self.assertEqual(result.slot, "invalid-schedule")

    def test_missing_schedule_event_is_rejected(self):
        result = resolve_audit_slot(
            event_name="schedule",
            event_schedule="",
            manual_slot="adhoc",
            utc_date="2026-11-22",
        )

        self.assertFalse(result.valid)
        self.assertIn("not allowlisted", result.error)

    def test_manual_adhoc_uses_actual_utc_date(self):
        result = resolve_audit_slot(
            event_name="workflow_dispatch",
            event_schedule="",
            manual_slot="adhoc",
            utc_date="2026-11-21",
        )

        self.assertTrue(result.valid)
        self.assertEqual(result.slot, "adhoc")
        self.assertEqual(result.utc_date, "2026-11-21")

    def test_manual_scheduled_recovery_requires_the_slot_date(self):
        on_date = resolve_audit_slot(
            event_name="workflow_dispatch",
            event_schedule="",
            manual_slot="2026-11-21-19-06-utc",
            utc_date="2026-11-21",
        )
        late = resolve_audit_slot(
            event_name="workflow_dispatch",
            event_schedule="",
            manual_slot="2026-11-21-19-06-utc",
            utc_date="2026-11-22",
        )

        self.assertTrue(on_date.valid)
        self.assertFalse(late.valid)
        self.assertIn("expected UTC date 2026-11-21", late.error)

    def test_invalid_runner_date_is_rejected(self):
        result = resolve_audit_slot(
            event_name="workflow_dispatch",
            event_schedule="",
            manual_slot="adhoc",
            utc_date="not-a-date",
        )

        self.assertFalse(result.valid)
        self.assertIn("missing or invalid", result.error)


class WatchdogReportTests(unittest.TestCase):
    def _audit_runs(self, *, status="completed", conclusion="success"):
        return json.dumps(
            {
                "workflow_runs": [
                    {
                        "id": 101,
                        "created_at": "2026-11-22T13:06:30Z",
                        "status": status,
                        "conclusion": conclusion,
                        "html_url": "https://github.com/teefloo/Lunidex/actions/runs/101",
                    }
                ]
            }
        )

    def test_completed_scheduled_audit_is_complete(self):
        report, status = build_watchdog_report(
            event_schedule="21 13 22 11 *",
            utc_date="2026-11-22",
            current_run_id="202",
            runs_payload=self._audit_runs(),
        )

        self.assertEqual(status, 0)
        self.assertIn("**COMPLETE:**", report)
        self.assertIn("2026-11-22-13-06-utc", report)

    def test_absent_scheduled_audit_is_reported_missed(self):
        report, status = build_watchdog_report(
            event_schedule="21 13 22 11 *",
            utc_date="2026-11-22",
            current_run_id="202",
            runs_payload=json.dumps({"workflow_runs": []}),
        )

        self.assertNotEqual(status, 0)
        self.assertIn("**MISSED:**", report)

    def test_delayed_watchdog_on_wrong_date_is_incomplete(self):
        report, status = build_watchdog_report(
            event_schedule="21 13 22 11 *",
            utc_date="2026-11-23",
            current_run_id="202",
            runs_payload=self._audit_runs(),
        )

        self.assertNotEqual(status, 0)
        self.assertIn("**INCOMPLETE:**", report)
        self.assertIn("differs from expected date 2026-11-22", report)

    def test_incorrect_or_absent_watchdog_event_is_incomplete(self):
        for schedule in ("", "21 13 23 11 *"):
            with self.subTest(schedule=schedule):
                report, status = build_watchdog_report(
                    event_schedule=schedule,
                    utc_date="2026-11-22",
                    current_run_id="202",
                    runs_payload=self._audit_runs(),
                )

                self.assertNotEqual(status, 0)
                self.assertIn("**INCOMPLETE:**", report)

    def test_pending_or_failed_audit_is_not_complete(self):
        pending_report, pending_status = build_watchdog_report(
            event_schedule="21 13 22 11 *",
            utc_date="2026-11-22",
            current_run_id="202",
            runs_payload=self._audit_runs(status="in_progress", conclusion="pending"),
        )
        failed_report, failed_status = build_watchdog_report(
            event_schedule="21 13 22 11 *",
            utc_date="2026-11-22",
            current_run_id="202",
            runs_payload=self._audit_runs(status="completed", conclusion="failure"),
        )

        self.assertNotEqual(pending_status, 0)
        self.assertIn("**INCOMPLETE:**", pending_report)
        self.assertNotEqual(failed_status, 0)
        self.assertIn("**FAILED:**", failed_report)

    def test_unparseable_run_history_is_incomplete(self):
        report, status = build_watchdog_report(
            event_schedule="21 13 22 11 *",
            utc_date="2026-11-22",
            current_run_id="202",
            runs_payload="not-json",
        )

        self.assertNotEqual(status, 0)
        self.assertIn("**INCOMPLETE:**", report)
        self.assertIn("could not be parsed", report)

    def test_workflow_uses_date_and_explicit_get_without_unsupported_context(self):
        repo_root = Path(__file__).resolve().parents[2]
        workflow = (repo_root / ".github/workflows/audit-ovh-resources.yml").read_text()

        self.assertNotIn("github.run_started_at", workflow)
        self.assertIn("date -u +%F", workflow)
        self.assertIn("gh api --method GET", workflow)
        self.assertIn("inputs.confirm_read_only_inspection", workflow)
        self.assertIn("actions: read", workflow)
        self.assertNotIn("contents: write", workflow)


if __name__ == "__main__":
    unittest.main()
