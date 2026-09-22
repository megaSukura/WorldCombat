"""Inspect locked upstream data and compare it with an actual native registry export."""
import io
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]

def main():
    spec = json.loads((ROOT / "mods/cobblemon-world-combat/build/p1-launch/server.json").read_text(encoding="utf-8"))
    artifact = next(Path(p) for p in spec["classpath"].split(";") if "com.cobblemon" in p and p.endswith(".jar"))
    destination = (ROOT / "build/p4-research/locked-showdown").resolve()
    origins = {}
    ability_origins = {}
    forms = []
    with ZipFile(artifact) as jar:
        metadata = json.loads(jar.read("data/cobblemon/showdown.json").decode("utf-8-sig"))
        with ZipFile(io.BytesIO(jar.read("data/cobblemon/showdown.zip"))) as packed:
            for name in packed.namelist():
                if name.endswith("/") or not name.startswith(("data/", "sim/", "lib/", "config/")):
                    continue
                output = (destination / name).resolve()
                if not output.is_relative_to(destination):
                    raise ValueError("Invalid upstream archive path")
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(packed.read(name))
        for name in jar.namelist():
            if not (name.startswith("data/") and "/species/" in name and name.endswith(".json")):
                continue
            species = json.loads(jar.read(name))
            for form in [species] + species.get("forms", []):
                implemented = form.get("implemented", species.get("implemented", False))
                for move in form.get("moves", species.get("moves", [])):
                    method, move_id = move.split(":", 1)
                    label = "level" if method.isdigit() else method
                    origins.setdefault(move_id, set()).add(("implemented:" if implemented else "data-only:") + label)
                for ability in form.get("abilities", species.get("abilities", [])):
                    ability_id = ability.split(":")[-1]
                    ability_origins.setdefault(ability_id, set()).add("implemented-species" if implemented else "data-only-species")
                if form is not species and any(word in form.get("name", "").lower() for word in ("mega", "gmax", "gigantamax")):
                    forms.append({"species": species.get("name"), "form": form.get("name"), "implemented": implemented})
    facts = {"artifact": artifact.name, "showdownVersion": metadata["showdownVersion"],
        "moveOrigins": {k: sorted(v) for k, v in sorted(origins.items())},
        "abilityOrigins": {k: sorted(v) for k, v in sorted(ability_origins.items())}, "specialForms": forms}
    (ROOT / "build/p4-research/native-facts.json").write_text(json.dumps(facts, indent=2), encoding="utf-8")
    result = subprocess.run(["node", str(ROOT / "tools/native-inventory.mjs")], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8",
                   creationflags=subprocess.CREATE_NO_WINDOW if __import__("os").name == "nt" else 0)
    print(result.stdout.strip())

if __name__ == "__main__":
    main()
