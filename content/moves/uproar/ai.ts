/**
 * 吵闹 的伙伴 AI 用途：这招自己的一套出手计划——先把自己送进人群，再扯开嗓子连喊。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、声浪半径内至少站着
 *   ai.minFoes 个非友方。人不够就先由共享接近逻辑继续往人群里挤，不空放。
 * 对谁出手：当前威胁；自己已经带着 uproar 身份时跳过（正喊着就不再叠）。
 * 够不到怎么办：reach 就是声浪半径，够不到就由共享任务走近——自爆式范围招的接近就是它的准备。
 * 放完之后：圈里的人连吃几声，期间都睡不着；伙伴交回共享顺序再决定追击还是脱离。
 * ai.leaveStation：驻守/静止命令下是否愿意离位去喊。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("uproar", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.number("ai.minFoes", "罩住人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的声浪半径估算，用来判断值不值得挤进去喊；实际命中仍走招式自己的公式。 */
    function uproarRadiusOf(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        return Math.max(3.6, Math.min(9.0, 5 + (height - 1.4) * 1.1));
    }

    function uproarFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function uproarWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (status(context, self, "uproar")) return false;
        return uproarFoes(context, self.point, uproarRadiusOf(context, item)) >= ai<number>(item, "minFoes", 1);
    }

    registerUse("uproar", {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (context, item) { return uproarRadiusOf(context, item); },
        available: function (context, item, _purpose, target) { return !target || uproarWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !uproarWants(context, item, target)) return 0;
            return Math.min(95, 40 + uproarFoes(context, source(context).point, uproarRadiusOf(context, item)) * 7);
        }
    });
}
