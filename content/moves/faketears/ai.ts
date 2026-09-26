/**
 * 假哭 的伙伴 AI 用途：这招自己的一套出手计划——先凑近到看得清脸，再挤出眼泪。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、通视、目标还没被唬住。它是骗术，眼泪要能送到脸上，
 *   所以 `available` 会真的比一次视线（只看地形遮挡，不看对方朝向）；被掩体挡住就先绕出角度，而不是硬凑。
 * 什么时候最想出手：按实际收益排序，不要求目标注意施法者——特防高于物防的目标最值得先松开；
 *   队友正在集火这个方向时更值。自己刚挨过打也给一点加成，但它只是处境，不是出手前提。
 * 对谁出手：当前威胁；已经带着「不知所措」身份的目标跳过。
 * 够不到怎么办：reach 就是假哭距离（很短），共享任务会先把身位压到射程内。
 * 放完之后：目标特防下降；伙伴随即交回共享顺序，让队友去打这段窗口。
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
        return faketearsVisible(context, threat);
    }

    /** 这个方向是否已有队友在集火；有就更值得把特防缺口开在这里。 */
    function faketearsAllyFocus(context: WorldBehavior.Context, threat: Entity): boolean {
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.attacking === threat.ref) return true;
        }
        return false;
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
            // 特防高于物防的目标是先松开特防、再让队友特攻集火的理想人选。
            const facts = combatStats(context, target);
            const special = facts && facts.stats && typeof facts.stats.spd === "number" && typeof facts.stats.def === "number"
                ? facts.stats.spd - facts.stats.def : 0;
            const focus = (special > 0 ? 10 : 0) + (faketearsAllyFocus(context, target) ? 8 : 0);
            const pressured = self.hurtAgo < 40 ? 6 : 0;
            return Math.min(92, 50 + focus + pressured);
        }
    });

    PokemonSkills.addPreferences("faketears", { ai: { maxChase: 8, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
