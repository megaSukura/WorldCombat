/** haze：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 只读、回调内缓存的能力等级合计：argument "positive" 数正面，"negative" 数负面。 */
    CompanionBehavior.registerFact("world_combat:move_haze/stages", function (access, actor, argument) {
        if (!access.valid(actor)) return 0;
        const stages = hazeStages(access, actor), negative = String(argument) === "negative";
        let total = 0;
        for (let index = 0; index < hazeStats.length; index++) {
            const value = Number(stages[hazeStats[index]]) || 0;
            if (negative ? value < 0 : value > 0) total += Math.abs(value);
        }
        return total + (negative ? 0 : MobEffects.levels(access, actor, "beneficial"));
    });

    function hazeStageValue(context: WorldBehavior.Context, target: CompanionBehavior.Entity, negative: boolean): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_haze/stages", target, negative ? "negative" : "positive");
        return typeof value === "number" ? value : 0;
    }

    function hazeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        if (item.data.config && item.data.config.focused === true) return true;
        // 尽抹式：抹掉的不止对手的增益，还有自己的；只有当「对手的增益 + 自己的减益」不少于自己的增益时才划算。
        return hazeStageValue(context, target, false) + hazeStageValue(context, self, true) >= hazeStageValue(context, self, false);
    }

    CompanionBehavior.registerUse(hazeId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            return target === null ? true : hazeWants(context, item, target);
        },
        accepts: function (_context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !hazeWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const enemy = hazeStageValue(context, target, false);
            if (enemy < CompanionBehavior.ai<number>(item, "minStages", 2)) return 12;
            return Math.min(96, 40 + enemy * 8 + hazeStageValue(context, self, true) * 4);
        }
    });

    addPreferences(hazeId, {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑吐雾；越大越早铺开、也越容易被反打。" }),
        field(pathOf("ai.minStages"), "抹平门槛", "number", { min: 1, max: 6, step: 1,
            help: "对手正面等级合计达到这么多时，才把吐雾抬到高于普通交战；调 1 见一丝增益就优先抹，调大只在对手攒大了才优先。" })
    ]);
}
