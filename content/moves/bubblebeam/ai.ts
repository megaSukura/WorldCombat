/**
 * 泡沫光线 / bubblebeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 14）格之内；更远交给共享接近逻辑。
 * 为什么优先跑得快的目标：这招打不疼、但会黏住压速度，`ai.crippleRunners`（默认开）下，正在快速移动的
 *   目标多一档分——先黏住追兵或逃兵，把它从速度优势里拽下来。
 * 对谁出手：已经带着共享身份 foamed 的目标降一档（重复黏着价值低），把这一发留给还清爽的对手。
 * 够不到怎么办：reach 就是本招射程，不够先走近；三颗泡按真实慢速飞行，AI 会在出膛时按目标当前移动前置，
 *   泡飞得慢，对付横移的路线更像提前占位而不是追击。
 * 放完之后：目标带着泡沫身份与掉速窗口，伙伴交回共享顺序决定继续追还是走位等冷却。
 */
namespace PokemonSkills {
    function bubblebeamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    function bubblebeamMoving(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return false;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.08;
    }

    CompanionBehavior.registerUse("bubblebeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bubblebeamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !bubblebeamWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 17;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "crippleRunners", true) && bubblebeamMoving(target)) score += 8;
            if (CompanionBehavior.status(context, target, "foamed")) score -= 7;
            return score;
        }
    });

    addPreferences("bubblebeam", {}, [
        field(pathOf("dense"), "浓沫", "boolean", {
            help: "开启：黏滞概率 +10%、可掉 2 级速度、泡沫时长 ×1.3、溅沫半径 ×1.4，适合把对手黏在原地；代价是泡沫威力 ×0.82、速度 ×0.85、起手 +2 刻、冷却 +4 刻。关闭（急泡）：泡沫威力 ×1.12、速度 ×1.12、射程 +2 格，代价是黏滞概率 −4%、泡沫时长 ×0.8，打完就走。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动喷泡沫，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.crippleRunners"), "优先黏跑得快的", "boolean", {
            help: "开启：正在快速移动的目标多一档分，先用泡沫把它压慢；关闭则所有目标同价。"
        })
    ]);
}
