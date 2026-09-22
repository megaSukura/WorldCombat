"""One-command integration check for a delivered content batch.

Runs, in order: content build (types across all profiles), scene extraction and definition replay,
and a hidden dedicated-server load of the play profile. Pass --prepare to refresh the play
playtest instance afterwards (only when no client is running from it).

    python tools/check-batch.py [--prepare] [--skip-server]
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(label, command, cwd=ROOT):
    started = time.time()
    print(f"== {label}: {' '.join(command)}", flush=True)
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    output = (result.stdout or "") + (result.stderr or "")
    seconds = time.time() - started
    return result.returncode, output, seconds


def tail(output, patterns, limit=12):
    lines = [line for line in output.splitlines() if any(p in line for p in patterns)]
    return "\n".join(lines[-limit:])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare", action="store_true", help="Refresh the play instance after the checks pass")
    parser.add_argument("--skip-server", action="store_true", help="Skip the dedicated-server load check")
    args = parser.parse_args()
    summary = []
    failed = False

    code, out, secs = run("content build", ["node", "tools/build-content.mjs"])
    summary.append(("content build", code == 0, secs, tail(out, ["error", "Error", "Built content profile play"])))
    failed |= code != 0

    if not failed:
        code, out, secs = run("scene extraction", ["node", "tools/extract-scenes.mjs", "play"])
        summary.append(("scene extraction", code == 0, secs, tail(out, ["scene(s)"])))
        failed |= code != 0

    if not failed:
        gradle = str(ROOT / ("gradlew.bat" if sys.platform == "win32" else "gradlew"))
        code, out, secs = run("definition replay", [gradle, ":world-combat-core:particleChecks",
                              "-PparticleCheck=dev.worldcombat.core.client.particles.DefinitionBatchChecks",
                              "--args=../../build/p5-scenes 60", "--offline", "--console=plain", "--no-daemon", "-q"])
        summary.append(("definition replay", code == 0, secs, tail(out, ["PROBLEM", "scenes=", "PASS", "FAIL", "Exception"])))
        failed |= code != 0

    if not failed and not args.skip_server:
        code, out, secs = run("server load (play profile)", [sys.executable, "tools/check-server.py", "full", "--p5-content", "--skills-retired"])
        ok = code == 0 and '"scenario_passed": true' in out
        summary.append(("server load (play profile)", ok, secs, tail(out, ["CHECK PASS", "CHECK FAIL", "scenario_passed", "Exception", "errors and"])))
        failed |= not ok

    if not failed and args.prepare:
        code, out, secs = run("prepare play", [sys.executable, "tools/input-client.py", "prepare", "--phase", "play"])
        summary.append(("prepare play", code == 0, secs, tail(out, ["Prepared", "Error", "error"])))
        failed |= code != 0

    print("\n==== batch check summary ====")
    for label, ok, secs, detail in summary:
        print(f"[{'PASS' if ok else 'FAIL'}] {label} ({secs:.0f}s)")
        if detail:
            for line in detail.splitlines():
                print("    " + line)
    print("RESULT:", "FAIL" if failed else "PASS")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
