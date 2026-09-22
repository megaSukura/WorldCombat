/**
 * 冲天拳 / skyuppercut 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 5）格内；拳程短，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.punishAir`（默认开）把已经离地、跳起的对手排得更前——离地的目标吃 `airBonus`，这一挑更狠；
 * `ai.finish`（默认开）收残血。目标是地面近敌时也出，把它挑离阵地给下一拍创造机会。
 * 放完之后：对手被顶到空中，交回共享计划决定追着打还是先走位。
 */
namespace PokemonSkills {
    function skyuppercutWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
    }

    /** 接近距离取实际射程（共享任务还会再乘一次接近系数），上勾要贴进去才能在拳程内挑到人。 */
    function skyuppercutApproach(capability: WorldBehavior.Capability): number {
        const range = Number(capability.data.range);
        return isFinite(range) && range > 0 ? range : 1.9;
    }

    CompanionBehavior.registerUse("skyuppercut", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return skyuppercutApproach(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return skyuppercutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !skyuppercutWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "punishAir", true) && target.grounded === false) score += 9;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.4) score += 6;
            return score;
        }
    });

    addPreferences("skyuppercut", {}, [
        flag("rising", "冲天式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.punishAir", "优先空中目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
