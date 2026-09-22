/**
 * 啄钻 / drillpeck 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 5）格内；钻程短，够不到先让共享接近逻辑送进来。
 * 对谁出手：`ai.diveAir`（默认开）把已经离地的目标排得更前——旋得快的个体钻空中的破绽更狠；`ai.finish` 收残血。
 * 出手位置：喜欢 1.2–2.8 格（钻轴正好咬住、目标不容易在口间隔里走开）。
 * 放完之后：目标被一口口顶开，交回共享计划决定继续贴身还是等冷却。
 */
namespace PokemonSkills {
    function drillpeckWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
    }

    /** 接近距离取实际射程（共享任务还会再乘一次接近系数），停下时目标稳稳落在钻轴里。 */
    function drillpeckApproach(capability: WorldBehavior.Capability): number {
        const range = Number(capability.data.range);
        return isFinite(range) && range > 0 ? range : 2.1;
    }

    CompanionBehavior.registerUse("drillpeck", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return drillpeckApproach(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return drillpeckWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !drillpeckWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "diveAir", true) && target.grounded === false) score += 9;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.4) score += 6;
            if (distance >= 1.2 && distance <= 2.8) score += 3;
            return score;
        }
    });

    addPreferences("drillpeck", {}, [
        flag("deep", "深钻式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.diveAir", "优先空中目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
