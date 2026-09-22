/**
 * 紧束 / wrap 的 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase`（默认 5）之内；目标还没被钉住
 * （带着 `partiallytrapped` 身份的不再重复放——藤茧已经裹上了）。
 * 对谁出手：`ai.preferHard`（默认开）让难缠的目标排得更前——生命越满、正在攻击自己的目标越先被钉住；
 * 它是一记把危险目标按在地上交给队友的控制招，所以不急着收残（残血目标降分，留给更便宜的招）。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近。
 */
namespace PokemonSkills {
    function wrapValid(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !CompanionBehavior.status(context, target, "partiallytrapped");
    }

    CompanionBehavior.registerUse("wrap", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
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
            help: "超过这个距离就不主动甩藤，先走近。这一招是贴身禁锢，调大只在追击时更容易落空。"
        }),
        field(pathOf("ai.preferHard"), "先钉难缠的目标", "boolean", {
            help: "开启：生命越满、正在攻击自己的目标越优先——把它按住交给队友；关闭：只按威胁与距离排序。"
        })
    ]);
}
