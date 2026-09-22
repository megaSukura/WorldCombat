/**
 * 鬼面 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、对方还没被吓住、视线通畅。
 * 对谁出手：当前威胁；优先挑选速度属性比自己高、或刚打过自己的那个——越快的对手越值得先吓慢。
 * 够不到怎么办：reach 就是凝视距离，超出的先走近；视线被挡时交回共享接近逻辑，找得到角度再瞪。
 * 放完之后：目标大幅掉速度、退缩并僵住片刻，伙伴随即交回共享顺序再决定追击或脱离。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("scaryface", { ai: { maxChase: 9, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function scaryfaceVisible(context: WorldBehavior.Context, threat: Entity): boolean {
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (status(context, threat, "feared")) return false;
        return world(context).clear(point(source(context).point), point(threat.point));
    }

    function scaryfaceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 9)) return false;
        return scaryfaceVisible(context, threat);
    }

    registerUse("scaryface", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || scaryfaceWants(context, item, target); },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible && scaryfaceVisible(context, target);
        },
        priority: function (context, item, target) {
            if (!target || !scaryfaceWants(context, item, target)) return 0;
            const self = source(context);
            const faster = typeof target.speed === "number" && typeof self.speed === "number" && target.speed > self.speed ? 12 : 0;
            const provoked = self.hurtAgo < 40 ? 8 : 0;
            return Math.min(90, 52 + faster + provoked);
        }
    });
}
