"""Freeze a build for independent playtesting; launch only after batch confirmation."""
import argparse
import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
from content_resources import install_content_resources

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "build/p2-input-launch/frozen.json"

# External particle prerequisites. The engine's mods.toml declares them CLIENT-side, so every client
# instance needs the jars in its mods/ folder; the dedicated server does not install them.
PARTICLE_DEPENDENCIES = (
    ("maven.modrinth", "mad-particle", "0.8.21", "mad-particle-0.8.21.jar"),
    ("curse.maven", "t88-663112", "5745052", "t88-663112-5745052.jar"),
)

def gradle_user_homes():
    homes = []
    configured = os.environ.get("GRADLE_USER_HOME")
    if configured:
        homes.append(Path(configured))
    homes.append(Path.home() / ".gradle")
    homes.append(ROOT / ".gradle-user")
    return [home for home in homes if home.is_dir()]

def locate_module_jar(group, module, version, filename):
    for home in gradle_user_homes():
        root = home / "caches/modules-2/files-2.1" / group / module / version
        if not root.is_dir():
            continue
        for candidate in root.glob("*/*"):
            if candidate.name == filename and candidate.is_file():
                return candidate
    raise RuntimeError("Missing " + group + ":" + module + ":" + version + " in the Gradle cache; "
        "run 'gradlew :world-combat-core:dependencies' once to download it, then launch again")

def install_particle_dependencies(work):
    mods = Path(work) / "mods"
    mods.mkdir(parents=True, exist_ok=True)
    for group, module, version, filename in PARTICLE_DEPENDENCIES:
        source = locate_module_jar(group, module, version, filename)
        target = mods / filename
        if not target.is_file() or target.stat().st_size != source.stat().st_size:
            shutil.copy2(source, target)

def freeze():
    integration = ROOT / "build/integrations/FarmersDelight-1.21.1-1.3.4.jar"
    if args.phase in ("play", "review") and not integration.is_file():
        raise RuntimeError("Prepare the verified Farmer's Delight playtest jar in build/integrations first")
    spec = json.loads((ROOT / "build/p2-input-launch/client.json").read_text(encoding="utf-8"))
    dest = INDEX.parent / datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    dest.mkdir(parents=True)
    replacements = {}
    # The mod folders are the production output roots, with no server test fixtures.
    for argument in spec["jvmArgs"]:
        if argument.startswith("-Dfml.modFolders="):
            for index, entry in enumerate(argument.split("=", 1)[1].split(";")):
                mod, path = entry.split("%%", 1)
                source = Path(path)
                if str(source) in replacements:
                    continue
                target = dest / "mods" / mod / str(index)
                if source.exists():
                    shutil.copytree(source, target)
                else:
                    target.mkdir(parents=True)
                replacements[str(source)] = str(target)
    # Local jars must be frozen too: later builds can replace the live classpath entries.
    for source in (ROOT / "mods").glob("*/build/libs/*.jar"):
        target = dest / "jars" / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        replacements[str(source)] = str(target)
    def rewrite(text):
        for before, after in replacements.items():
            text = text.replace(before.replace("\\", "/"), after.replace("\\", "/"))
            text = text.replace(before.replace("\\", "\\\\"), after.replace("\\", "\\\\"))
            text = text.replace(before, after)
        return text
    # Freeze argument files and their project-local legacy classpath file.
    for name in ("clientLegacyClasspath.txt", "clientLog4j2.xml"):
        source = ROOT / "mods/cobblemon-world-combat/build/moddev" / name
        target = dest / name
        target.write_text(rewrite(source.read_text(encoding="utf-8")), encoding="utf-8")
        replacements[str(source)] = str(target)
    for field in ("jvmArgs", "args"):
        copied = []
        for i, arg in enumerate(spec[field]):
            if arg.startswith("@"):
                source = Path(arg[1:])
                target = dest / (field + "-" + str(i) + ".args")
                target.write_text(rewrite(source.read_text(encoding="utf-8")), encoding="utf-8")
                copied.append("@" + str(target))
            else:
                copied.append(rewrite(arg))
        spec[field] = copied
    spec["classpath"] = rewrite(spec["classpath"])
    spec["environment"] = {key: rewrite(str(value)) for key, value in spec["environment"].items()}
    work = ROOT / ("runs/" + phase + "-client")
    install_particle_dependencies(work)
    scripts = work / "kubejs/server_scripts/worldcombat"
    scripts.mkdir(parents=True, exist_ok=True)
    content = ROOT / "build/test-content"
    if args.phase == "foundation": content = ROOT / "build/content/profiles/base"
    if args.phase == "mechanisms": content = content / "profiles/playtest-mechanisms"
    if args.phase == "workshop": content = content / "profiles/workshop"
    if args.phase == "particles": content = content / "profiles/visual-fixtures"
    if args.phase == "play": content = ROOT / "build/content/profiles/play"
    if args.phase == "review": content = ROOT / "build/review-content"
    for source in content.glob("p1_demo.js*"):
        shutil.copy2(source, scripts / source.name)
    shutil.copy2(content / "content-profile.json", scripts / "content-profile.json")
    client_scripts = work / "kubejs/client_scripts/worldcombat"
    client_scripts.mkdir(parents=True, exist_ok=True)
    for source in content.glob("client.js*"):
        shutil.copy2(source, client_scripts / source.name)
    install_content_resources(content, work)
    profile = ROOT / "runs/full-client"
    if args.copy_world:
        source = Path(args.copy_world).resolve(strict=True)
        if not (source / "level.dat").is_file():
            raise RuntimeError("The source must be a saved Minecraft world")
        target = work / "saves" / source.name
        if target.exists():
            raise RuntimeError("The playtest world already exists; prepare without --copy-world to keep it")
        shutil.copytree(source, target)
        if source.parent.name == "saves":
            profile = source.parent.parent
    for relative in ("options.txt", "config/cobblemon_world_combat-client.toml"):
        source, target = profile / relative, work / relative
        if source.exists() and not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    spec["work"] = str(work)
    if args.phase in ("play", "review"):
        (work / "mods").mkdir(parents=True, exist_ok=True)
        shutil.copy2(integration, work / "mods" / integration.name)
        helper = scripts / "p5_playtest_helper.js"
        if helper.is_file(): helper.unlink()
    if args.phase == "workshop":
        for world in (work / "saves").glob("*"):
            if (world / "level.dat").is_file():
                shutil.copytree(ROOT / "tests/content/playtest" / args.phase,
                    world / "datapacks" / ("worldcombat_" + args.phase), dirs_exist_ok=True)
    if args.phase == "review":
        spec["jvmArgs"].append("-Dworldcombat.review=true")
        spec["args"] += ["--quickPlaySingleplayer", "review-world", "--width", "1600", "--height", "900"]
    spec["snapshot"] = str(dest)
    INDEX.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    print("Prepared " + args.phase + " playtest: " + str(INDEX))

def launch():
    spec = json.loads(INDEX.read_text(encoding="utf-8"))
    dest = Path(spec["snapshot"])
    install_particle_dependencies(spec["work"])
    classpath = dest / "classpath.args"
    classpath.write_text('-classpath\n"' + spec["classpath"].replace("\\", "\\\\").replace('"', '\\"') + '"\n', encoding="utf-8")
    environment = os.environ.copy()
    environment.update(spec["environment"])
    executable = spec.get("executable") or (str(Path(os.environ["JAVA_HOME"]) / "bin/java.exe") if os.environ.get("JAVA_HOME") else shutil.which("java"))
    if not executable:
        raise RuntimeError("Set JAVA_HOME to JDK 21 before launching")
    command = [executable] + list(dict.fromkeys(spec["jvmArgs"])) + ["@" + str(classpath), spec["mainClass"]] + spec["args"]
    log = ROOT / ("build/" + phase + "-checks/client-console.log")
    log.parent.mkdir(parents=True, exist_ok=True)
    if log.exists():
        shutil.copy2(log, log.with_name("client-console-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + ".log"))
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    with log.open("w", encoding="utf-8") as output:
        process = subprocess.Popen(command, cwd=spec["work"], env=environment, stdin=subprocess.DEVNULL,
            stdout=output, stderr=subprocess.STDOUT, creationflags=flags, close_fds=True,
            start_new_session=os.name != "nt")
    record = {"pid": process.pid, "started": datetime.datetime.now().isoformat(),
        "snapshot": spec["snapshot"], "work": spec["work"], "log": str(log)}
    (log.parent / "client-process.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print("Minecraft client detached, PID=" + str(process.pid), flush=True)
    # The interactive client belongs to the user's playtest and outlives this command.

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("prepare", "launch"))
    parser.add_argument("--confirmed-visible-test", action="store_true")
    parser.add_argument("--phase", choices=("foundation", "input", "encounter", "moves", "mechanisms", "workshop", "play", "particles", "review"), default="foundation")
    parser.add_argument("--copy-world", help="Copy a saved world into the isolated playtest directory during preparation")
    args = parser.parse_args()
    phase = args.phase if args.phase in ("foundation", "play", "review") else "p4-workshop" if args.phase == "workshop" else "p4-mechanisms" if args.phase == "mechanisms" else "p3-moves" if args.phase == "moves" else "p2-" + args.phase
    INDEX = ROOT / ("build/" + phase + "-launch/frozen.json")
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    if args.copy_world and args.action != "prepare":
        parser.error("--copy-world applies to prepare only")
    if args.action == "prepare":
        freeze()
    elif not args.confirmed_visible_test:
        parser.error("Obtain confirmation for this visible test batch, then use --confirmed-visible-test.")
    else:
        launch()
