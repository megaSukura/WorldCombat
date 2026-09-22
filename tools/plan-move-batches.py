#!/usr/bin/env python3
"""Plan the 756-move production batch from locked species data and native descriptions.

Closest native descriptions are grouped first. Each group's most widely learned move
determines dispatch priority; members are also ordered by learner count.
"""
import argparse
from array import array
from collections import Counter, defaultdict
import csv
import io
import json
import math
from pathlib import Path
import re
import sys
import tomllib
import unicodedata
import zipfile

ROOT = Path(__file__).resolve().parents[1]
STOP_WORDS = set("the a an is are its it this that of to with for and or by in on as be also may will".split())


def description_terms(zh, en):
    terms = Counter()
    chinese = re.sub(r"[^\w\u3400-\u9fff]", "", unicodedata.normalize("NFKC", zh).casefold())
    for size in (2, 3):
        terms.update("zh:" + chinese[i:i + size] for i in range(len(chinese) - size + 1))
    words = [word for word in re.findall(r"[a-z]+|\d+", unicodedata.normalize("NFKC", en).casefold()) if word not in STOP_WORDS]
    terms.update("en:" + word for word in words)
    terms.update("en:" + " ".join(words[i:i + 2]) for i in range(len(words) - 1))
    return terms


def similarities(moves):
    documents = [description_terms(move["description"], move["descriptionEn"]) for move in moves]
    frequency = Counter(term for document in documents for term in document)
    vectors = []
    for document in documents:
        vector = {term: (1 + math.log(count)) * (1 + math.log((len(moves) + 1) / (frequency[term] + 1)))
                  for term, count in document.items()}
        length = math.sqrt(sum(value * value for value in vector.values()))
        vectors.append({term: value / length for term, value in vector.items()} if length else {})
    result = [array("f", [0]) * len(moves) for _ in moves]
    for i, left in enumerate(vectors):
        result[i][i] = 1
        for j in range(i):
            small, large = (left, vectors[j]) if len(left) <= len(vectors[j]) else (vectors[j], left)
            affinity = sum(value * large.get(term, 0) for term, value in small.items())
            # A stat named in a damaging move is often an input, while in a status move
            # it is often the result. Use native category as a soft disambiguation cue.
            if (moves[i]["category"] == "Status") != (moves[j]["category"] == "Status"):
                affinity *= 0.25
            result[i][j] = result[j][i] = affinity
    return result


def group_moves(moves, similarity, size):
    # Preserve the strongest description pairs before filling author slots. Grouping first
    # avoids a broadly learned but weakly related description splitting a much closer pair.
    if size == 1:
        return [[i] for i in range(len(moves))]
    pairs = sorted(((similarity[i][j], i, j) for i in range(len(moves)) for j in range(i + 1, len(moves))),
                   key=lambda pair: (-pair[0], pair[1], pair[2]))
    pending = set(range(len(moves)))
    groups = []
    for _, first, second in pairs:
        if first not in pending or second not in pending:
            continue
        members = [first, second]
        pending.difference_update(members)
        while pending and len(members) < size:
            def score(candidate):
                affinity = sum(similarity[member][candidate] for member in members) / len(members)
                return affinity, moves[candidate]["learners"], -candidate
            chosen = max(pending, key=score)
            pending.remove(chosen)
            members.append(chosen)
        groups.append(sorted(members))
    if pending:
        groups.append(sorted(pending))
    # Exchange members when both author groups become more coherent in total. This
    # repairs greedy leftovers while keeping group sizes and unique ownership intact.
    for _ in range(6):
        changed = False
        for first, left in enumerate(groups):
            for right in groups[first + 1:]:
                best_gain, exchange = 1e-6, None
                for i, a in enumerate(left):
                    for j, b in enumerate(right):
                        gain = sum(similarity[b][other] - similarity[a][other] for other in left if other != a)
                        gain += sum(similarity[a][other] - similarity[b][other] for other in right if other != b)
                        if gain > best_gain:
                            best_gain, exchange = gain, (i, j)
                if exchange:
                    i, j = exchange
                    left[i], right[j] = right[j], left[i]
                    changed = True
        if not changed:
            break
    for group in groups:
        group.sort()
    return sorted(groups, key=lambda group: group[0])


def average_similarity(groups, similarity):
    pairs = [similarity[a][b] for group in groups for index, a in enumerate(group) for b in group[index + 1:]]
    return sum(pairs) / len(pairs) if pairs else 0


def native_moves():
    version = tomllib.loads((ROOT / "manifests/dependencies.toml").read_text(encoding="utf-8"))["versions"]["cobblemon"]
    cache = ROOT / ".gradle-user/caches/modules-2/files-2.1/com.cobblemon/neoforge" / version
    jars = sorted(cache.rglob("neoforge-" + version + ".jar"))
    if not jars:
        raise ValueError("Pinned Cobblemon dependency is missing; prepare the integration build first")
    learners = defaultdict(set)
    species_examples = defaultdict(set)
    with zipfile.ZipFile(jars[0]) as jar:
        languages = {lang: json.loads(jar.read("assets/cobblemon/lang/" + lang + ".json")) for lang in ("zh_cn", "en_us")}
        for name in sorted(jar.namelist()):
            if not name.startswith("data/cobblemon/species/") or not name.endswith(".json"):
                continue
            species = json.loads(jar.read(name))
            bodies = [species] + [form for form in species.get("forms", []) if isinstance(form.get("moves"), list)]
            for number, body in enumerate(bodies):
                if not body.get("implemented", species.get("implemented", False)):
                    continue
                for entry in body.get("moves", species.get("moves", [])):
                    parts = str(entry).split(":")
                    if len(parts) < 2:
                        continue
                    move_id = parts[1]
                    learners[move_id].add((name, number))
                    if number == 0:
                        species_examples[move_id].add(Path(name).stem)
    rows = list(csv.DictReader(io.StringIO((ROOT / "manifests/native-moves.csv").read_text(encoding="utf-8-sig"))))
    result = []
    for row in rows:
        move_id = row["id"]
        if row["special_system"] or not learners[move_id]:
            continue
        key = "cobblemon.move." + move_id
        result.append({"id": move_id, "name": languages["zh_cn"].get(key, move_id),
                       "nameEn": languages["en_us"].get(key, move_id),
                       "description": languages["zh_cn"].get(key + ".desc", ""),
                       "descriptionEn": languages["en_us"].get(key + ".desc", ""),
                       "type": row["type"], "category": row["category"], "learners": len(learners[move_id]),
                       "learnerExamples": sorted(species_examples[move_id])[:3]})
    return version, sorted(result, key=lambda move: (-move["learners"], move["id"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="build/p5-batch")
    parser.add_argument("--group-size", type=int, default=4)
    args = parser.parse_args()
    if args.group_size < 1:
        parser.error("--group-size must be positive")
    output = (ROOT / args.output).resolve()
    if not output.is_relative_to(ROOT / "build"):
        parser.error("Production plans belong inside build/")
    version, moves = native_moves()
    assert len(moves) == 756, f"Expected the agreed 756 moves, found {len(moves)}"
    assert len({move["id"] for move in moves}) == len(moves), "Native move IDs must be unique"
    assert all(move["description"] or move["descriptionEn"] for move in moves), "Native descriptions are required for grouping"
    legacy = ROOT / "build/p5-batch/move-plan.json"
    if legacy.is_file():
        previous = json.loads(legacy.read_text(encoding="utf-8-sig"))
        assert {move["id"] for move in moves} == {move for quarter in previous["quarters"] for move in quarter}, "The agreed 756-ID scope changed"
    similarity = similarities(moves)
    grouped = group_moves(moves, similarity, args.group_size)
    flattened = [member for group in grouped for member in group]
    assert sorted(flattened) == list(range(len(moves))), "Each move must have exactly one owner"
    assert all(1 <= len(group) <= args.group_size for group in grouped), "Author groups must stay within the assigned size"
    assert all(group == sorted(group) for group in grouped)
    assert [group[0] for group in grouped] == sorted(group[0] for group in grouped), "Group leads must retain learner priority"

    # Compare the former quarter -> type/category grouping on exactly the same descriptions.
    old_groups = []
    quarter_size = math.ceil(len(moves) / 4)
    for start in range(0, len(moves), quarter_size):
        quarter = sorted(range(start, min(start + quarter_size, len(moves))),
                         key=lambda index: (moves[index]["type"], moves[index]["category"], -moves[index]["learners"], moves[index]["id"]))
        old_groups.extend(quarter[i:i + args.group_size] for i in range(0, len(quarter), args.group_size))
    metrics = {"descriptionSimilarity": round(average_similarity(grouped, similarity), 4),
               "previousGroupingSimilarity": round(average_similarity(old_groups, similarity), 4)}
    items, groups = [], []
    table = ["# 756 招正式派发顺序", "", "先按原生中英说明的文本相似度编组，原生分类辅助消歧；再按每组学习者最多的招式安排派发优先级，组内按学习者数量递减。学习者沿用已实装种类及有独立配招的形态口径，同一学习者的多个学习渠道只计一次。", "",
             "| 组 | 招式（学习者数） | 组内说明相似度 |", "|---|---|---:|"]
    for number, indices in enumerate(grouped, 1):
        group_id = f"{number:03d}"
        members = [moves[index] for index in indices]
        affinity = round(average_similarity([indices], similarity), 4)
        groups.append({"group": group_id, "lead": members[0]["id"], "leadLearners": members[0]["learners"],
                       "moves": [move["id"] for move in members], "descriptionSimilarity": affinity})
        entries = []
        for move in members:
            description = re.sub(r"\s+", " ", move["description"] or move["descriptionEn"]).strip()
            entries.append(f'- `{move["id"]}` | {move["name"]} / {move["nameEn"]} | {description} | 学习者 {move["learners"]}')
        items.append({"group": group_id, "report": "full-moves-g" + group_id,
                      "moves": [move["id"] for move in members],
                       "list": f"本组 {len(members)} 招，按原生说明文本接近度编组，组内按学习者数量列出；具体家族关系由机制联系判断。每行：id | 名称 | 原生介绍 | 已实装学习者数。\n\n" + "\n".join(entries),
                      "resume": "本组属于756招正式生产，由你完成所列单元及本组报告，使用完整交付规格。已有源码的单元也按当前任务卡交付完整结果。操作范围为本组单元目录及报告；共享前置由集成者处理，不进行Git提交，不再委派作者。"})
        table.append(f'| {group_id} | ' + "、".join(f'{move["name"]} `{move["id"]}`（{move["learners"]}）' for move in members) + f' | {affinity:.3f} |')
    plan = {"schema": 1, "version": version, "total": len(moves), "groupSize": args.group_size,
            "groupCount": len(groups), "learnerBasis": "implemented species and forms with their own move lists; unique learner per move",
            "grouping": "native Chinese/English description TF-IDF cosine, status/damage category as a soft disambiguation cue, affinity grouping and local swaps; dispatch by maximum learner count, members in learner order",
            "metrics": metrics, "ranking": moves, "groups": groups}
    output.mkdir(parents=True, exist_ok=True)
    for name, value in (("full-moves-plan.json", plan), ("full-moves-items.json", items)):
        (output / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "full-moves-groups.md").write_text("\n".join(table) + "\n", encoding="utf-8")
    print(json.dumps({"moves": len(moves), "groups": len(groups), "groupSize": args.group_size,
                      "coverage": "exactly the agreed 756 IDs, each assigned once", "metrics": metrics,
                      "firstGroups": groups[:5], "output": str(output)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
