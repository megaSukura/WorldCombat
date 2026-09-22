"""Install generated content resources while retaining unrelated pack data."""
import json
from pathlib import Path
import shutil

def install_content_resources(content: Path, game: Path):
    data_root = (game / "kubejs/data").resolve()
    record = game / "kubejs/.worldcombat-content-data.json"
    manifest = content / "content-data-files.json"
    files = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else []
    previous = json.loads(record.read_text(encoding="utf-8")) if record.exists() else []
    def target(name):
        value = (data_root / name).resolve()
        if not value.is_relative_to(data_root) or value == data_root:
            raise ValueError("Content resource path escaped kubejs/data")
        return value
    for name in set(previous) - set(files):
        target(name).unlink(missing_ok=True)
    for name in files:
        destination = target(name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(content / "data" / name, destination)
    record.parent.mkdir(parents=True, exist_ok=True)
    record.write_text(json.dumps(files, indent=2), encoding="utf-8")
    asset_root = (game / "kubejs/assets").resolve()
    asset_manifest = content / "content-assets-files.json"
    asset_record = game / "kubejs/.worldcombat-content-assets.json"
    if asset_manifest.is_file():
        assets = json.loads(asset_manifest.read_text(encoding="utf-8"))
        old_assets = json.loads(asset_record.read_text(encoding="utf-8")) if asset_record.is_file() else []
        def asset_target(name):
            value = (asset_root / name).resolve()
            if not value.is_relative_to(asset_root) or value == asset_root:
                raise ValueError("Content asset path escaped kubejs/assets")
            return value
        for name in set(old_assets) - set(assets):
            asset_target(name).unlink(missing_ok=True)
        for name in assets:
            destination = asset_target(name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(content / "assets" / name, destination)
        asset_record.write_text(json.dumps(assets, indent=2), encoding="utf-8")
    elif (content / "assets").is_dir():
        shutil.copytree(content / "assets", asset_root, dirs_exist_ok=True)

    startup = game / "kubejs/startup_scripts/worldcombat"
    startup.mkdir(parents=True, exist_ok=True)
    for name in ("startup.js", "startup.js.map"):
        if (content / name).is_file():
            shutil.copy2(content / name, startup / name)
