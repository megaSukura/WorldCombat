"""Package player files and matching public source; never publishes or includes development Git history."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tomllib
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = {"content", "docs", "gradle", "LICENSES", "manifests", "mods", "release", "sdk", "tests", "tools"}
SOURCE_FILES = {".editorconfig", ".gitattributes", ".gitignore", "AGENTS.md", "README.md", "LICENSE",
                "LICENSE-MINECRAFT-EXCEPTION.txt", "THIRD_PARTY_NOTICES.md", "build.gradle.kts", "gradle.properties",
                "gradlew", "gradlew.bat", "package.json", "package-lock.json", "settings-gradle.lockfile",
                "settings.gradle.kts", "tsconfig.json"}
GENERATED = {".git", ".gradle", ".gradle-user", ".kotlin", "node_modules", "__pycache__", "build", "out", "bin", "runs", "dist"}
REQUIRED_DOCS = {"INSTALL.md", "CHANGELOG.md", "LICENSE", "LICENSE-MINECRAFT-EXCEPTION.txt", "THIRD_PARTY_NOTICES.md"}


def version():
    match = re.search(r"^mod_version=([A-Za-z0-9._-]+)$", (ROOT / "gradle.properties").read_text(), re.M)
    if not match:
        raise ValueError("Missing mod_version")
    return match[1]


def source_files():
    try:
        process = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
                                 cwd=ROOT, capture_output=True, check=True)
        names = [Path(name) for name in process.stdout.decode("utf-8").split("\0") if name]
    except (OSError, subprocess.CalledProcessError):
        # A downloaded source archive also contains enough information to produce another release.
        names = [path.relative_to(ROOT) for path in ROOT.rglob("*") if path.is_file()]
    result = []
    for name in sorted(set(names)):
        if name.as_posix() not in SOURCE_FILES and name.parts[0] not in SOURCE_ROOTS:
            continue
        if any(part in GENERATED for part in name.parts) or name.suffix in (".pyc", ".pyo"):
            continue
        path = ROOT / name
        if path.is_file():
            if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
                raise ValueError("Source must be a workspace file: " + str(name))
            result.append(path)
    for name in SOURCE_FILES:
        if name not in {path.relative_to(ROOT).as_posix() for path in result}:
            raise ValueError("Missing source input: " + name)
    if not (ROOT / "tools/artwork/README.md").is_file():
        raise ValueError("Missing original icon source documentation")
    return result


def player_files(release_version):
    dist = ROOT / "dist"
    required = REQUIRED_DOCS | {
        "mods/world-combat-core-" + release_version + ".jar",
        "mods/cobblemon-world-combat-" + release_version + ".jar",
        "kubejs/server_scripts/worldcombat/p1_demo.js",
        "kubejs/server_scripts/worldcombat/content-profile.json",
        "kubejs/client_scripts/worldcombat/client.js",
        "kubejs/startup_scripts/worldcombat/startup.js",
        "LICENSES/GPL-3.0.txt", "LICENSES/LGPL-3.0.txt", "LICENSES/LGPL-2.1.txt", "LICENSES/MPL-2.0.txt", "LICENSES/Apache-2.0.txt"
    }
    missing = sorted(name for name in required if not (dist / name).is_file())
    if missing:
        raise ValueError("Run assembleDist first; missing " + ", ".join(missing))
    files = sorted(path for path in dist.rglob("*") if path.is_file() and path.name != ".gitkeep")
    expected_jars = {name for name in required if name.endswith(".jar")}
    if {path.relative_to(dist).as_posix() for path in files if path.suffix == ".jar"} != expected_jars:
        raise ValueError("Player package must contain exactly the two project jars")
    for path in files:
        name = path.relative_to(dist)
        if name.parts[0] not in {"mods", "kubejs", "LICENSES"} and name.as_posix() not in REQUIRED_DOCS:
            raise ValueError("Unexpected player artifact: " + str(name))
        if path.is_symlink() or not path.resolve().is_relative_to(dist.resolve()):
            raise ValueError("Player artifact leaves dist: " + str(name))
    for jar in expected_jars:
        with zipfile.ZipFile(dist / jar) as archive:
            metadata = tomllib.loads(archive.read("META-INF/neoforge.mods.toml").decode())
            if any(mod["version"] != release_version for mod in metadata["mods"]):
                raise ValueError("Jar version disagrees with source: " + jar)
            for notice in ("LICENSE", "LICENSE-MINECRAFT-EXCEPTION.txt", "THIRD_PARTY_NOTICES.md"):
                if "META-INF/" + notice not in archive.namelist():
                    raise ValueError("Jar is missing " + notice)
            if any(name.endswith(".jar") or "/checks/" in name for name in archive.namelist()):
                raise ValueError("Unexpected embedded dependency or check class: " + jar)
    profile = json.loads((dist / "kubejs/server_scripts/worldcombat/content-profile.json").read_text(encoding="utf-8"))
    if profile.get("profile") != "play":
        raise ValueError("The player package must use the formal play profile")
    return files, profile


def write_zip(destination, files, base, prefix=""):
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            name = path.relative_to(base).as_posix()
            info = zipfile.ZipInfo(prefix + name, (2026, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o100755 if name == "gradlew" else 0o100644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    release_version = version()
    players, profile = player_files(release_version)
    sources = source_files()
    output = ROOT / "build/releases" / release_version
    output.mkdir(parents=True, exist_ok=True)
    player = output / ("WorldCombat-" + release_version + ".zip")
    source = output / ("WorldCombat-" + release_version + "-source.zip")
    write_zip(player, players, ROOT / "dist")
    write_zip(source, sources, ROOT, "WorldCombat-" + release_version + "/")
    # Counts and paths describe scope; archive creation does not generate file hashes.
    report = {"version": release_version, "status": "local-candidate", "player": str(player), "source": str(source),
              "playerFiles": len(players), "sourceFiles": len(sources), "packages": len(profile["packages"]),
              "publicHistoryIncluded": False, "thirdPartyModsIncluded": False}
    (output / "candidate.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
