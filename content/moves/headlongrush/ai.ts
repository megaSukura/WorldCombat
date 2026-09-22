/**
 * 突飞猛扑 / headlongrush 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格之内；更远交给共享接近逻辑。
 *   这一记在提交那一刻就弃守（自降防特防），只有在自身生命比例不低于 `ai.minHealth`（默认 0＝不限制）时才起手。
 * 对谁出手：`ai.minRange`（默认 2.5）格以外才把它当主选——助跑越足撞得越狠、撞飞越远；贴脸时分数压低，
 *   把这一记留给有距离的目标。`ai.finish`（默认开）打开时，残血目标再高一档。
 * 够不到怎么办：reach 就是本招射程，先走近；冲进途中目标消失就停在原地、不留下伤害。
 * 放完之后：交回共享交战计划等冷却；沟留在场上，但本招不因它改后续决策。
 */
namespace PokemonSkills {
    function headlongrushWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
        const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0);
        return minHealth <= 0 || CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth;
    }

    CompanionBehavior.registerUse(headlongrushId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return headlongrushWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !headlongrushWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = distance <= capability.data.range ? 14 : 0;
            const minRange = CompanionBehavior.ai<number>(capability, "minRange", 2.5);
            if (distance >= minRange) score += 6; else score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 10;
            return score;
        }
    });

    addPreferences(headlongrushId, { plow: false, ai: { maxChase: 8, minRange: 2.5, finish: true, minHealth: 0 } }, [
        field(pathOf("plow"), "犁地式", "boolean", {
            help: "开启：冲距 ×1.15、撞飞 ×1.2、犁出的沟 ×1.3 且留得更久；代价是撞击威力 ×0.92、起手 +2 刻、收招 +3 刻、冷却 +5 刻。关闭（止步式）：撞到就停，单发更重、出手更快，但推不远、沟也短。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动起手，先走近。调大愿意从更远处就发起，也越容易在冲刺途中被走位甩开。"
        }),
        field(pathOf("ai.minRange"), "助跑下限", "number", {
            min: 0, max: 8, step: 0.5,
            help: "离目标至少这么远才会把它当主选；越近越没有助跑空间，撞击与撞飞都打折。贴脸时分数压低、让位给别的招。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一记最重的单发在身价下跌前收掉；关闭则所有目标同价。"
        }),
        field(pathOf("ai.minHealth"), "最低生命比例", "number", {
            min: 0, max: 0.9, step: 0.1,
            help: "自身生命比例低于这个值就不主动用突飞猛扑（0＝不限制）。调高能让它把这一记留给值得交换的局面。"
        })
    ]);
}
