/**
 * 龙之怒 / dragonrage 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是固定 40 的重击，所以 `ai.value`（默认开）按实际收益排序：目标防御越高越划算（这是唯一不在意防御的
 * 一击），剩余生命越接近 40 收益越大；生命极厚的目标会因为 40 占比很小而自然降分，不会盲目倾泻。
 * 对龙属性免疫的目标不进候选；会侧移的高速目标按可达性略降分。关闭收益评分则只按威胁本身排序。
 * 急袭式只改变弹速与射程，不改变出手条件。
 */
namespace PokemonSkills {
    /** 目标对龙属性免疫（相性乘积为 0）时这一击打不出伤害：AI 不再把它当候选，手动瞄准不受影响。 */
    function dragonrageImmune(target: CompanionBehavior.Entity): boolean {
        const facts = target.facts;
        if (!facts || !Array.isArray(facts.types) || !facts.types.length) return false;
        let factor = 1;
        for (let i = 0; i < facts.types.length; i++) factor *= CobblemonCombat.typeEffectiveness("dragon", String(facts.types[i]));
        return factor === 0;
    }
    CompanionBehavior.registerUse("dragonrage", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !dragonrageImmune(target);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "value", true)) {
                // 固定 40 的收益：目标防御越高越划算（这是唯一不在意防御的一击）；剩余生命越接近 40，
                // 这一击占的比例越大。生命极厚的 Boss 因此自然降分，按实际收益而非只看威胁。
                const stats = CompanionBehavior.combatStats(context, target);
                const defence = stats && stats.stats && typeof stats.stats.def === "number" ? stats.stats.def : null;
                if (defence !== null) score += Math.max(0, Math.min(14, (defence - 60) * 0.12));
                score += 18 * Math.max(0, Math.min(1, 40 / Math.max(1, target.health)));
            }
            // 弹体直飞：走得快的目标更容易在飞行途中侧移躲开，按可达性降分。
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : -1;
            if (speed > 0.2) score -= 6;
            return score;
        }
    });

    addPreferences("dragonrage", {}, [
        field(pathOf("swift"), "急袭式", "boolean", {
            help: "开启：龙息弹飞得更急（约 ×1.25）、射程压短（约 ×0.85），更难被对手在起手窗口里走位躲开，代价是打得更近。关闭（常规式，默认）：射程与弹速均衡。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不出手，先走近。越大越会在更远处先手砸出。"
        }),
        field(pathOf("ai.value"), "按收益评分", "boolean", {
            help: "开启：按这一击的实际收益排序——目标防御越高越优先（固定 40 不看防御），剩余生命越接近 40 越优先；生命极厚的目标会相应降分。关闭：只按威胁本身排序。"
        })
    ]);
}
