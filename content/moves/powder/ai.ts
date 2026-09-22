/**
 * 粉尘 / powder 的伙伴 AI 用途：这是这招自己的一套出手计划——先给对手埋一颗，等它自己点火。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，且它身上还没有粉尘时。对手的招式表里有没有火招读不到，
 *   但火属性的个体几乎总带着火招，所以对火属性威胁加分；已经带着粉尘的目标跳过，不重复浪费冷却。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受；草属性对手会被跳过（粉尘直接穿过）。
 * 够不到怎么办：reach 是投掷距离，超出先走近；这是远程一抛，站远一点也能埋。
 * 放完之后：粉尘贴在对手身上等它点火，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    function powderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (status(context, threat, "powdered")) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        const facts = CompanionBehavior.pokemonFacts(context, threat);
        if (facts && facts.types && facts.types.indexOf("grass") >= 0) return false;
        return true;
    }

    registerUse("powder", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || powderWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !powderWants(context, item, target)) return 0;
            const facts = CompanionBehavior.pokemonFacts(context, target);
            const fire = !!facts && !!facts.types && facts.types.indexOf("fire") >= 0;
            return fire ? 78 : 42;
        }
    });

    PokemonSkills.addPreferences("powder", { ai: { maxChase: 10, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
