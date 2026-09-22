/**
 * 岩石爆击 / rockblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 9）格之内；更远交给共享接近逻辑。
 *   它靠一梭石块堆伤害、石块抛得散，贴脸才吃得满，所以偏好中近距离。
 * 对谁出手：`ai.finish`（默认关）打开时，残血目标多一档分，用这一梭收尾；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近；石块散开，目标若走位会被漏掉几块，这是设计的一部分。
 * 放完之后：这一梭抛完（或目标先倒）就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function rockblastWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    CompanionBehavior.registerUse("rockblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rockblastWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !rockblastWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 4;
            if (distance <= 4) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.45) score += 8;
            return score;
        }
    });

    addPreferences("rockblast", {}, [
        field(pathOf("boulder"), "巨岩式", "boolean", {
            help: "开启：单石威力 ×1.4、石块更大、散布 ×0.6、弧更陡，适合打单个厚目标；代价是投石数收在 3、间隔 +2 刻、石速 ×0.92、起手 +3 刻、冷却 +5 刻。关闭（碎岩霰弹）：投石数可到 5 块、间隔更密、抛得更快，代价是单石威力 ×0.85、石块更小、散布 ×1.2。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动抛石，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一梭石块收尾；关闭则所有目标同价。"
        })
    ]);
}
