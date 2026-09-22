/**
 * 假哭 的伙伴 AI 用途：这招自己的一套出手计划——先凑近到看得清脸，再挤出眼泪。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、视线通畅、目标还没被唬住。它是骗术，必须被看见，
 *   所以 `available` 会真的比一次视线；被掩体挡住就先绕出角度，而不是硬凑。
 * 什么时候最想出手：目标正忙着打别人（没在防自己）时 priority 抬高一截——假哭专挑对方走神的一瞬；
 *   迎击模式（ai.opening=targeting）下只在目标正攻自己或主人、或自己刚被打过时才用。
 * 对谁出手：当前威胁；已经带着「不知所措」身份的目标跳过。
 * 够不到怎么办：reach 就是假哭距离（很短），共享任务会先把身位压到射程内。
 * 放完之后：目标特防下降并在原地僵住一下；伙伴随即交回共享顺序。
 */
namespace CompanionBehavior {
    function faketearsVisible(context: WorldBehavior.Context, threat: Entity): boolean {
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        return world(context).clear(point(source(context).point), point(threat.point));
    }

    function faketearsWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        if (status(context, threat, "flustered")) return false;
        if (!faketearsVisible(context, threat)) return false;
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("faketears", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || faketearsWants(context, item, target); },
        accepts: function (context, _item, target) { return !target.friendly && target.health > 0 && target.visible && faketearsVisible(context, target); },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !faketearsWants(context, item, target)) return 0;
            const self = source(context);
            const distracted = target.attacking && target.attacking !== self.ref ? 12 : 0;
            const provoked = self.hurtAgo < 40 ? 6 : 0;
            return Math.min(90, 50 + distracted + provoked);
        }
    });

    PokemonSkills.addPreferences("faketears", { ai: { maxChase: 8, opening: "anytime", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 14, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
