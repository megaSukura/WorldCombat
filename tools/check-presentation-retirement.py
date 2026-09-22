"""Check presentation dependencies in production sources and shipped jars."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
version = next((line.partition("=")[2].strip()
                for line in (root / "gradle.properties").read_text(encoding="utf-8-sig").splitlines()
                if line.partition("=")[0].strip() == "mod_version"), "")
if not version:
    raise RuntimeError("gradle.properties must declare mod_version")
for file in (root / "content").rglob("*.ts"):
    text = file.read_text(encoding="utf-8-sig")
    assert "verdant:effect" not in text, file
    assert "com.lowdragmc.photon" not in text, file
    assert "PhotonPlayback" not in text, file
for module in ("world-combat-core", "cobblemon-world-combat"):
    jar = root / f"mods/{module}/build/libs/{module}-{version}.jar"
    with zipfile.ZipFile(jar) as package:
        for name in package.namelist():
            assert not name.endswith((".fx", ".fxproj")), name
            assert "world_combat_vfx/" not in name, name
            if name.endswith(".class"):
                code = package.read(name)
                assert b"com/lowdragmc/photon" not in code and b"com.lowdragmc.photon" not in code, name
        metadata = package.read("META-INF/neoforge.mods.toml").decode()
        assert 'modId = "photon"' not in metadata
        assert 'modId = "ldlib2"' in metadata
print("PASS production scripts and both jars have no Photon runtime or FX assets; LDLib2 retained")
