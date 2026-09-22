/**
 * 蛮力 / superpower 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格之内；更远交给共享接近逻辑。
 *   因为这一记会让自己攻防双降，只有在自身生命比例不低于 `ai.minHealth`（默认 0＝不限制）时才起手，
 *   血薄时留着不换。
 * 对谁出手：`ai.finish`（默认开）打开时，残血目标多一档分——用一记最重的单体打击在身价下跌前收掉。
 * 够不到怎么办：reach 就是本招射程，不够先走近；冲进途中目标消失就收招，不留下任何代价。
 * 放完之后：命中才付攻防双降，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function superpowerWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
        const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0);
        return minHealth <= 0 || CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth;
    }

    CompanionBehavior.registerUse("superpower", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return superpowerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !superpowerWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 18;
            if (distance <= capability.data.range) score += 6;
            if (distance <= 2.4) score += 5;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 10;
            return score;
        }
    });

    addPreferences("superpower", {}, [
        field(pathOf("aftershock"), "震荡式", "boolean", {
            help: "开启：命中点再荡一圈余震，把落点周围的敌人一起震开、地面坑更大；代价是自身防御再降一级、单发威力 ×0.9、起手 +2 刻、收招 +4 刻、冷却 +6 刻。关闭（贯穿式）：全力集中在单个目标、出手更快、只降原生一级。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起蛮力，先走近。调大愿意从更远处就冲，也越容易在冲刺途中被走位甩开。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一记最重的单体打击在身价下跌前收掉；关闭则所有目标同价。"
        }),
        field(pathOf("ai.minHealth"), "最低生命比例", "number", {
            min: 0, max: 0.9, step: 0.1,
            help: "自身生命比例低于这个值就不主动用蛮力（0＝不限制）。调高能让它把这一记留给值得交换的局面。"
        })
    ]);
}
