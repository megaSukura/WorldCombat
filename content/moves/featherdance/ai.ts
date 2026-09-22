/**
 * 羽毛舞 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、对方还没被羽绒覆住。
 * 对谁出手：当前威胁；正在攻击自己或主人、或刚打过自己的那个优先——先把最凶的物攻手压住。
 * 够不到怎么办：reach 就是撒羽距离，超出的先走近；羽绒会被掩体挡下，视线不好时交回共享接近逻辑。
 * 放完之后：目标大幅掉攻击，落点留下一片绒雾；伙伴随即交回共享顺序，把对手往绒雾里带或直接追击。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("featherdance", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function featherdanceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !status(context, threat, "downy");
    }

    registerUse("featherdance", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || featherdanceWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !featherdanceWants(context, item, target)) return 0;
            const self = source(context);
            const owner = context.facts.owner;
            const provoked = target.attacking === self.ref || !!owner && target.attacking === owner.ref;
            const recent = self.hurtAgo < 40;
            return Math.min(90, 54 + (provoked ? 12 : 0) + (recent ? 8 : 0));
        }
    });
}
