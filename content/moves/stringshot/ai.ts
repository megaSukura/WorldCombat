/**
 * 吐丝 的伙伴 AI 用途：这招自己的一套出手计划——留住跑得快的、封住挤在一处的。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没被丝缠住。
 *   缠足模式下可以只对正在逃跑的威胁出手（ai.runnersOnly），把它留住；
 *   结网模式下要威胁身边至少挤着 ai.minFoes 个敌人，才值得铺网。
 * 对谁出手：当前威胁；已被缠住的跳过。
 * 够不到怎么办：reach 就是吐丝距离，超出先走近；丝有飞行时间，掩体挡住时交回共享接近逻辑。
 * 放完之后：目标大幅掉速度（缠足还带一段定身），伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("stringshot", { ai: { maxChase: 8, minFoes: 2, runnersOnly: false, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "结网最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.runnersOnly", "只缠逃者"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function stringshotCluster(context: WorldBehavior.Context, target: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function stringshotWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        if (status(context, threat, "silked")) return false;
        if (item.data.config && item.data.config.silk)
            return stringshotCluster(context, threat, 3) >= ai<number>(item, "minFoes", 2);
        if (ai<boolean>(item, "runnersOnly", false) && !fleeing(context, threat)) return false;
        return true;
    }

    registerUse("stringshot", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || stringshotWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !stringshotWants(context, item, target)) return 0;
            if (item.data.config && item.data.config.silk) return 55;
            return fleeing(context, target) ? 90 : 45;
        }
    });
}
