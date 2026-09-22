/**
 * 树叶 / leafage 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 11）格之内；更远交给共享接近逻辑。
 *   这是最便宜的一记远程消耗，偏好从稍远处先手、然后一记接一记地撒。
 * 对谁出手：`ai.finish`（默认关）打开时，生命已不足四成的目标多一档分（拿一把叶去收尾）；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近；叶有扇面，目标的走位通常仍会被兜到。
 * 放完之后：一发即散，交回共享交战计划等很短的冷却再撒下一把。
 */
namespace PokemonSkills {
    function leafageWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
    }

    CompanionBehavior.registerUse(leafageId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return leafageWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !leafageWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 14;
            if (distance <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && target.health <= target.maximum * 0.4) score += 10;
            return score;
        }
    });

    addPreferences(leafageId, {}, [
        field(pathOf("heavy"), "重叶式", "boolean", {
            help: "开启：单片威力 ×1.3、判定 ×1.35、射程 ×1.12，但叶数 ×0.55、起手 +1 刻、冷却 +5 刻——一把少而重的叶，撒得更远。关闭（疾撒式，默认）：叶多、出手快、回得快，但单叶轻、判定窄、射程近。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动撒叶，先走近；越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收尾", "boolean", {
            help: "开启：生命已不足四成的目标排得更前，拿一把叶收尾；关闭则所有目标同价。"
        })
    ]);
}
