/**
 * 巨力锤 / gigatonhammer —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在 attack 与 contact 位上。巨力锤是一记长蓄力、长收招、带禁复窗口的重击，所以只在目标可见、
 *   敌对、存活、在 `ai.maxChase`（默认 7）以内，且自己生命不低于 `ai.minHealth`（默认 0.2）或对手已经能被这一下
 *   收掉时才出手。
 * 对谁出手：`accepts` 只筛阵营、存活与可见。
 * 放完之后：进入禁复窗口，本招自动不可用（由 `eligibility` 门禁保证）；伙伴会用别的招式或等待，让巨锤重新举起。
 * 优先级：基础 44（在射程内）／6（还要先走近）；对手生命 ≤ 40% 时 +15；横扫式且目标近旁还有别的敌人时 +12。
 */
namespace PokemonSkills {
    function gigatonhammerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    /** 目标近旁（3.0 格内）还站着几个别的敌人；横扫式据此判断要不要先手扫一圈。 */
    function gigatonhammerCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("gigatonhammer", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!gigatonhammerWants(context, item, target)) return false;
            const minHealth = CompanionBehavior.ai<number>(item, "minHealth", 0.2);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !gigatonhammerWants(context, item, target)) return 0;
            const minHealth = CompanionBehavior.ai<number>(item, "minHealth", 0.2);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < minHealth && CompanionBehavior.ratio(target) > 0.3) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > item.data.range) return 6;
            let score = 44;
            if (CompanionBehavior.ratio(target) <= 0.4) score += 15;
            if (item.data.config.sweep === true && CompanionBehavior.ai<boolean>(item, "crowd", false) && gigatonhammerCrowd(context, target) >= 1) score += 12;
            return score;
        }
    });

    addPreferences("gigatonhammer", {}, [
        field(pathOf("sweep"), "横扫式", "boolean", {
            help: "开启：旋身把巨锤扫过一圈，身边一圈敌人都吃到锤击、冲击波更长；代价是威力 ×0.75、收招 +6 刻、冷却 +8 刻。关闭（过顶式）：锤砸身前一点、冲击波向前推进，主目标满威力。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动抡锤，先走近。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动抡锤（除非目标已残）。越高越珍惜自己，也越少抢收残血。"
        }),
        field(pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启（配合横扫式）：目标近旁还站着别的敌人时更愿意抡锤，因为一圈都能扫到；关闭则只看单点收益。"
        })
    ]);
}
