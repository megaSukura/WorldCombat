/**
 * 血月 / bloodmoon —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在 attack 与 ranged 位上。血月是一记长起手、带禁复窗口的重击，所以只在目标可见、敌对、存活、
 *   在 `ai.maxChase`（默认 16）以内，且自己生命不低于 `ai.minHealth`（默认 0.25）或对手已经能被这一下收掉时才出手。
 * 对谁出手：`accepts` 只筛阵营、存活与可见。
 * 放完之后：进入禁复窗口，本招自动不可用（由 `eligibility` 门禁保证）；伙伴会在这段时间改用它招，气势随之平息。
 * 优先级：基础 40（在射程内）／8（还要先走近）；对手生命 ≤ 40% 时 +20；月蚀式且目标近旁还有别的敌人时 +10。
 */
namespace PokemonSkills {
    function bloodmoonWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 16);
    }

    /** 目标近旁（3.5 格内）还站着几个别的敌人；月蚀式据此判断要不要先手铺场。 */
    function bloodmoonCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("bloodmoon", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!bloodmoonWants(context, item, target)) return false;
            const minHealth = CompanionBehavior.ai<number>(item, "minHealth", 0.25);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth || CompanionBehavior.ratio(target) <= 0.35;
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !bloodmoonWants(context, item, target)) return 0;
            const minHealth = CompanionBehavior.ai<number>(item, "minHealth", 0.25);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < minHealth && CompanionBehavior.ratio(target) > 0.35) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > item.data.range) return 8;
            let score = 40;
            if (CompanionBehavior.ratio(target) <= 0.4) score += 20;
            if (item.data.config.eclipse === true && CompanionBehavior.ai<boolean>(item, "crowd", false) && bloodmoonCrowd(context, target) >= 1) score += 10;
            return score;
        }
    });

    addPreferences("bloodmoon", {}, [
        field(pathOf("eclipse"), "月蚀式", "boolean", {
            help: "开启：月光铺开成一片，落点周围的其他敌人也吃到溅射，起手更短；代价是主目标威力 ×0.85。关闭（满月式）：全部气势砸在一点，主目标满威力、无溅射、起手更长。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 22, step: 1,
            help: "超过这个距离就不主动召月，先走近。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动召月（除非目标已残）。越高越珍惜自己，也越少抢收残血。"
        }),
        field(pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启（配合月蚀式）：目标近旁还站着别的敌人时更愿意召月，因为月光能一次铺到一圈；关闭则只看单点收益。"
        })
    ]);
}
