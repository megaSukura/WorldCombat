"""Neutral smoke-monitor regressions; no game process or content build."""
import importlib.util
import io
from pathlib import Path
import subprocess
import time
import unittest


class BlockingStdout:
    """A stdout that keeps the pump thread waiting instead of signalling end-of-stream."""
    def __iter__(self):
        while True: time.sleep(0.05)

spec = importlib.util.spec_from_file_location("smoke_unit", Path(__file__).with_name("smoke-unit.py"))
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class Process:
    def __init__(self, output="", stalled=False):
        self.stdout = io.StringIO(output)
        self.stdin = io.StringIO()
        self.returncode = None
        self.stalled = stalled
        self.killed = False
        self.waits = []
        self.pid = 2 ** 31 - 1

    def poll(self): return self.returncode
    def wait(self, timeout=None):
        self.waits.append(timeout)
        if self.stalled and not self.killed: raise subprocess.TimeoutExpired("neutral-server", timeout)
        self.returncode = -9 if self.killed else 0
        return self.returncode
    def kill(self): self.killed = True


class MonitorChecks(unittest.TestCase):
    def test_failed_boot_preserves_error_and_returns_without_waiting_for_scenarios(self):
        output = ("[main/ERROR] [KubeJS Server/]: fixture.js#4: invalid configuration\n"
                  "[main/INFO] [KubeJS Server/]: Loaded 0/1 KubeJS server scripts in 0.3 s with 1 errors and 0 warnings\n"
                  "unreachable game startup\n")
        log = io.StringIO()
        verdicts, errors, traces, done, meta = smoke.monitor_server(Process(output), 4, log)
        self.assertFalse(verdicts or traces or done)
        self.assertIn("invalid configuration", errors[None][0])
        self.assertIn("scenarios cannot start", errors[None][-1])
        self.assertTrue(meta["content_failed"])
        self.assertNotIn("unreachable", log.getvalue())

    def test_rejected_content_readiness_is_a_boot_failure(self):
        _, errors, _, done, meta = smoke.monitor_server(Process("WorldCombat scripts ready=false actions=[]\n"), 1, io.StringIO())
        self.assertTrue(errors[None])
        self.assertFalse(done)
        self.assertTrue(meta["content_failed"])

    def test_successful_collection_requests_shutdown_and_retains_receipts(self):
        output = ('Done (1.0s)! For help, type "help"\n'
                  'SMOKE {"kind":"start","scenario":"alpha"}\n'
                  'SMOKE {"kind":"verdict","verdict":"PASS"}\n'
                  'SMOKE_VERDICT PASS alpha 0/1\nSMOKE_ALL_DONE 1\n')
        verdicts, errors, traces, done, meta = smoke.monitor_server(Process(output), 1, io.StringIO())
        self.assertEqual(verdicts, {"alpha": "PASS alpha 0/1"})
        self.assertFalse(errors)
        self.assertEqual(len(traces["alpha"]), 2)
        self.assertTrue(done)
        self.assertTrue(meta["booted"])

    def test_boot_timeout_is_reported_as_boot_failure_not_content_failure(self):
        proc = Process(""); proc.stdout = BlockingStdout()
        _, errors, _, done, meta = smoke.monitor_server(proc, 1, io.StringIO(), boot_budget=0, scenario_budget=10)
        self.assertFalse(done)
        self.assertTrue(meta["boot_failed"] and not meta["content_failed"])
        self.assertTrue(any("boot timeout" in line for line in errors[None]))

    def test_scenario_timeout_keeps_a_sibling_verdict_and_attribution(self):
        output = ('Done (1.0s)! For help, type "help"\n'
                  'SMOKE {"kind":"start","scenario":"alpha"}\n'
                  'SMOKE_VERDICT FAIL alpha 0/1\n'
                  'SMOKE {"kind":"start","scenario":"beta"}\n'
                  'SMOKE_VERDICT PASS beta 0/1\nSMOKE_ALL_DONE 2\n')
        verdicts, errors, _, done, _ = smoke.monitor_server(Process(output), 2, io.StringIO(), boot_budget=10, scenario_budget=0)
        self.assertEqual(verdicts["beta"], "PASS beta 0/1")
        self.assertNotIn(None, errors)
        self.assertTrue(any("budget" in line for line in errors.get("alpha", [])))
        self.assertTrue(done)

    def test_scenario_errors_keep_their_owner(self):
        output = ('SMOKE {"kind":"start","scenario":"alpha"}\n'
                  '[Server thread/ERROR] [KubeJS Server/]: scenario failure\nSMOKE_VERDICT PASS alpha 0/1\nSMOKE_ALL_DONE 1\n')
        _, errors, _, _, _ = smoke.monitor_server(Process(output), 1, io.StringIO())
        self.assertIn("scenario failure", errors["alpha"][0])

    def test_teardown_errors_are_retained_after_the_completion_marker(self):
        output = ('SMOKE_VERDICT PASS alpha 0/1\nSMOKE_ALL_DONE 1\n'
                  '[Server thread/ERROR] [WorldCombat]: failed resource cleanup\n')
        proc = Process(output)
        _, errors, _, done, _ = smoke.monitor_server(proc, 1, io.StringIO())
        self.assertTrue(done)
        self.assertIn("failed resource cleanup", errors[None][0])
        self.assertEqual(proc.stdin.getvalue(), "stop\n")

    def test_native_loading_noise_is_not_a_script_failure(self):
        output = ('[main/ERROR] [RuntimeDistCleaner/]: unrelated optional class\n'
                  'Loaded 1/1 KubeJS server scripts in 0.2 s with 0 errors and 0 warnings\n')
        _, errors, _, _, _ = smoke.monitor_server(Process(output), 1, io.StringIO())
        self.assertFalse(errors)

    def test_shutdown_reaps_a_stalled_server_and_closes_streams(self):
        proc = Process(stalled=True)
        smoke.stop_server(proc, 5)
        self.assertTrue(proc.killed and proc.stdin.closed and proc.stdout.closed)
        self.assertEqual(proc.waits, [5, None])


if __name__ == "__main__": unittest.main()
