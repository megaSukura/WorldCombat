#!/usr/bin/env python3
"""Integrator: python tools/with-prebuilt-lock.py <Gradle task/option> [...]."""
from pathlib import Path
import os
import subprocess
import sys
from prebuilt_runtime import binaries_lock

root = Path(__file__).resolve().parents[1]
command = (["cmd.exe", "/d", "/c", str(root / "gradlew.bat")] if os.name == "nt" else [str(root / "gradlew")]) + sys.argv[1:]
with binaries_lock(root):
    with subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                          encoding="utf-8", errors="replace", creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0) as process:
        for line in process.stdout: print(line, end="", flush=True)
        code = process.wait()
sys.exit(code)
