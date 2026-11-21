import math
import unittest

from neon_quota_usage import assess_usage


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


if __name__ == "__main__":
    unittest.main()
