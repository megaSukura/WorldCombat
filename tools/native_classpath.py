"""Expand declared NeoForge JarJar dependencies for standalone Java checks.

The game loader handles these nested archives itself. A plain java -cp launch
needs ordinary files. Cache reuse compares source paths, sizes and modification
times; dependency ordering keeps the supplied classpath first.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path, PurePosixPath
import time
import zipfile


def expand(classpath, cache):
    cache = Path(cache).resolve()
    cache.mkdir(parents=True, exist_ok=True)
    lock = cache / 'extract.lock'
    deadline = time.monotonic() + 45
    while True:
        try:
            handle = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(handle)
            break
        except FileExistsError:
            if time.monotonic() > deadline:
                raise RuntimeError(f'Nested classpath cache is busy: {lock}')
            time.sleep(.1)
    try:
        manifest = cache / 'index.json'
        previous = json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {'containers': {}}
        records = previous.get('containers', {})
        queue = [str(Path(value).resolve()) for value in classpath.split(os.pathsep) if value]
        result, seen, extracted, reused = [], set(), 0, 0
        for value in queue:
            key = os.path.normcase(value)
            if key in seen:
                continue
            seen.add(key)
            result.append(value)
            source = Path(value)
            if not source.is_file() or source.suffix.lower() != '.jar':
                continue
            stat = source.stat()
            source_state = {'path': value, 'size': stat.st_size, 'mtime_ns': stat.st_mtime_ns}
            prior = records.get(key)
            if prior and prior.get('source') == source_state and all(
                    Path(child['file']).is_file()
                    and Path(child['file']).stat().st_size == child['size']
                    and Path(child['file']).stat().st_mtime_ns == child['mtime_ns']
                    for child in prior['children']):
                queue.extend(child['file'] for child in prior['children'])
                reused += len(prior['children'])
                continue
            slot = prior['slot'] if prior else len(records)
            children = []
            with zipfile.ZipFile(source) as archive:
                if 'META-INF/jarjar/metadata.json' in archive.namelist():
                    metadata = json.loads(archive.read('META-INF/jarjar/metadata.json'))
                    for entry in metadata.get('jars', []):
                        member = PurePosixPath(entry['path'])
                        if (member.is_absolute() or '..' in member.parts or member.suffix != '.jar'
                                or '\\' in entry['path'] or member.parts[:2] != ('META-INF', 'jarjar')):
                            raise ValueError(f'Invalid nested JAR path in {source}: {member}')
                        # A newer source gets its own directory; existing Java processes
                        # may still hold the previous version open on Windows.
                        generation = f'{stat.st_mtime_ns}-{stat.st_size}'
                        target = cache / 'containers' / str(slot).zfill(4) / generation / member
                        target.parent.mkdir(parents=True, exist_ok=True)
                        temporary = target.with_suffix('.jar.tmp')
                        temporary.write_bytes(archive.read(str(member)))
                        temporary.replace(target)
                        state = target.stat()
                        child = {'member': str(member), 'file': str(target), 'size': state.st_size, 'mtime_ns': state.st_mtime_ns}
                        children.append(child)
                        queue.append(child['file'])
                        extracted += 1
            records[key] = {'source': source_state, 'slot': slot, 'children': children}
        temporary = manifest.with_suffix('.tmp')
        temporary.write_text(json.dumps({'schema': 1, 'containers': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(manifest)
        return {'classpath': os.pathsep.join(result), 'entries': len(result), 'extracted': extracted, 'reused': reused,
                'cache': str(cache)}
    finally:
        lock.unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', default='build/native-classpath')
    args = parser.parse_args()
    print(json.dumps(expand(json.loads(input())['classpath'], args.cache), ensure_ascii=False))
