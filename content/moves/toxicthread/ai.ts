/**
 * 毒丝 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、对方还没被毒丝缠过（缠过就不再浪费一次）。
 * 对谁出手：当前威胁；速度比伙伴快、或还没中毒的优先——先削弱最快、最难缠的那个。
 * 够不到怎么办：reach 就是吐丝距离，超出的先走近；丝有飞行时间且怕掩体，视线不好时交回共享接近逻辑。
 * 放完之后：目标中毒、掉速度，并按配置被拽近或被钉住；伙伴随即交回共享顺序再决定追击或拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("toxicthread", { ai: { maxChase: 8, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function toxicthreadWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        return !status(context, threat, "laced");
    }

    registerUse("toxicthread", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || toxicthreadWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !toxicthreadWants(context, item, target)) return 0;
            const self = source(context);
            const faster = typeof target.speed === "number" && typeof self.speed === "number" && target.speed > self.speed ? 12 : 0;
            const clean = !status(context, target, "poison") ? 10 : 0;
            const provoked = self.hurtAgo < 40 ? 8 : 0;
            return Math.min(90, 50 + faster + clean + provoked);
        }
    });
}
