import os
import subprocess
import tempfile
import unittest
from pathlib import Path


class ProbeOvhHttpsTests(unittest.TestCase):
    def test_auth_402_does_not_skip_profile_or_other_https_probes(self):
        repo_root = Path(__file__).resolve().parents[2]
        probe_script = repo_root / "scripts/deployment/probe_ovh_https.sh"
        expected_paths = [
            "/api/healthz",
            "/en",
            "/en/tcg",
            "/manifest.webmanifest",
            "/sw.js",
            "/api/auth/get-session",
            "/api/profile",
        ]

        with tempfile.TemporaryDirectory(prefix="lunidex-https-probes-") as temp_dir:
            temp_path = Path(temp_dir)
            curl_stub = temp_path / "curl"
            curl_stub.write_text(
                "#!/usr/bin/env bash\n"
                "set -Eeuo pipefail\n"
                "url=\"${@: -1}\"\n"
                "path=\"${url#https://lunidex.app}\"\n"
                "printf '%s\\n' \"$path\" >> \"$CURL_LOG\"\n"
                "case \"$path\" in\n"
                "  /api/auth/get-session) status=402 ;;\n"
                "  /api/profile) status=401 ;;\n"
                "  *) status=200 ;;\n"
                "esac\n"
                "printf '%s|0.001|0\\n' \"$status\"\n",
                encoding="utf-8",
            )
            curl_stub.chmod(0o755)
            output_path = temp_path / "github-output"
            curl_log = temp_path / "curl-paths"
            environment = {
                **os.environ,
                "PATH": f"{temp_path}{os.pathsep}{os.environ['PATH']}",
                "GITHUB_OUTPUT": str(output_path),
                "CURL_LOG": str(curl_log),
            }

            result = subprocess.run(
                ["bash", str(probe_script)],
                cwd=repo_root,
                env=environment,
                capture_output=True,
                text=True,
                check=False,
            )
            probed_paths = curl_log.read_text(encoding="utf-8").splitlines()
            outputs = output_path.read_text(encoding="utf-8")

        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(probed_paths, expected_paths)
        self.assertIn("auth_session_status=402\n", outputs)
        self.assertIn("profile_status=401\n", outputs)
        self.assertIn("healthz_status=200\n", outputs)
        self.assertIn("home_status=200\n", outputs)
        self.assertIn("tcg_status=200\n", outputs)
        self.assertIn("manifest_status=200\n", outputs)
        self.assertIn("service_worker_status=200\n", outputs)
        self.assertIn("tls_verify_result=0\n", outputs)


if __name__ == "__main__":
    unittest.main()
