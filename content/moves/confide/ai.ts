/**
 * 密语 的伙伴 AI 用途：这招自己的一套出手计划——先决定要不要开口，再决定说给谁听。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没在失神中。悄悄话看到威胁就能说；
 *   传谣要目标 rumorRadius 内至少站着 ai.minListeners 个非友方，人不够就等，不空放。
 *   密语是声音、不需要通视，所以即使视线被挡也照样值得开口——这是它和其它凝视招式不同的地方。
 * 对谁出手：当前威胁；已经失神的目标跳过，避免重复。
 * 出手时机：ai.opening=迎击时只在目标正攻自己或主人、或自己刚被打过时开口；随时则见威胁就说。
 * 够不到怎么办：reach 就是密语距离，超出的先走近；声音不要求通视，接近过程不会被掩体打断。
 * 放完之后：目标大幅掉特攻；传谣时站在旁边的人一起失神，伙伴随即交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("confide", { ai: { maxChase: 12, opening: "anytime", minListeners: 2, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.number("ai.minListeners", "传谣最少听众", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的闲话半径估算，用来判断值不值得传；实际命中仍走招式自己的公式。 */
    function confideRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        return Math.max(1.5, Math.min(3.2, width * 1.5 + 1.2));
    }

    /** 以某点为中心、这么近的可见非友方人数；命中判定仍走招式自己的 rumorRadius。 */
    function confideListeners(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function confideWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        if (status(context, threat, "confided")) return false;
        if (item.data.config && item.data.config.rumor)
            return confideListeners(context, threat.point, confideRadius(context, item)) >= ai<number>(item, "minListeners", 2);
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("confide", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || confideWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !confideWants(context, item, target)) return 0;
            if (item.data.config && item.data.config.rumor)
                return Math.min(90, 60 + confideListeners(context, target.point, confideRadius(context, item)) * 6);
            return 50;
        }
    });
}
