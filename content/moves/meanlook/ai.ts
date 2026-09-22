/**
 * 黑色目光 的伙伴 AI 用途：这招自己的一套出手计划——用术者的不动换目标的不动。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase（默认 10）格以内、目标还没被定住、视线通畅。
 *   目标正在逃跑时加分（`ai.catchRunners` 默认开）：它正要离开，一道目光正好把它钉住。
 *   只有目标离得够近（`ai.holdRange` 默认 8）时才值得用——太远目光拉不住，术者反而白站。
 * 对谁出手：当前威胁；已被 trapped（任何来源）的目标跳过。
 * 够不到怎么办：reach 就是凝视距离，超出先走近；视线被掩体挡住时交回共享接近逻辑，找得到角度再瞪。
 * 放完之后：术者在这段时间里站定不动、不能出手，目标被完全钉住；定身是共享的，伙伴交回共享顺序决定解围或撤退。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("meanlook", { ai: { maxChase: 10, holdRange: 8, catchRunners: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.number("ai.holdRange", "凝视距离", 3, 12, 1),
        PokemonSkills.flag("ai.catchRunners", "优先逃跑目标"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function meanlookWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (status(context, threat, "trapped")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const range = ai<number>(item, "holdRange", 8);
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > Math.min(ai<number>(item, "maxChase", 10), range)) return false;
        return world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("meanlook", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || meanlookWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !meanlookWants(context, item, target)) return 0;
            let value = 46;
            if (ai<boolean>(item, "catchRunners", true) && fleeing(context, target)) value += 18;
            if (context.facts.focus === target.ref) value += 10;
            return Math.min(90, value);
        }
    });
}
