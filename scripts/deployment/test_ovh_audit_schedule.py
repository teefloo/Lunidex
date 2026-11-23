import unittest
from pathlib import Path

from ovh_audit_schedule import resolve_audit_slot


class ResolveAuditSlotTests(unittest.TestCase):
    def test_scheduled_event_slot_parser_is_preserved_for_historical_reports(self):
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

    def test_missing_schedule_expression_is_rejected(self):
        result = resolve_audit_slot(
            event_name="schedule",
            manual_slot="adhoc",
            utc_date="2026-11-22",
        )

        self.assertFalse(result.valid)
        self.assertIn("not allowlisted", result.error)

    def test_manual_adhoc_uses_actual_utc_date(self):
        result = resolve_audit_slot(
            event_name="workflow_dispatch",
            manual_slot="adhoc",
            utc_date="2026-11-21",
        )

        self.assertTrue(result.valid)
        self.assertEqual(result.slot, "adhoc")
        self.assertEqual(result.utc_date, "2026-11-21")

    def test_manual_scheduled_recovery_requires_the_slot_date(self):
        on_date = resolve_audit_slot(
            event_name="workflow_dispatch",
            manual_slot="2026-11-21-19-06-utc",
            utc_date="2026-11-21",
        )
        late = resolve_audit_slot(
            event_name="workflow_dispatch",
            manual_slot="2026-11-21-19-06-utc",
            utc_date="2026-11-22",
        )

        self.assertTrue(on_date.valid)
        self.assertFalse(late.valid)
        self.assertIn("expected UTC date 2026-11-21", late.error)

    def test_invalid_runner_date_is_rejected(self):
        result = resolve_audit_slot(
            event_name="workflow_dispatch",
            manual_slot="adhoc",
            utc_date="not-a-date",
        )

        self.assertFalse(result.valid)
        self.assertIn("missing or invalid", result.error)


    def test_workflow_keeps_manual_confirmation_without_schedules_or_watchdog(self):
        repo_root = Path(__file__).resolve().parents[2]
        workflow = (repo_root / ".github/workflows/audit-ovh-resources.yml").read_text()

        self.assertNotIn("github.run_started_at", workflow)
        self.assertIn("date -u +%F", workflow)
        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn("inputs.confirm_read_only_inspection", workflow)
        self.assertIn("manual_audit_slot", workflow)
        self.assertNotIn("  schedule:", workflow)
        self.assertNotIn("  watchdog:", workflow)
        self.assertNotIn("gh api --method GET", workflow)
        self.assertNotIn("actions: read", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("contents: write", workflow)


if __name__ == "__main__":
    unittest.main()
