/**
 * 圣剑 / sacredsword 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；刃程是本族最长，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.breakGuard`（默认开）在目标有正面防御等级时显著抬分——本招无视这些涨防，用来切扎了防御的对手；
 *   `ai.finish` 收残血。它只切一个目标，不挑人堆。
 * 出手位置：站在刃程内（可远至约 3 格），拉满再斩；居合式会额外把身位送出去。
 * 放完之后：交回共享交战计划；起手较长，之后再补别的招。
 */
namespace PokemonSkills {
    function sacredswordValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 只读、回调内缓存的「目标正面防御等级总数」；由参数层的同一份阶梯读取。 */
    CompanionBehavior.registerFact("world_combat:move_sacredsword/guard", function (access, actor, _argument) {
        return access.valid(actor) ? sacredswordGuard(access, actor) : 0;
    });

    function sacredswordGuardNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_sacredsword/guard", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(sacredswordId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!sacredswordValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return sacredswordValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "breakGuard", true) && sacredswordGuardNow(context, target) > 0) score += 14;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences(sacredswordId, {}, [
        flag("iaido", "居合式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.breakGuard", "优先涨防目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
