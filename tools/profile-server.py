#!/usr/bin/env python3
"""Headless dedicated-server tick profile on a fresh superflat world.

Launches the exported full server, lets it settle, runs the vanilla `/debug` profiler for a
window and stops. Prints ticks-per-second plus the heaviest profiler entries, so server-side
cost (the low-TPS side of "high FPS, low TPS") can be attributed without a client.

    python tools/profile-server.py [--seconds 60] [--no-content] [--spawn "<species>xN"]

`--no-content` loads the mods with an empty script folder, giving the mod-only baseline.
`--spawn` pre-spawns pokemon around spawn before profiling (uses Cobblemon's /pokespawn).
"""
import argparse
import json
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import threading
import time
from content_resources import install_content_resources

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=60)
    parser.add_argument("--settle", type=int, default=25)
    parser.add_argument("--no-content", action="store_true")
    parser.add_argument("--spawn", default="", help="species or species*count list, comma separated, spawned near 0 0 before profiling")
    parser.add_argument("--view-distance", type=int, default=10)
    parser.add_argument("--client", action="store_true", help="Launch the frozen playtest client, auto-join it, give it partners and wild pokemon (opens a game window)")
    args = parser.parse_args()

    spec = json.loads((ROOT / "mods/cobblemon-world-combat/build/p1-launch/server.json").read_text(encoding="utf-8"))
    program_text = "\n".join(Path(item[1:]).read_text(encoding="utf-8") for item in spec["args"] if item.startswith("@"))
    if "--nogui" not in program_text:
        raise RuntimeError("The server launch must explicitly include --nogui")
    label = "baseline" if args.no_content else "player" if args.client else "content"
    work = ROOT / "runs" / ("profile-server-" + label)
    if work.exists(): shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    (work / "mods").mkdir()
    dependency = ROOT / "build/integrations/FarmersDelight-1.21.1-1.3.4.jar"
    if dependency.is_file(): shutil.copyfile(dependency, work / "mods" / dependency.name)
    if args.client:
        # The playtest client carries the particle dependencies; they negotiate network channels, so the server needs the same jars.
        for jar in (ROOT / "runs/play-client/mods").glob("*.jar"):
            if not (work / "mods" / jar.name).exists(): shutil.copyfile(jar, work / "mods" / jar.name)
    (work / "server.properties").write_text(
        "server-ip=127.0.0.1\nserver-port=25599\nlevel-name=profile-world\nlevel-type=minecraft:flat\nonline-mode=false\n"
        "generate-structures=false\nview-distance=%d\nsimulation-distance=%d\nspawn-protection=0\nmax-tick-time=60000\n"
        % (args.view_distance, args.view_distance), encoding="utf-8")
    (work / "eula.txt").write_text("eula=true\n", encoding="utf-8")
    scripts = work / "kubejs/server_scripts/worldcombat"
    scripts.mkdir(parents=True)
    if not args.no_content:
        content = ROOT / "build/content/profiles/play"
        for name in ("p1_demo.js", "p1_demo.js.map", "content-profile.json"):
            (scripts / name).write_bytes((content / name).read_bytes())
        install_content_resources(content, work)
    if args.client:
        shutil.copyfile(ROOT / "tools/profile-load.js", scripts / "profile_load.js")

    output = ROOT / "build/profile-server"
    output.mkdir(parents=True, exist_ok=True)
    classpath = output / (label + "-classpath.args")
    classpath.write_text('-classpath\n"' + spec["classpath"].replace("\\", "\\\\").replace('"', '\\"') + '"\n', encoding="utf-8")
    executable = spec.get("executable") or shutil.which("java")
    jvm = list(dict.fromkeys(spec["jvmArgs"]))
    jfr_path = output / (label + ".jfr")
    if jfr_path.exists(): jfr_path.unlink()
    jvm.append("-XX:FlightRecorderOptions=stackdepth=512")
    jvm.append("-XX:StartFlightRecording=filename=" + str(jfr_path) + ",settings=profile,dumponexit=true,disk=true")
    command = [executable] + jvm + ["@" + str(classpath), spec["mainClass"]] + spec["args"]
    environment = os.environ.copy(); environment.update(spec["environment"])
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    proc = subprocess.Popen(command, cwd=work, env=environment, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1, creationflags=flags)
    lines = queue.Queue()
    def pump():
        for line in proc.stdout: lines.put(line)
        lines.put(None)
    threading.Thread(target=pump, daemon=True).start()

    def send(text):
        proc.stdin.write(text + "\n"); proc.stdin.flush()

    log_path = output / (label + ".log")
    started = time.monotonic()
    phase = "boot"; phase_at = started
    tps_line = ""
    warnings = 0
    client = None
    join_failed = False
    def launch_client():
        frozen = json.loads((ROOT / "build/play-launch/frozen.json").read_text(encoding="utf-8"))
        dest = Path(frozen["snapshot"])
        cp = dest / "profile-classpath.args"
        cp.write_text('-classpath\n"' + frozen["classpath"].replace("\\", "\\\\").replace('"', '\\"') + '"\n', encoding="utf-8")
        env = os.environ.copy(); env.update(frozen["environment"])
        cmd = [executable] + list(dict.fromkeys(frozen["jvmArgs"])) + ["@" + str(cp), frozen["mainClass"]] + frozen["args"] + ["--quickPlayMultiplayer", "127.0.0.1:25599"]
        return subprocess.Popen(cmd, cwd=frozen["work"], env=env, stdin=subprocess.DEVNULL,
            stdout=(output / "player-client.log").open("w", encoding="utf-8"), stderr=subprocess.STDOUT)
    with log_path.open("w", encoding="utf-8") as log:
        while time.monotonic() - started < 900:
            try:
                line = lines.get(timeout=0.5)
            except queue.Empty:
                line = ""
                if proc.poll() is not None: break
            if line is None: break
            if line:
                log.write(line); log.flush()
                if "Can't keep up" in line: warnings += 1
                if "Stopped tick profiling" in line: tps_line = line.strip()
            now = time.monotonic()
            if phase == "boot" and line and re.search(r"Done \([\d.]+s\)! For help", line):
                for spec_item in filter(None, args.spawn.split(",")):
                    species, _, count = spec_item.partition("*")
                    for _ in range(int(count or 1)):
                        send("pokespawnat 0 -60 0 " + species.strip())
                if args.client:
                    client = launch_client(); phase = "join"; phase_at = now
                else:
                    phase = "settle"; phase_at = now
            elif phase == "join" and line and ("lost connection" in line or "Disconnecting" in line or "disconnected" in line.lower()):
                print("client join failed:", line.strip())
                if client is not None and client.poll() is None: client.terminate()
                send("stop"); phase = "done"; phase_at = now; join_failed = True
            elif phase == "join" and ((line and "PROFILE_LOAD ready" in line) or now - phase_at > 300):
                if "PROFILE_LOAD ready" not in line: print("client did not join within 300 s")
                phase = "settle"; phase_at = now
            elif phase == "settle" and now - phase_at > args.settle:
                send("worldcombat profile"); send("debug start"); phase = "profile"; phase_at = now
            elif phase == "profile" and now - phase_at > args.seconds:
                send("debug stop"); send("worldcombat profile"); phase = "perf"; phase_at = now
            elif phase == "perf" and now - phase_at > 2:
                send("perf start"); phase = "perf-wait"; phase_at = now
            elif phase == "perf-wait" and (now - phase_at > 14):
                # Dump the recording while the JVM is alive; a slow shutdown with a connected client must not lose it.
                jcmd = Path(executable).with_name("jcmd" + (".exe" if os.name == "nt" else ""))
                subprocess.run([str(jcmd), str(proc.pid), "JFR.dump", "filename=" + str(jfr_path)], capture_output=True, text=True)
                if client is not None and client.poll() is None: client.terminate()
                send("stop"); phase = "done"; phase_at = now
            elif phase == "done" and now - phase_at > 90:
                break
    if client is not None and client.poll() is None:
        client.terminate()
        try: client.wait(timeout=10)
        except subprocess.TimeoutExpired: client.kill()
    if proc.poll() is None:
        proc.terminate()
        try: proc.wait(timeout=10)
        except subprocess.TimeoutExpired: proc.kill()

    print("run:", label, "| keep-up warnings:", warnings)
    if join_failed:
        print("no profile: the client never joined; see", log_path, "and", output / "player-client.log")
        raise SystemExit(1)
    # The runtime's own script ledger: the second `worldcombat profile` covers the measured window.
    text = log_path.read_text(encoding="utf-8", errors="replace")
    ledgers = [m.start() for m in re.finditer(r"WorldCombat script profile over", text)]
    if ledgers:
        block = text[ledgers[-1]:].split("\n")
        print("script ledger (measured window):")
        for line in block[:27]:
            if "WorldCombat script profile" in line: print("  " + line[line.index("WorldCombat"):].strip())
            elif re.match(r"\s*\d+ ms", line.strip()) or " ms " in line: print("  " + line.strip())
            else: break
    print(tps_line or "(no profiler summary)")
    import zipfile
    reports = sorted((work / "debug/profiling").glob("*.zip"), key=lambda p: p.stat().st_mtime)
    if reports:
        with zipfile.ZipFile(reports[-1]) as archive:
            names = [n for n in archive.namelist() if n.endswith("profiling.txt")]
            text = archive.read(names[0]).decode("utf-8", "replace") if names else ""
        (output / (label + "-profiling.txt")).write_text(text, encoding="utf-8")
        print("profile:", output / (label + "-profiling.txt"))
        entries = []
        for entry in text.splitlines():
            m = re.match(r"\[(\d+)\] (\S+)\(\d+/\d+\) - ([\d.]+)%/([\d.]+)%", entry.strip())
            if m: entries.append((float(m.group(4)), int(m.group(1)), m.group(2)))
        entries.sort(reverse=True)
        print("heaviest by global share:")
        for share, depth, name in entries[:40]:
            print("  %6.2f%%  d%-2d %s" % (share, depth, name))
    else:
        print("no /perf report written; see", log_path)
    if jfr_path.exists():
        jfr = Path(executable).with_name("jfr" + (".exe" if os.name == "nt" else ""))
        dump = subprocess.run([str(jfr), "print", "--events", "jdk.ExecutionSample", str(jfr_path)],
            capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
        samples = []
        current = None
        for raw in dump.splitlines():
            line = raw.strip()
            if line.startswith("jdk.ExecutionSample"):
                current = {"thread": "", "frames": []}; samples.append(current)
            elif current is not None and line.startswith("sampledThread"):
                current["thread"] = line.split("=", 1)[1].strip().strip('"')
            elif current is not None and line.startswith("stackTrace"):
                pass
            elif current is not None and "line:" in line and not line.startswith("]"):
                current["frames"].append(line.split(" line:")[0].strip())
        server = [s for s in samples if s["thread"].startswith("Server thread")]
        print("jfr: %d samples on the server thread (%s)" % (len(server), jfr_path))
        def attribute(frames):
            for frame in frames:
                if frame.startswith("dev.worldcombat"): return frame
            for frame in frames:
                if frame.startswith("com.cobblemon"): return frame
            return frames[0] if frames else "?"
        def entry(frames):
            """The outermost WorldCombat frame: which subsystem the tick spent this sample in."""
            ours = [frame for frame in frames if frame.startswith("dev.worldcombat")]
            return ours[-1] if ours else "(outside WorldCombat)"
        from collections import Counter
        owners = Counter(attribute(s["frames"]) for s in server)
        print("server-thread samples by innermost WorldCombat (else Cobblemon) frame:")
        for frame, count in owners.most_common(25):
            print("  %5.1f%%  %s" % (100.0 * count / max(1, len(server)), frame))
        entries = Counter(entry(s["frames"]) for s in server)
        print("server-thread samples by outermost WorldCombat frame (subsystem):")
        for frame, count in entries.most_common(15):
            print("  %5.1f%%  %s" % (100.0 * count / max(1, len(server)), frame))
        def second(frames):
            ours = [frame for frame in frames if frame.startswith("dev.worldcombat")]
            return " <- ".join(ours[-4:]) if ours else "(outside WorldCombat)"
        chains = Counter(second(s["frames"]) for s in server)
        print("server-thread samples by outermost WorldCombat call chain:")
        for frame, count in chains.most_common(15):
            print("  %5.1f%%  %s" % (100.0 * count / max(1, len(server)), frame))


if __name__ == "__main__":
    main()
