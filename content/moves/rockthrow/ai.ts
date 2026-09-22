/**
 * 落石 / rockthrow 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 12）格之内；更远交给共享接近逻辑。
 *   它是便宜、回得快的随手一记，偏好中近距离的稳定点射。
 * 对谁出手：`ai.finish`（默认关）打开时，残血目标多一档分，用这一记收尾；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近。石头不追踪，目标若在飞行中走位会被让开，这是设计的一部分。
 * 放完之后：一记就收势，交回共享交战计划，等很短的冷却再扔下一块。
 */
namespace PokemonSkills {
    function rockthrowWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    CompanionBehavior.registerUse("rockthrow", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rockthrowWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !rockthrowWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 15;
            if (distance <= capability.data.range) score += 5;
            if (distance <= 5) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.4) score += 8;
            return score;
        }
    });

    addPreferences("rockthrow", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动扔石，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一记收尾；关闭则所有目标同价。"
        })
    ]);
}
