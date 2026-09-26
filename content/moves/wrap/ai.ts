/** Prefer one dangerous nearby target while healthy enough to maintain the hold; skip an existing coil. */
namespace PokemonSkills {
    function wrapValid(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !CompanionBehavior.status(context, target, "partiallytrapped");
    }

    CompanionBehavior.registerUse("wrap", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted || CompanionBehavior.ratio(CompanionBehavior.source(context)) < .25) return false;
            if (!target) return true;
            if (!wrapValid(context, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) { return wrapValid(context, target); },
        priority: function (context, capability, target) {
            if (!target || !wrapValid(context, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferHard", true)) {
                score += Math.round(CompanionBehavior.ratio(target) * 24);
                if (target.attacking === CompanionBehavior.source(context).ref) score += 14;
            }
            if (CompanionBehavior.ratio(target) < 0.2) score -= 12;
            if (context.facts.focus === target.ref) score += 14;
            return Math.max(0, score);
        }
    });

    addPreferences("wrap", {}, [
        field(pathOf("cocoon"), "密缠式", "boolean", {
            help: "开启：藤茧留得久、每绞更重、再压一级攻击、更难被撕开，但绞得更疏、冷却更久；关闭（速缠式）：绞得密、冷却短，快速压一轮，但持续短、压制轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 10, step: 1,
            help: "超过这个距离就不主动甩藤，先走近。这一招是贴身维持，调大只在追击时更容易落空。"
        }),
        field(pathOf("ai.preferHard"), "先束难缠的目标", "boolean", {
            help: "开启：生命越满、正在攻击自己的目标越优先——把它按住交给队友；关闭：只按威胁与距离排序。"
        })
    ]);
}
