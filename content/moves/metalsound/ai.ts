/**
 * 金属音 的伙伴 AI 用途：这招自己的一套出手计划——找一段对方看不见自己的距离，站定把音磨出去。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没被磨出回响。声音不需要通视，掩体挡不住它，
 *   但磨音要站定好几段，所以真正理想的局面是「有队友在前面承伤、目标又走不动」——此时把特防一层层刮开最值。
 *   自己贴得太近又刚挨过打时降低优先级，先别站着挨磨。`available` 不要求视线。
 * 什么时候最想出手：目标被掩体挡住（看不到施法者）时 +12；附近有队友最近在承伤时 +12；目标几乎不移动时 +10；
 *   自己贴身且刚被打过时 -16。
 * 对谁出手：当前威胁；已经带着「刮擦」身份的目标跳过，避免重复。
 * 够不到怎么办：reach 就是回响距离，共享任务会先走近到听得见的距离再磨。
 * 放完之后：目标特防被分级磨低并带着很长一段回响；伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    function metalsoundHidden(context: WorldBehavior.Context, threat: Entity): boolean {
        return !world(context).clear(point(threat.point), point(source(context).point));
    }

    /** 目标几乎不移动时更适合站着磨；速度事实缺失时按中性处理。 */
    function metalsoundSlow(context: WorldBehavior.Context, threat: Entity): boolean {
        const value = velocity(context, threat);
        if (!value) return false;
        return Math.sqrt(value[0] * value[0] + value[2] * value[2]) < 0.05;
    }

    /** 附近是否有队友最近在承伤——有人顶在前面，磨音的窗口才撑得住。 */
    function metalsoundAllyPressed(context: WorldBehavior.Context, threat: Entity): boolean {
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.hurtAgo < 40 && distance(other.point, threat.point) <= 8) return true;
        }
        return false;
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
            const self = source(context), gap = distance(self.point, target.point);
            let value = 44;
            if (metalsoundHidden(context, target)) value += 12;
            if (metalsoundAllyPressed(context, target)) value += 12;
            if (metalsoundSlow(context, target)) value += 10;
            if (gap < 5 && self.hurtAgo < 40) value -= 16;
            return Math.max(0, Math.min(90, value));
        }
    });

    PokemonSkills.addPreferences("metalsound", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
