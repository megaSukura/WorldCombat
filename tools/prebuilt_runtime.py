"""Coordinate prebuilt-mod copies with the integrator's build, then run from private binaries."""
from contextlib import contextmanager
from pathlib import Path
import copy
import os
import shutil
import time


@contextmanager
def binaries_lock(root):
    path = Path(root) / "build/smoke/_runtime/copy-build.lock"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        handle.seek(0, 2)
        if handle.tell() == 0:
            handle.write(b"0"); handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt
            while True:
                try:
                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1); break
                except OSError:
                    time.sleep(0.1)
            try: yield
            finally:
                handle.seek(0); msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX)
            try: yield
            finally: fcntl.flock(handle, fcntl.LOCK_UN)


def snapshot_mods(root, output, specification):
    """Copy own binaries/resources, including NeoForge mod folders; dependency artifacts stay read-only."""
    root, output = Path(root).resolve(), Path(output).resolve()
    replacements = {}
    entries = specification["classpath"].split(os.pathsep)
    for argument in specification.get("jvmArgs", []):
        if argument.startswith("-Dfml.modFolders="):
            entries.extend(part.split("%%", 1)[1] for part in argument.split("=", 1)[1].split(";") if "%%" in part)
    with binaries_lock(root):
        for entry in dict.fromkeys(entries):
            source = Path(entry).resolve()
            if not source.is_relative_to(root / "mods"):
                continue
            relative = source.relative_to(root / "mods")
            if len(relative.parts) < 3 or relative.parts[1] != "build" or relative.parts[2] not in ["libs", "classes", "resources"]:
                continue
            target = output / "runtime-mods" / relative
            if str(source) in replacements:
                replacements[entry] = str(target); continue
            if not source.exists(): continue
            target.parent.mkdir(parents=True, exist_ok=True)
            if source.is_dir(): shutil.copytree(source, target, dirs_exist_ok=True)
            else: shutil.copy2(source, target)
            replacements[entry] = str(target)
            replacements[str(source)] = str(target)
            replacements[str(source).replace("\\", "\\\\")] = str(target).replace("\\", "\\\\")
    def rewrite(value):
        if isinstance(value, str):
            for source, target in replacements.items(): value = value.replace(source, target)
            return value
        if isinstance(value, list): return [rewrite(item) for item in value]
        if isinstance(value, dict): return {key: rewrite(item) for key, item in value.items()}
        return value
    return rewrite(copy.deepcopy(specification))
