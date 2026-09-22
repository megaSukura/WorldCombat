/**
 * 临别礼物 的伙伴 AI 用途：这招自己的一套出手计划——只在真的走投无路时把命交出去。
 *
 * 什么局面有意义：自己的生命比例掉到 ai.cornered 以下，且 gift 半径内站着一个还没被哀悼的非友方。
 * 对谁出手：当前威胁；先把身边最近的那个罩住（遗念也留在原地）。
 * 够不到怎么办：reach 就是礼物半径，够不到就由共享任务走近目标——凑到身边才炸，是自我牺牲前的准备。
 * 放完之后：施法者倒下，遗念留在原地；伙伴运行随该个体退场结束。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("memento", { ai: { cornered: 0.2, leaveStation: false } }, [
        PokemonSkills.number("ai.cornered", "残血阈值", 0.05, 0.5, 0.05),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function mementoCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, self.point) <= item.data.range) count++;
        }
        return count;
    }

    function mementoWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (ratio(self) > ai<number>(item, "cornered", 0.2)) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        return !status(context, threat, "grieving");
    }

    registerUse("memento", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || mementoWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !mementoWants(context, item, target)) return 0;
            return Math.min(110, 100 + mementoCaught(context, item) * 2);
        }
    });
}
