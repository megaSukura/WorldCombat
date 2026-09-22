"""Prepare/launch the isolated full-content review instance. Preparing never opens a game window."""
import argparse
import json
import os
from pathlib import Path
import queue
import shutil
import socket
import subprocess
import sys
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "runs/review-client"
WORLD = WORK / "saves/review-world"
PINNED_JAVA_HOME = Path("C:/Program Files/Zulu/zulu-21")

def java_home():
    """Resolve the project runtime before the machine-wide Java association."""
    configured = os.environ.get("WORLD_COMBAT_JAVA_HOME")
    if configured:
        candidate = Path(configured)
        if (candidate / "bin/java.exe").is_file(): return candidate
        raise RuntimeError("WORLD_COMBAT_JAVA_HOME does not point to Java 21: " + str(candidate))
    if (PINNED_JAVA_HOME / "bin/java.exe").is_file(): return PINNED_JAVA_HOME
    configured = os.environ.get("JAVA_HOME")
    if configured and (Path(configured) / "bin/java.exe").is_file(): return Path(configured)
    return None

def java():
    home = java_home()
    found = str(home / "bin/java.exe") if home else shutil.which("java")
    if not found:
        candidate = PINNED_JAVA_HOME / "bin/java.exe"
        if candidate.is_file(): found = str(candidate)
    if not found: raise RuntimeError("JDK 21 is required")
    return found

def server_command(output, *, review=True):
    spec=json.loads((ROOT / "mods/cobblemon-world-combat/build/p1-launch/server.json").read_text(encoding="utf-8"))
    flags_text=" ".join(Path(a[1:]).read_text(encoding="utf-8") if a.startswith("@") else a for a in spec["args"])
    if "--nogui" not in flags_text: raise RuntimeError("The server must explicitly use --nogui")
    output.mkdir(parents=True,exist_ok=True)
    cp=output/"classpath.args"
    cp.write_text('-classpath\n"'+spec["classpath"].replace("\\","\\\\").replace('"','\\"')+'"\n',encoding="utf-8")
    jvm=[a for a in dict.fromkeys(spec["jvmArgs"]) if not a.startswith("-Xmx")]+["-Xmx4g"]
    if review: jvm.append("-Dworldcombat.review=true")
    env=os.environ.copy();env.update(spec["environment"])
    return [spec.get("executable") or java()]+jvm+["@"+str(cp),spec["mainClass"]]+spec["args"],env

def bootstrap_world():
    if (WORLD/"level.dat").is_file(): return
    # The dedicated server creates vanilla level data; no hand-written NBT or modifications to personal saves.
    output=ROOT/"build/review-bootstrap"
    cmd,env=server_command(output)
    with socket.socket() as sock: sock.bind(("127.0.0.1",0)); port=sock.getsockname()[1]
    (WORK/"server.properties").write_text("server-ip=127.0.0.1\nserver-port=%d\nlevel-name=review-world\nlevel-type=minecraft:flat\nonline-mode=false\ngamemode=creative\nspawn-protection=0\nspawn-monsters=false\nspawn-animals=false\nview-distance=6\nsimulation-distance=6\nmax-tick-time=120000\ngenerate-structures=false\n"%port,encoding="utf-8")
    (WORK/"eula.txt").write_text("eula=true\n",encoding="utf-8")
    proc=subprocess.Popen(cmd,cwd=WORK,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding="utf-8",errors="replace",creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)
    lines=queue.Queue()
    def pump():
        for line in proc.stdout: lines.put(line)
        lines.put(None)
    threading.Thread(target=pump,daemon=True).start()
    ready=False; errors=[]; started=time.monotonic()
    try:
        with (output/"server.log").open("w",encoding="utf-8") as log:
            while time.monotonic()-started<300:
                try: line=lines.get(timeout=.5)
                except queue.Empty:
                    if proc.poll() is not None: break
                    continue
                if line is None: break
                log.write(line);log.flush()
                if "ERROR" in line and ("KubeJS" in line or "WorldCombat" in line): errors.append(line.strip())
                if not ready and "For help, type" in line:
                    ready=True
                    for command in ["gamerule doMobSpawning false","gamerule doDaylightCycle false","gamerule doWeatherCycle false","gamerule doImmediateRespawn true","gamerule keepInventory true","setworldspawn 0 -60 0","save-all flush","stop"]: proc.stdin.write(command+"\n")
                    proc.stdin.flush()
            if proc.poll() is None: proc.wait(30)
    finally:
        if proc.poll() is None:
            try: proc.stdin.write("stop\n");proc.stdin.flush();proc.wait(15)
            except (OSError,subprocess.TimeoutExpired): proc.kill();proc.wait()
    for stream in (proc.stdin, proc.stdout):
        try: stream.close()
        except OSError: pass
    if not ready or errors: raise RuntimeError("Review bootstrap failed: "+"\n".join(errors[:8])+"; see "+str(output/"server.log"))
    source=(WORK/"review-world").resolve();target=WORLD.resolve();allowed=WORK.resolve()
    if not source.is_relative_to(allowed) or not target.is_relative_to(allowed) or target.exists(): raise RuntimeError("Review world destination is not a fresh path inside the review instance")
    target.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(source),str(target))

def prepare():
    subprocess.run(["node","tools/build-review.mjs"],cwd=ROOT,check=True)
    subprocess.run([sys.executable,"tools/input-client.py","prepare","--phase","review"],cwd=ROOT,check=True)
    options=WORK/"options.txt"
    if not (WORK/"config/worldcombat/review-prepared.json").exists():
        old=options.read_text(encoding="utf-8") if options.exists() else ""
        values={"guiScale":"2","onboardAccessibility":"false","skipMultiplayerWarning":"true","tutorialStep":"none","lang":"zh_cn"}
        existing=[line for line in old.splitlines() if line.split(":",1)[0] not in values]
        options.write_text("\n".join(existing+[k+":"+v for k,v in values.items()])+"\n",encoding="utf-8")
    bootstrap_world()
    marker=WORK/"config/worldcombat/review-prepared.json";marker.parent.mkdir(parents=True,exist_ok=True)
    marker.write_text(json.dumps({"world":"review-world","content":"build/review-content","launcher":"启动验收.cmd"},ensure_ascii=False,indent=2),encoding="utf-8")
    print("Ready: launch 启动验收.cmd; the game enters the review world automatically")

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("action",choices=["prepare","launch"]);args=parser.parse_args()
    if args.action=="prepare":prepare()
    else:
        if not (WORLD/"level.dat").is_file():raise SystemExit("Review is not prepared. Run python tools/review-client.py prepare first.")
        os.environ.setdefault("JAVA_HOME",str(Path(java()).parent.parent))
        subprocess.run([sys.executable,"tools/input-client.py","launch","--phase","review","--confirmed-visible-test"],cwd=ROOT,check=True)
