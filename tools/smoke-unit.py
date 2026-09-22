#!/usr/bin/env python3
"""Run the smoke scenarios of one or more units on a single hidden headless server.

    python tools/smoke-unit.py content/moves/<id> [content/moves/<id2> ...]
                                 [--with-units <dir>[,<dir>...]] [--keep]
                                 [--boot-budget <seconds>] [--scenario-budget <seconds>]

Builds one private assembly (shared packages + the tested units + their scenario.ts files, plus any
`--with-units` dependencies that are assembled without running their scenario), starts a dedicated
server with no window on a free port and plays the scenarios one after another, each on a fresh arena.
One verdict line per unit; exit code 0 means every expectation held and no script error was reported.
Each unit's trace lands in build/smoke/<name>/trace.jsonl and the log in build/smoke/<name>/server.log;
when a run fails or stops before a verdict, the working directory and a recent startup fragment are
kept for diagnosis. Nothing here touches the shared play build or other units, so any number of authors
can run this at the same time. The server is hidden and has no GUI.

`--with-units` needs the assembler entry `build-content.mjs --fixtures <dirs>` (see tools/build-content.mjs);
without it the tool stops with a clear message instead of silently running a fixture's own scenario.
"""
import json
import os
from pathlib import Path
import queue
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from content_resources import install_content_resources  # noqa: E402

BOOT_BUDGET = 300
SCENARIO_BUDGET = 600
TAIL_LINES = 200


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0)); return s.getsockname()[1]


def script_error(line):
    return "ERROR" in line and any(name in line for name in ("WorldCombat", "KubeJS", "p1_demo.js")) and "Expected script fault" not in line


def failed_script_load(line):
    return "WorldCombat scripts ready=false" in line or bool(re.search(
        r"Loaded \d+/\d+ KubeJS (?:server|startup) scripts.*\b[1-9]\d* errors?\b", line, re.IGNORECASE))


def monitor_server(proc, unit_count, log, boot_budget=BOOT_BUDGET, scenario_budget=SCENARIO_BUDGET):
    """Pump the server's output to `log`, collect verdicts/traces/errors, and enforce separate boot and
    per-scenario budgets. A scenario that overruns is recorded once and left to the runtime's own cap, so a
    sibling scenario still reports its own verdict. Boot failure and content failure are distinguished."""
    lines = queue.Queue()
    tail = []

    def pump():
        try:
            for line in proc.stdout: lines.put(line)
        finally:
            lines.put(None)
    threading.Thread(target=pump, daemon=True).start()
    verdicts = {}; errors = {}; traces = {}; current = None; all_done = False
    started = time.monotonic(); booted = None; completed_at = None; scenario_started = None; flagged = set()
    total_budget = boot_budget + (scenario_budget + 120) * max(1, unit_count)
    boot_failed = False; content_failed = False
    while True:
        try: line = lines.get(timeout=0.5)
        except queue.Empty:
            line = ""
            if proc.poll() is not None: break
        if line is None: break
        if line:
            log.write(line); log.flush()
            tail.append(line)
            if len(tail) > TAIL_LINES: del tail[0]
            if script_error(line): errors.setdefault(None if all_done else current, []).append(line.strip())
            if failed_script_load(line):
                content_failed = True
                errors.setdefault(None, []).append("smoke-unit: script loading failed; scenarios cannot start")
                break
            if "SMOKE_ALL_DONE" in line:
                all_done = True
                if completed_at is None:
                    completed_at = time.monotonic()
                    try: proc.stdin.write("stop\n"); proc.stdin.flush()
                    except (OSError, ValueError): pass
            elif "SMOKE_VERDICT" in line:
                parts = line.split("SMOKE_VERDICT", 1)[1].strip().split()
                if len(parts) >= 2: verdicts[parts[1]] = " ".join(parts)
            elif "SMOKE {" in line:
                entry = line.split("SMOKE ", 1)[1].strip()
                try: item = json.loads(entry)
                except ValueError: item = {}
                if item.get("kind") == "start":
                    current = item.get("scenario"); scenario_started = time.monotonic()
                traces.setdefault(current, []).append(entry)
            if booted is None and re.search(r"Done \([\d.]+s\)! For help", line): booted = time.monotonic()
        elapsed = time.monotonic() - started
        if completed_at is not None and time.monotonic() - completed_at > 30:
            errors.setdefault(None, []).append("smoke-unit: server shutdown timed out")
            break
        if booted is None and elapsed > boot_budget:
            boot_failed = True
            errors.setdefault(None, []).append("smoke-unit: boot timeout; the server did not report Done within %ds" % boot_budget)
            break
        if scenario_started is not None and current not in flagged and time.monotonic() - scenario_started > scenario_budget:
            flagged.add(current)
            errors.setdefault(current, []).append("smoke-unit: scenario %s ran past its %ds budget; it is left to the runtime cap" % (current, scenario_budget))
        if elapsed > total_budget:
            errors.setdefault(current, []).append("smoke-unit: total time budget exceeded, server stopped")
            break
    return verdicts, errors, traces, all_done, {"booted": booted is not None, "boot_failed": boot_failed,
        "content_failed": content_failed, "tail": tail}


def kill_tree(proc):
    """Remove the dedicated server and any child it started; java is launched directly, so on Windows the
    whole tree is killed by pid, and on POSIX by process group."""
    if proc.poll() is not None: return
    pid = getattr(proc, "pid", None)
    if pid is None: return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        else:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
    except (OSError, ProcessLookupError, subprocess.SubprocessError):
        pass


def stop_server(proc, grace=30):
    if proc.poll() is None:
        try: proc.stdin.write("stop\n"); proc.stdin.flush()
        except (OSError, ValueError): pass
        try: proc.wait(grace)
        except subprocess.TimeoutExpired:
            kill_tree(proc)
            try: proc.kill()
            except (OSError, ProcessLookupError): pass
            try: proc.wait()
            except subprocess.TimeoutExpired: pass
    for stream in (proc.stdin, proc.stdout):
        try: stream.close()
        except (OSError, ValueError): pass


def build(units, fixtures, output):
    command = ["node", str(ROOT / "tools/build-content.mjs"), "--units", ",".join(u["directory"] for u in units),
        "--scenario", ",".join(u["scenario"] for u in units), "--output", output.relative_to(ROOT).as_posix()]
    if fixtures:
        command += ["--fixtures", ",".join(f["directory"] for f in fixtures)]
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")


def main():
    argv = sys.argv[1:]
    boolean_options = {"--keep"}
    value_options = {"--with-units", "--boot-budget", "--scenario-budget"}
    options = {}; positional = []; index = 0
    while index < len(argv):
        arg = argv[index]
        if arg in boolean_options:
            options[arg] = True
        elif arg in value_options:
            if index + 1 >= len(argv) or argv[index + 1].startswith("--"):
                print("FAIL: %s needs a value" % arg); return 2
            options.setdefault(arg, []).append(argv[index + 1]); index += 1
        elif arg.startswith("--"):
            print("FAIL: unknown option " + arg); print(__doc__); return 2
        else:
            positional.append(arg)
        index += 1
    keep = bool(options.get("--keep"))
    try:
        boot_budget = int(options.get("--boot-budget", [BOOT_BUDGET])[-1])
        scenario_budget = int(options.get("--scenario-budget", [SCENARIO_BUDGET])[-1])
    except ValueError:
        print("FAIL: budgets must be whole seconds"); return 2
    if not positional:
        print(__doc__); return 2
    with_unit_dirs = [part for value in options.get("--with-units", []) for part in value.split(",") if part]

    def read_unit(arg):
        unit_dir = (ROOT / arg).resolve()
        if not (unit_dir / "unit.json").is_file():
            print("FAIL: " + arg + " has no unit.json"); return None
        return unit_dir, json.loads((unit_dir / "unit.json").read_text(encoding="utf-8-sig"))

    units = []
    for arg in positional:
        found = read_unit(arg)
        if found is None: return 2
        unit_dir, unit = found
        scenario = unit_dir / "scenario.ts"
        if not scenario.is_file():
            print("FAIL: " + arg + " has no scenario.ts"); return 2
        units.append({"id": unit["id"], "name": unit["id"].split("/")[-1], "directory": unit_dir.relative_to(ROOT).as_posix(), "scenario": scenario.relative_to(ROOT).as_posix()})
    fixtures = []
    for arg in with_unit_dirs:
        found = read_unit(arg)
        if found is None: return 2
        unit_dir, unit = found
        if any(u["id"] == unit["id"] for u in units):
            print("FAIL: --with-units lists a tested unit: " + arg); return 2
        fixtures.append({"id": unit["id"], "name": unit["id"].split("/")[-1], "directory": unit_dir.relative_to(ROOT).as_posix()})
    if fixtures:
        assembler = (ROOT / "tools/build-content.mjs").read_text(encoding="utf-8")
        if "--fixtures" not in assembler:
            print("FAIL: --with-units needs the assembler entry build-content.mjs --fixtures; "
                  "the integrator must add it before fixture units can be assembled without running their scenario.")
            return 2

    # One writer per (first unit, count); a live run keeps its name, a concurrent or leftover directory gets a suffix.
    base = units[0]["name"] if len(units) == 1 else units[0]["name"] + "+" + str(len(units) - 1)
    output = ROOT / "build/smoke" / base
    if output.exists() and (output / ".running").exists():
        output = ROOT / "build/smoke" / (base + "-" + str(os.getpid()))
    if output.exists(): shutil.rmtree(output, ignore_errors=True)
    output.mkdir(parents=True, exist_ok=True)
    (output / ".running").write_text(str(os.getpid()), encoding="utf-8")

    run = build(units, fixtures, output)
    if run.returncode != 0:
        print("FAIL: content build (exit %d)" % run.returncode)
        print(re.sub(r"\x1b\[[0-9;]*m", "", (run.stderr or run.stdout))[-6000:]); return 1

    spec = json.loads((ROOT / "mods/cobblemon-world-combat/build/p1-launch/server.json").read_text(encoding="utf-8"))
    work = ROOT / "runs" / ("smoke-" + output.name)
    if work.exists(): shutil.rmtree(work, ignore_errors=True)
    (work / "mods").mkdir(parents=True)
    dependency = ROOT / "build/integrations/FarmersDelight-1.21.1-1.3.4.jar"
    if dependency.is_file(): shutil.copyfile(dependency, work / "mods" / dependency.name)
    port = free_port()
    (work / "server.properties").write_text(
        "server-ip=127.0.0.1\nserver-port=%d\nlevel-name=smoke\nlevel-type=minecraft:flat\nonline-mode=false\n"
        "generate-structures=false\nview-distance=6\nsimulation-distance=6\nspawn-protection=0\nmax-tick-time=60000\n"
        "spawn-monsters=false\nspawn-animals=false\n" % port, encoding="utf-8")
    (work / "eula.txt").write_text("eula=true\n", encoding="utf-8")
    scripts = work / "kubejs/server_scripts/worldcombat"
    scripts.mkdir(parents=True)
    for item in ("p1_demo.js", "p1_demo.js.map", "content-profile.json"):
        (scripts / item).write_bytes((output / item).read_bytes())
    install_content_resources(output, work)

    classpath = output / "classpath.args"
    classpath.write_text('-classpath\n"' + spec["classpath"].replace("\\", "\\\\").replace('"', '\\"') + '"\n', encoding="utf-8")
    executable = spec.get("executable") or shutil.which("java")
    jvm = [a for a in dict.fromkeys(spec["jvmArgs"]) if not a.startswith("-Xmx")] + ["-Xmx2g"]
    command = [executable] + jvm + ["@" + str(classpath), spec["mainClass"]] + spec["args"]
    environment = os.environ.copy(); environment.update(spec["environment"])
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    popen_kwargs = {"start_new_session": True} if os.name != "nt" else {"creationflags": flags}

    def launch():
        return subprocess.Popen(command, cwd=work, env=environment, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1, **popen_kwargs)

    # Only a clear boot failure (no Done, no content error) is retried once; a content failure is deterministic.
    attempts = []
    for attempt in range(2):
        proc = launch()
        errors = {None: ["smoke-unit: monitor interrupted"]}
        log_file = output / ("server.log" if attempt == 0 else "server.retry.log")
        try:
            with log_file.open("w", encoding="utf-8") as log:
                verdicts, errors, traces, all_done, meta = monitor_server(proc, len(units), log, boot_budget, scenario_budget)
        finally:
            stop_server(proc, 5 if errors.get(None) else 30)
        if proc.returncode != 0:
            errors.setdefault(None, []).append("smoke-unit: server exited with code " + str(proc.returncode))
        attempts.append({"verdicts": verdicts, "errors": errors, "traces": traces, "all_done": all_done, "meta": meta, "log": log_file})
        if not (meta["boot_failed"] and not meta["content_failed"]):
            break
        if attempt == 0:
            print("smoke-unit: boot failure, retrying once; last output:")
            for line in meta["tail"][-10:]: print("    " + line.rstrip())

    last = attempts[-1]
    verdicts, errors, traces, all_done, meta = last["verdicts"], last["errors"], last["traces"], last["all_done"], last["meta"]
    # Keep a recent startup/exit fragment next to the log whenever the run did not finish cleanly.
    if meta["boot_failed"] or meta["content_failed"] or not all_done:
        (output / "startup.log").write_text("".join(meta["tail"]), encoding="utf-8")
        print("smoke-unit: last output:")
        for line in meta["tail"][-15:]: print("    " + line.rstrip())
    if meta["boot_failed"]:
        errors.setdefault(None, []).append("smoke-unit: boot failure persisted after retry" if len(attempts) > 1 else "smoke-unit: boot failure")

    boot_errors = errors.get(None, [])
    all_passed = True
    for unit in units:
        unit_output = ROOT / "build/smoke" / unit["name"]
        if unit_output != output:
            if unit_output.exists(): shutil.rmtree(unit_output, ignore_errors=True)
            unit_output.mkdir(parents=True)
            shutil.copyfile(last["log"], unit_output / "server.log")
            if (output / "startup.log").exists(): shutil.copyfile(output / "startup.log", unit_output / "startup.log")
        trace = traces.get(unit["name"], [])
        (unit_output / "trace.jsonl").write_text("\n".join(trace) + "\n", encoding="utf-8")
        unit_errors = boot_errors + errors.get(unit["name"], [])
        verdict = verdicts.get(unit["name"])
        passed = verdict is not None and verdict.startswith("PASS") and not unit_errors
        all_passed = all_passed and passed
        print(("PASS" if passed else "FAIL") + ": " + unit["id"] + (" verdict=" + verdict if verdict else " (no verdict: the scenario never finished)"))
        for entry in trace:
            try: item = json.loads(entry)
            except ValueError: continue
            if item.get("kind") in ("fail", "pass", "note", "cast", "died"):
                print("  tick %5s  %-6s %s" % (item.get("tick"), item.get("kind"), json.dumps({k: v for k, v in item.items() if k not in ("kind", "tick")}, ensure_ascii=False)))
        if unit_errors:
            print("  server errors: %d (first 5)" % len(unit_errors))
            for e in unit_errors[:5]: print("    " + e[:300])
        print("  trace: " + str(unit_output / "trace.jsonl") + "   log: " + str(unit_output / "server.log"))
    if len(units) > 1 and not all_done and all_passed:
        print("FAIL: the server stopped before the last scenario reported"); all_passed = False

    try: (output / ".running").unlink()
    except OSError: pass
    if all_passed and not keep: shutil.rmtree(work, ignore_errors=True)
    else: print("smoke-unit: kept " + str(work) + " and " + str(output))
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
