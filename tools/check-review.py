"""Check the real review scene workflow on a private hidden server; never opens the client."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import queue
import threading
import argparse
from content_resources import install_content_resources
ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--check",default="ReviewServerChecks");parser.add_argument("--fixture",type=Path);parser.add_argument("--content",type=Path,default=ROOT/"build/review-content");args=parser.parse_args()
    if not all(part.isidentifier() for part in args.check.split(".")):raise ValueError("Expected a check class name")
    check_class=args.check if "." in args.check else "dev.worldcombat.cobblemon.checks."+args.check
    spec=importlib.util.spec_from_file_location("review_launcher",ROOT/"tools/review-client.py")
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    label=time.strftime("%Y%m%d-%H%M%S")
    output=ROOT/"build/review-checks"/label;work=ROOT/"runs"/("review-check-"+label)
    work.mkdir(parents=True); (work/"mods").mkdir()
    source=args.content;scripts=work/"kubejs/server_scripts/worldcombat";scripts.mkdir(parents=True)
    for name in ["p1_demo.js","p1_demo.js.map","content-profile.json"]:shutil.copy2(source/name,scripts/name)
    if args.fixture:
        with (scripts/"p1_demo.js").open("a",encoding="utf-8") as output_script:output_script.write("\n"+args.fixture.read_text(encoding="utf-8")+"\n")
    install_content_resources(source,work)
    (scripts/"review_checks.js").write_text('ServerEvents.tick(function(e){Java.loadClass("'+check_class+'").tick(e.server);});\n',encoding="utf-8")
    dependency=ROOT/"build/integrations/FarmersDelight-1.21.1-1.3.4.jar"
    if dependency.exists():shutil.copy2(dependency,work/"mods"/dependency.name)
    with socket.socket() as sock:sock.bind(("127.0.0.1",0));port=sock.getsockname()[1]
    (work/"server.properties").write_text("server-ip=127.0.0.1\nserver-port=%d\nlevel-type=minecraft:flat\nlevel-name=review-world\nonline-mode=false\nspawn-protection=0\nview-distance=6\nsimulation-distance=6\nmax-tick-time=120000\n"%port,encoding="utf-8")
    (work/"eula.txt").write_text("eula=true\n",encoding="utf-8")
    cmd,env=helper.server_command(output)
    proc=subprocess.Popen(cmd,cwd=work,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding="utf-8",errors="replace",creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)
    lines=queue.Queue()
    def pump():
        for line in proc.stdout:lines.put(line)
        lines.put(None)
    threading.Thread(target=pump,daemon=True).start()
    passed=False;failures=[];started=time.monotonic()
    try:
        with (output/"server.log").open("w",encoding="utf-8") as log:
            while time.monotonic()-started<300:
                try:line=lines.get(timeout=.5)
                except queue.Empty:
                    if proc.poll() is not None:break
                    continue
                if line is None:break
                log.write(line);log.flush()
                if "REVIEWCHECK PASS" in line:passed=True;print(line.strip(),flush=True)
                if "REVIEWCHECK FAIL" in line or "ERROR" in line and ("KubeJS" in line or "WorldCombat" in line):failures.append(line.strip())
                if "REVIEWCHECK FAIL" in line or "KubeJS server scripts" in line and " 0 errors" not in line and " errors" in line:break
    finally:
        if proc.poll() is None:
            try:proc.stdin.write("stop\n");proc.stdin.flush();proc.wait(15)
            except (OSError,subprocess.TimeoutExpired):proc.kill();proc.wait()
    for stream in (proc.stdin, proc.stdout):
        try: stream.close()
        except OSError: pass
    report={"passed":passed and not failures,"log":str(output/"server.log"),"work":str(work),"errors":failures,"seconds":round(time.monotonic()-started,1)}
    (output/"result.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    (ROOT/"build/review-checks/latest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2));return 0 if report["passed"] else 1
if __name__=="__main__":sys.exit(main())
