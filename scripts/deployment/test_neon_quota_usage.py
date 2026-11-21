import io
import math
import os
import unittest
from unittest.mock import patch

from neon_quota_usage import EXPECTED_PROJECT_ID, assess_usage, fetch_project, main


def project_payload(**overrides):
    project = {
        "compute_time_seconds": 180_000,
        "data_transfer_bytes": 2_500_000_000,
        "quota_reset_at": "2026-12-01T00:00:00Z",
    }
    project.update(overrides)
    return {"project": project}


class NeonQuotaUsageTests(unittest.TestCase):
    def test_reports_usage_below_thresholds(self):
        report, exit_code = assess_usage(
            project_payload(compute_time_seconds=179_640, data_transfer_bytes=2_490_000_000),
            api_key_present=True,
        )

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["status"], "GO")
        self.assertEqual(report["compute_cu_hours"], 49.9)
        self.assertEqual(report["egress_gb"], 2.49)
        self.assertEqual(report["compute_alerts"], [])
        self.assertEqual(report["egress_alerts"], [])

    def test_alerts_at_the_exact_50_percent_boundary(self):
        report, exit_code = assess_usage(project_payload(), api_key_present=True)

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["compute_alerts"], [50])
        self.assertEqual(report["egress_alerts"], [50])

    def test_reports_each_crossed_threshold_for_both_quotas(self):
        report, exit_code = assess_usage(
            project_payload(compute_time_seconds=324_000, data_transfer_bytes=4_600_000_000),
            api_key_present=True,
        )

        self.assertEqual(exit_code, 1)
        self.assertEqual(report["status"], "ALERT")
        self.assertEqual(report["compute_alerts"], [50, 75, 90])
        self.assertEqual(report["egress_alerts"], [50, 75, 90])

    def test_missing_secret_is_incomplete_not_green(self):
        report, exit_code = assess_usage(project_payload(), api_key_present=False)

        self.assertEqual(exit_code, 2)
        self.assertEqual(report["status"], "INCOMPLETE")
        self.assertIn("NEON_API_KEY", report["reason"])

    def test_missing_or_invalid_usage_is_incomplete(self):
        for payload in ({"project": {"compute_time_seconds": 10}}, project_payload(compute_time_seconds=-1)):
            with self.subTest(payload=payload):
                report, exit_code = assess_usage(payload, api_key_present=True)
                self.assertEqual(exit_code, 2)
                self.assertEqual(report["status"], "INCOMPLETE")

    def test_non_finite_usage_is_incomplete_never_go(self):
        for field in ("compute_time_seconds", "data_transfer_bytes"):
            for value in (math.nan, math.inf, -math.inf):
                with self.subTest(field=field, value=value):
                    report, exit_code = assess_usage(
                        project_payload(**{field: value}),
                        api_key_present=True,
                    )
                    self.assertEqual(exit_code, 2)
                    self.assertEqual(report["status"], "INCOMPLETE")
                    self.assertNotEqual(report["status"], "GO")

    def test_rejects_non_project_shape(self):
        report, exit_code = assess_usage({"projects": []}, api_key_present=True)

        self.assertEqual(exit_code, 2)
        self.assertEqual(report["status"], "INCOMPLETE")

    def test_invalid_json_returns_generic_error_and_main_reports_incomplete(self):
        with patch("neon_quota_usage.urlopen", return_value=io.BytesIO(b"not-json")):
            with self.assertRaisesRegex(RuntimeError, "Neon API returned invalid JSON"):
                fetch_project("sensitive-test-key", EXPECTED_PROJECT_ID)

        with patch.dict(os.environ, {"NEON_API_KEY": "sensitive-test-key", "NEON_PROJECT_ID": EXPECTED_PROJECT_ID}):
            with patch("neon_quota_usage.urlopen", return_value=io.BytesIO(b"not-json")):
                with patch("neon_quota_usage._write_summary") as write_summary:
                    exit_code = main()

        self.assertEqual(exit_code, 2)
        report = write_summary.call_args.args[0]
        self.assertEqual(report["status"], "INCOMPLETE")
        self.assertEqual(report["reason"], "Neon API returned invalid JSON")

    def test_timeout_returns_incomplete_without_exposing_exception_details(self):
        with patch.dict(os.environ, {"NEON_API_KEY": "sensitive-test-key", "NEON_PROJECT_ID": EXPECTED_PROJECT_ID}):
            with patch("neon_quota_usage.urlopen", side_effect=TimeoutError("sensitive timeout detail")):
                with patch("neon_quota_usage._write_summary") as write_summary:
                    with patch("builtins.print") as print_mock:
                        exit_code = main()

        self.assertEqual(exit_code, 2)
        report = write_summary.call_args.args[0]
        self.assertEqual(report["status"], "INCOMPLETE")
        self.assertIn("request failed", report["reason"])
        self.assertNotIn("sensitive", report["reason"])
        print_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
