/**
 * 金属音 的伙伴 AI 用途：这招自己的一套出手计划——找一段对方看不见自己的距离，站定把音磨出去。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没被磨出回响。声音不需要通视，掩体挡不住它，
 *   所以真正理想的局面是「我看得见它、它打不到我、中间还隔着墙」——`available` 不要求视线，priority
 *   会给「被掩体挡住的那一侧」加分，让它优先躲着磨。
 * 什么时候最想出手：目标被掩体挡住（看不到施法者）时 priority 抬高；目标离得较远、还在赶路时也加分。
 * 对谁出手：当前威胁；已经带着「刮擦」身份的目标跳过，避免重复。
 * 够不到怎么办：reach 就是回响距离，共享任务会先走近到听得见的距离再磨。
 * 放完之后：目标特防大降并带着很长一段回响；伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    function metalsoundHidden(context: WorldBehavior.Context, threat: Entity): boolean {
        return !world(context).clear(point(threat.point), point(source(context).point));
    }

    function metalsoundWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (status(context, threat, "grating")) return false;
        return true;
    }

    registerUse("metalsound", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || metalsoundWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !metalsoundWants(context, item, target)) return 0;
            const self = source(context);
            const cover = metalsoundHidden(context, target) ? 14 : 0;
            const far = distance(self.point, target.point) > 5 ? 8 : 0;
            return Math.min(90, 48 + cover + far);
        }
    });

    PokemonSkills.addPreferences("metalsound", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
