/**
 * 逐步击破 / chipaway 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 5）格内；臂程很短，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.breakGuard`（默认开）在目标身上有正面防御等级（防／特防）时显著抬分——本招无视这些涨防，
 *   正是用来对付扎了防御架势的对手；`ai.finish` 收残血。目标没涨防时它仍是一记稳定的连击，但不抢优先级。
 * 出手位置：贴身（约 1.4 格内），连击短、循环快，适合一记接一记地补。
 * 放完之后：交回共享交战计划；冷却短，下一轮很快接得上。
 */
namespace PokemonSkills {
    function chipawayValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 只读、回调内缓存的「目标正面防御等级总数」；由参数层的同一份阶梯读取。 */
    CompanionBehavior.registerFact("world_combat:move_chipaway/guard", function (access, actor, _argument) {
        return access.valid(actor) ? chipawayGuard(access, actor) : 0;
    });

    function chipawayGuardNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_chipaway/guard", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(chipawayId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!chipawayValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) { return chipawayValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 14;
            if (CompanionBehavior.ai<boolean>(capability, "breakGuard", true) && chipawayGuardNow(context, target) > 0) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences(chipawayId, {}, [
        flag("rush", "抢攻式"),
        number("ai.maxChase", "出手距离", 2, 10, 1),
        flag("ai.breakGuard", "优先涨防目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
