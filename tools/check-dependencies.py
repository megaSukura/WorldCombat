"""Exercise the three declared dependency failures using dedicated-server launch files."""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def main():
    base = json.loads((ROOT / "mods/cobblemon-world-combat/build/p1-launch/server.json").read_text(encoding="utf-8"))
    build = ROOT / "mods/cobblemon-world-combat/build/moddev"
    vm_lines = (build / "serverRunVmArgs.txt").read_text(encoding="utf-8").splitlines()
    legacy = (build / "serverLegacyClasspath.txt").read_text(encoding="utf-8").splitlines()
    if "--nogui" not in (build / "serverRunProgramArgs.txt").read_text(encoding="utf-8"):
        raise RuntimeError("Dependency checks require a server without a GUI")
    java = str(Path(os.environ["JAVA_HOME"]) / "bin/java.exe") if os.name == "nt" else shutil.which("java")
    output = ROOT / "build/p1-checks"
    output.mkdir(parents=True, exist_ok=True)
    for case in ("missing-core", "missing-cobblemon", "wrong-core-version"):
        fixture = ROOT / "build/p1-fixtures" / case
        work = ROOT / "runs" / ("p1-" + case)
        fixture.mkdir(parents=True, exist_ok=True)
        work.mkdir(parents=True, exist_ok=True)
        spec = copy.deepcopy(base)
        def keep(path):
            normalized = str(Path(path)).replace("\\", "/").lower()
            if case != "missing-cobblemon" and "/mods/world-combat-core/" in normalized:
                return False
            return not (case == "missing-cobblemon" and "/com.cobblemon/neoforge/" in normalized)
        legacy_file = fixture / "legacy.txt"
        legacy_file.write_text("\n".join(line for line in legacy if keep(line)) + "\n", encoding="utf-8")
        vm_file = fixture / "vm.args"
        vm_file.write_text("\n".join("-DlegacyClassPath.file=" + str(legacy_file).replace("\\", "\\\\")
            if line.startswith("-DlegacyClassPath.file=") else line for line in vm_lines), encoding="utf-8")
        jvm = []
        for argument in spec["jvmArgs"]:
            if argument.startswith("@") and Path(argument[1:]).name == "serverRunVmArgs.txt":
                argument = "@" + str(vm_file)
            if argument.startswith("-Dfml.modFolders=") and case != "missing-cobblemon":
                argument = "-Dfml.modFolders=" + ";".join(folder for folder in argument.split("=", 1)[1].split(";")
                    if not folder.startswith("world_combat_core%%"))
            if argument not in jvm:
                jvm.append(argument)
        if case == "wrong-core-version":
            mods = work / "mods"; mods.mkdir(exist_ok=True)
            with zipfile.ZipFile(ROOT / "dist/world-combat-core-0.1.0-dev.jar") as original:
                with zipfile.ZipFile(mods / "world-combat-core-wrong.jar", "w") as changed:
                    for entry in original.infolist():
                        data = original.read(entry.filename)
                        if entry.filename == "META-INF/neoforge.mods.toml":
                            data = data.replace(b'version = "0.1.0-dev"', b'version = "0.0.0-p1-fixture"')
                        changed.writestr(entry, data)
        classpath = fixture / "classpath.args"
        value = os.pathsep.join(path for path in spec["classpath"].split(os.pathsep) if keep(path))
        classpath.write_text('-classpath\n"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"\n', encoding="utf-8")
        environment = os.environ.copy(); environment.update(spec["environment"])
        log_path = output / (case + ".log")
        with log_path.open("w", encoding="utf-8") as log:
            process = subprocess.run([java] + jvm + ["@" + str(classpath), spec["mainClass"]] + spec["args"],
                cwd=work, env=environment, stdout=log, stderr=subprocess.STDOUT, timeout=70,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        log = log_path.read_text(encoding="utf-8")
        wanted = "cobblemon" if case == "missing-cobblemon" else "world_combat_core"
        rejected = ("Missing or unsupported mandatory dependencies" in log and wanted in log
            and ("not installed" in log if case != "wrong-core-version" else "0.0.0-p1-fixture" in log)
            and "WorldCombat core server started." not in log)
        result = {"case": case, "rejected_as_expected": rejected, "exit_code": process.returncode, "log": str(log_path)}
        (output / (case + ".json")).write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result), flush=True)
        if not rejected:
            raise RuntimeError("Inspect dependency failure log: " + str(log_path))

if __name__ == "__main__":
    main()
