"""Inventory the installed Cobblemon spawn pools and biome memberships without changing native data."""
import argparse
from collections import Counter
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def collect(jar: Path, output: Path):
    pools, tags, modifiers = [], {}, {}
    buckets, positions, namespaces, conditions = Counter(), Counter(), Counter(), Counter()
    with zipfile.ZipFile(jar) as archive:
        for name in sorted(archive.namelist()):
            if not name.endswith('.json'):
                continue
            if name.startswith('data/cobblemon/spawn_pool_world/'):
                data = json.loads(archive.read(name))
                pools.append({'resource': name, **data})
                for spawn in data.get('spawns', []):
                    buckets[spawn.get('bucket', '')] += 1
                    positions[spawn.get('spawnablePositionType', '')] += 1
                    for group in ('condition', 'anticondition'):
                        conditions.update(spawn.get(group, {}).keys())
            elif name.startswith('data/cobblemon/tags/worldgen/biome/'):
                data = json.loads(archive.read(name)); tags[name] = data
                for value in data.get('values', []):
                    identity = value.get('id', '') if isinstance(value, dict) else value
                    namespaces[identity.lstrip('#').split(':')[0]] += 1
            elif '/biome_modifier/' in name:
                modifiers[name] = json.loads(archive.read(name))
    output.mkdir(parents=True, exist_ok=True)
    summary = {'source': str(jar.resolve()), 'pools': len(pools),
               'spawnEntries': sum(len(p.get('spawns', [])) for p in pools),
               'biomeTags': len(tags), 'biomeNamespaces': dict(namespaces),
               'buckets': dict(buckets), 'positionTypes': dict(positions),
               'conditionFields': dict(conditions), 'biomeModifiers': modifiers}
    for name, data in [('spawns', pools), ('biome-tags', tags), ('summary', summary)]:
        (output / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return summary

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jar', type=Path, default=ROOT / 'build/p0-research/cobblemon_jar.jar')
    parser.add_argument('--output', type=Path, default=ROOT / 'build/native-spawning')
    args = parser.parse_args()
    result = collect(args.jar, args.output)
    print(json.dumps({key: result[key] for key in ('pools', 'spawnEntries', 'biomeTags', 'biomeNamespaces')}, ensure_ascii=False))
