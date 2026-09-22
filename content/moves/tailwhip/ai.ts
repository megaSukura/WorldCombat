/**
 * 摇尾巴 的伙伴 AI 用途：这招自己的一套出手计划——把自己送进能甩到的范围，再绕身甩一圈。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、尾巴半径内至少站着
 *   ai.minFoes 个看得见、还没被破防的非友方（默认 1）。它是绕身一圈，所以被围住时最值得。
 * 对谁出手：当前威胁；已经带着 guardbroken 身份（任何来源）时跳过，避免重复。
 * 够不到怎么办：reach 就是尾巴半径，由共享任务把身体带进人群；这招靠近本身就是它的准备。
 * 出手时机：只要有人可甩就出手；它是防御削弱，不抢在别人需要救命的当口。
 * 放完之后：圈里的敌人一起掉防御，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("tailwhip", { ai: { maxChase: 10, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "最少人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的尾巴半径估算；实际命中仍走招式自己的 sweepRadius。 */
    function tailwhipRadius(context: WorldBehavior.Context): number {
        const self = source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        return Math.max(1.8, Math.min(4.2, 2.2 + width * 1.4));
    }

    /** 绕身半径内看得见、未被破防的非友方数量；掩体挡住的（不可见）不计。 */
    function tailwhipFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function tailwhipWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (status(context, threat, "guardbroken")) return false;
        return tailwhipFoes(context, self.point, tailwhipRadius(context)) >= ai<number>(item, "minFoes", 1);
    }

    registerUse("tailwhip", {
        protocols: ["world_combat:control"],
        reach: function (context) { return tailwhipRadius(context); },
        available: function (context, item, _purpose, target) { return !target || tailwhipWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !tailwhipWants(context, item, target)) return 0;
            return Math.min(90, 55 + tailwhipFoes(context, source(context).point, tailwhipRadius(context)) * 6);
        }
    });
}
