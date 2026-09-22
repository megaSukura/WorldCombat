"""Load the player distribution on an installed NeoForge dedicated server, without development classpaths or a window."""
import argparse
import json
import os
from pathlib import Path
import queue
import shutil
import socket
import subprocess
import threading
import time
import tomllib
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEPENDENCIES = {"cobblemon", "kubejs", "rhino", "kotlinforforge", "ldlib2"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--server-dir", type=Path, required=True, help="Fresh server installed with NeoForge --installServer, under runs/release-check-*")
    parser.add_argument("--dependencies", type=Path, required=True, help="Directory containing already installed official dependency jars")
    parser.add_argument("--dist", type=Path, default=ROOT / "dist")
    parser.add_argument("--java", default=str(Path(os.environ["JAVA_HOME"]) / "bin/java") if os.environ.get("JAVA_HOME") else "java")
    args = parser.parse_args()
    work = args.server_dir.resolve()
    if work.parent != (ROOT / "runs").resolve() or not work.name.startswith("release-check-"):
        raise ValueError("Use a dedicated runs/release-check-* directory")
    if (work / "world").exists() or (work / "worldcombat-release-check").exists():
        raise ValueError("Choose a fresh release-check directory; existing worlds are preserved")
    versions = tomllib.loads((ROOT / "manifests/dependencies.toml").read_text())["versions"]
    argfile = work / "libraries/net/neoforged/neoforge" / versions["neoforge"] / ("win_args.txt" if os.name == "nt" else "unix_args.txt")
    if not argfile.is_file():
        raise ValueError("Install the locked NeoForge server first")
    if not (work / "eula.txt").is_file() or "eula=true" not in (work / "eula.txt").read_text():
        raise ValueError("The server owner must supply their accepted eula.txt")
    project_jars = sorted((args.dist / "mods").glob("*.jar"))
    project_ids = set()
    for jar in project_jars:
        with zipfile.ZipFile(jar) as archive:
            metadata = tomllib.loads(archive.read("META-INF/neoforge.mods.toml").decode("utf-8-sig"))
            project_ids.update(mod["modId"] for mod in metadata["mods"])
    if len(project_jars) != 2 or project_ids != {"world_combat_core", "cobblemon_world_combat"}:
        raise ValueError("Expected the two assembled WorldCombat jars")
    profile = json.loads((args.dist / "kubejs/server_scripts/worldcombat/content-profile.json").read_text(encoding="utf-8"))
    if profile.get("profile") != "play":
        raise ValueError("Expected the assembled formal play profile")
    mods = work / "mods"
    mods.mkdir(exist_ok=True)
    if list(mods.glob("*.jar")):
        raise ValueError("Installed-server check requires an empty mods directory")
    found = {}
    for jar in args.dependencies.glob("*.jar"):
        with zipfile.ZipFile(jar) as archive:
            name = "META-INF/neoforge.mods.toml"
            names = archive.namelist()
            metadata = tomllib.loads(archive.read(name).decode("utf-8-sig")) if name in names else {}
            # KFF's official all jar is a library bundle; its language provider and mod are nested.
            if "META-INF/jarjar/metadata.json" in names:
                nested = json.loads(archive.read("META-INF/jarjar/metadata.json"))["jars"]
                if any(entry["identifier"] == {"group": "thedarkcolour", "artifact": "kfflang"} for entry in nested):
                    if "kotlinforforge" in found:
                        raise ValueError("Ambiguous Kotlin for Forge distribution")
                    found["kotlinforforge"] = jar
        for mod in metadata.get("mods", []):
            identity = mod.get("modId")
            if identity in DEPENDENCIES:
                if identity in found:
                    raise ValueError("Ambiguous installed dependency: " + identity)
                found[identity] = jar
    if DEPENDENCIES - found.keys():
        raise ValueError("Missing dependencies: " + str(sorted(DEPENDENCIES - found.keys())))
    for jar in set(found.values()):
        shutil.copy2(jar, mods / jar.name)
    for jar in project_jars:
        shutil.copy2(jar, mods / jar.name)
    shutil.copytree(args.dist / "kubejs", work / "kubejs", dirs_exist_ok=True)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]
    flat = json.dumps({"biome": "minecraft:plains", "layers": [{"block": "minecraft:bedrock", "height": 1},
                      {"block": "minecraft:dirt", "height": 2}, {"block": "minecraft:grass_block", "height": 1}],
                       "structure_overrides": [], "features": False, "lakes": False}, separators=(",", ":"))
    (work / "server.properties").write_text("server-ip=127.0.0.1\nserver-port=%d\nlevel-name=worldcombat-release-check\nlevel-type=minecraft:flat\ngenerator-settings=%s\nspawn-protection=0\nview-distance=3\nsimulation-distance=3\nmax-tick-time=120000\n" % (port, flat), encoding="utf-8")
    output = ROOT / "build/release-prep" / ("installed-" + time.strftime("%Y%m%d-%H%M%S"))
    output.mkdir(parents=True)
    command = [args.java, "-Xmx3G", "-Dfile.encoding=UTF-8", "@" + str(argfile), "nogui"]
    process = subprocess.Popen(command, cwd=work, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               text=True, encoding="utf-8", errors="replace", creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    lines = queue.Queue()
    def pump():
        for line in process.stdout:
            lines.put(line)
        lines.put(None)
    threading.Thread(target=pump, daemon=True).start()
    ready = False; errors = []; started = time.monotonic()
    try:
        with (output / "server.log").open("w", encoding="utf-8") as log:
            while time.monotonic() - started < 300:
                try:
                    line = lines.get(timeout=.5)
                except queue.Empty:
                    if process.poll() is not None: break
                    continue
                if line is None: break
                log.write(line); log.flush()
                if "ERROR" in line and any(token in line for token in ("KubeJS", "WorldCombat", "ModLoadingException", "mixin")):
                    errors.append(line.strip())
                if not ready and "For help, type" in line and "Done (" in line:
                    ready = True
                    process.stdin.write("list\nsave-all flush\nstop\n"); process.stdin.flush()
            if process.poll() is None:
                process.wait(30)
    finally:
        if process.poll() is None:
            try:
                process.stdin.write("stop\n"); process.stdin.flush(); process.wait(20)
            except (OSError, subprocess.TimeoutExpired):
                process.kill(); process.wait()
    result = {"passed": ready and not errors and process.returncode == 0, "ready": ready, "exitCode": process.returncode,
              "errors": errors, "log": str(output / "server.log"), "seconds": round(time.monotonic() - started, 1)}
    (output / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
