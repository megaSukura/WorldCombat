"""Look up locked Cobblemon names and species facts; optionally extract upstream source for reading."""
import argparse
import io
import json
from pathlib import Path
import re
import sys
import tomllib
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["move", "species", "ability", "item", "nature"])
    parser.add_argument("query", help="Native ID, Chinese name, English name or a name fragment")
    parser.add_argument("--extract", action="store_true", help="Extract relevant source files into build/native-reference")
    args = parser.parse_args()
    version = tomllib.loads((ROOT / "manifests/dependencies.toml").read_text(encoding="utf-8"))["versions"]["cobblemon"]
    cache = ROOT / ".gradle-user/caches/modules-2/files-2.1/com.cobblemon/neoforge" / version
    jars = list(cache.rglob("neoforge-" + version + ".jar"))
    if not jars:
        parser.error("Pinned dependency is not cached. Run the Gradle build first.")
    query = args.query.casefold().removeprefix("cobblemon:")
    prefix = "item.cobblemon." if args.kind == "item" else "cobblemon." + args.kind + "."
    matches = []
    with zipfile.ZipFile(jars[0]) as jar:
        languages = {language: json.loads(jar.read("assets/cobblemon/lang/" + language + ".json")) for language in ["zh_cn", "en_us"]}
        for key in sorted(set(languages["zh_cn"]) | set(languages["en_us"])):
            if not key.startswith(prefix):
                continue
            suffix = key[len(prefix):]
            if args.kind == "species":
                if not suffix.endswith(".name"):
                    continue
                suffix = suffix[:-5]
            if "." in suffix:
                continue
            names = {language: values.get(key, "") for language, values in languages.items()}
            values = [suffix.casefold()] + [name.casefold() for name in names.values()]
            if any(query in value for value in values):
                matches.append({"id": suffix, "names": names, "exact": query in values,
                                "descriptions": {language: {k: v for k, v in values.items() if k.startswith(key + ".") or args.kind == "species" and k.startswith(prefix + suffix + ".")}
                                                 for language, values in languages.items()}})
        exact = [entry for entry in matches if entry["exact"]]
        if exact:
            matches = exact
        if not matches:
            print(json.dumps({"version": version, "matches": [], "hint": "No name match; verify native ID in manifests or upstream source."}, ensure_ascii=False, indent=2))
            return
        destination = ROOT / "build/native-reference" / version
        for entry in matches:
            if args.kind == "species":
                files = [name for name in jar.namelist() if "/species/" in name and name.endswith("/" + entry["id"] + ".json")]
                entry["species"] = [{"source": name, "data": json.loads(jar.read(name))} for name in files]
        if args.extract:
            if args.kind == "species":
                sources = {item["source"]: jar.read(item["source"]) for entry in matches for item in entry["species"]}
            else:
                table = {"move": "moves", "ability": "abilities", "item": "items", "nature": "natures"}[args.kind]
                with zipfile.ZipFile(io.BytesIO(jar.read("data/cobblemon/showdown.zip"))) as showdown:
                    sources = {name: showdown.read(name) for name in ["data/" + table + ".js", "data/mods/cobblemon/" + table + ".js"] if name in showdown.namelist()}
            for name, data in sources.items():
                output = (destination / name).resolve()
                if not output.is_relative_to(destination.resolve()):
                    raise ValueError("Invalid upstream path")
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(data)
            for entry in matches:
                identity = re.sub(r"[^a-z0-9]", "", entry["id"])
                entry["source_files"] = [{"path": str(destination / name), "matching_lines": [i for i, line in enumerate(data.decode("utf-8").splitlines(), 1)
                    if re.match(r"\s*[\"']?" + re.escape(identity) + r"[\"']?\s*:", line)]} for name, data in sources.items()]
    print(json.dumps({"version": version, "source": str(jars[0]), "matches": matches}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
