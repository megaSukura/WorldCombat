/**
 * 念力 / confusion —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 15）格内；更远交给共享接近逻辑。
 * 它便宜、冷却短，所以是常规远程压制手段，可以反复用。
 * 对谁出手：`ai.fresh`（默认开）打开时，已经带着共享恍惚身份的目标排后（再缠一次价值低，
 *   等它挣脱再点）；`ai.finish`（默认开）打开时，残血目标排前——单发虽轻，胜在能补。
 * 够不到怎么办：reach 就是本招射程，不够先走近。
 * 放完之后：交回共享交战计划；只要恍惚还在，目标每次想反打都会被念力再敲一下。
 */
namespace PokemonSkills {
    function confusionWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
    }

    CompanionBehavior.registerUse(confusionId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return confusionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !confusionWants(context, capability, target)) return 0;
            let score = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 18 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "fresh", true) && CompanionBehavior.status(context, target, "confusion")) score -= 7;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences(confusionId, {}, [
        field(pathOf("focus"), "凝念", "boolean", {
            help: "开启：威力 ×1.18、恍惚更久更易触发、失手率更高，但射程 ×0.85、判定更细、弹速更慢、起手 +2 刻、冷却 +5 刻，适合近身压制。关闭（散念）：更快更远更便宜的一发，代价是单发更轻、恍惚更少见。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动弹念弹，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.fresh"), "先打没恍惚的", "boolean", {
            help: "开启：已经带着共享恍惚身份的目标排后，把这一发留给还清醒的对手；关闭则所有目标同价。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，用短冷却去补最后一下；关闭则只按普通远程攻击排序。"
        })
    ]);
}
