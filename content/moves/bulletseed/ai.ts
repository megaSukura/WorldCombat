/**
 * 种子机关枪 / bulletseed 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 9）格之内；更远交给共享接近逻辑。
 *   它是靠发数堆伤害的物理连发，靠得越近越不容易被走位甩掉，所以偏好中近距离。
 * 对谁出手：`ai.finish`（默认开）打开时，残血目标多一档分，用一梭子密集小撞击收尾；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近；每发按真实弹速飞行，AI 会在出膛时按目标当前移动前置，
 *   但已经出膛的籽不追踪——目标中途转向会甩掉后续的发。
 * 放完之后：这一梭子打完、在场弹落地后就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function bulletseedWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    CompanionBehavior.registerUse("bulletseed", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bulletseedWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !bulletseedWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 17;
            if (distance <= capability.data.range) score += 4;
            if (distance <= 5) score += 5;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 9;
            return score;
        }
    });

    addPreferences("bulletseed", {}, [
        field(pathOf("heavy"), "重籽", "boolean", {
            help: "开启：单籽威力 ×1.35、籽更大、散布更紧，适合打单个厚目标；代价是连发数收在 3、籽速 ×0.9、起手 +2 刻、冷却 +4 刻、间隔 +1 刻。关闭（速射）：连发可到 5 发、间隔更密、籽速 ×1.12，代价是单籽威力 ×0.82、散布更开。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动喷籽，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一梭子密集小撞击收尾；关闭则所有目标同价。"
        })
    ]);
}
