/**
 * 棉孢子 的伙伴 AI 用途：这招自己的一套出手计划——先把自己送进人群，再当场炸开。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、孢子半径内至少站着
 *   ai.minFoes 个非友方。人不够就交回共享接近逻辑，继续往人群里挤，不空放。
 * 对谁出手：当前威胁；它已被棉絮黏住时跳过，避免重复。
 * 够不到怎么办：reach 就是孢子半径，够不到就由共享任务走近目标——自爆式范围招的接近就是它的准备。
 * 放完之后：圈里的人一起掉速度，伙伴交回共享顺序再决定追击还是脱离。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("cottonspore", { ai: { maxChase: 12, minFoes: 2, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.number("ai.minFoes", "包住人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的孢子半径估算，用来判断值不值得挤进去炸；实际命中仍走招式自己的公式。 */
    function cottonsporeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        let radius = 3.0 + (width - 0.9) * 1.2;
        radius *= item.data.config && item.data.config.spread ? 1.25 : 0.8;
        return Math.max(1.6, Math.min(4.5, radius));
    }

    function cottonsporeCaught(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function cottonsporeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        if (status(context, threat, "cottoned")) return false;
        return cottonsporeCaught(context, self.point, cottonsporeRadius(context, item)) >= ai<number>(item, "minFoes", 2);
    }

    registerUse("cottonspore", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return cottonsporeRadius(context, item); },
        available: function (context, item, _purpose, target) { return !target || cottonsporeWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !cottonsporeWants(context, item, target)) return 0;
            return Math.min(95, 60 + cottonsporeCaught(context, source(context).point, cottonsporeRadius(context, item)) * 8);
        }
    });
}
