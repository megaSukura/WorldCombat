/**
 * 黑雾 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、存活、敌对的目标在 `ai.maxChase`（默认 12）以内；尽抹式下还要过一道**对等 veto**——
 *   如果自己攒的正面等级比「对手的增益 + 自己的减益」还多，就不放，别把自己的增益也吞掉（定向式没有这道 veto）。
 * 什么时候最想出手：对手的正面等级合计达到 `ai.minStages`（默认 2）时大幅抬价（+8／级），这是它真正的用途；
 *   达不到就压到 12 分，只在没有更好的选择时随手抹一遍。
 * 对谁出手：最近的威胁；雾以自身为中心，走近到波及半径以内再放。
 * 够不到怎么办：reach 就是本招半径，共享任务把身位收进半径后再吐雾。
 * 放完之后：一圈人的等级归零；交回共享交战计划继续打。
 * 配置 focused（定向）：只抹非友方，自己与队友的增益留住，但范围更小、起手更慢、冷却更长，且不清自己的减益。
 */
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
        return total;
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
