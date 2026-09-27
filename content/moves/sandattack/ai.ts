/**
 * 泼沙 的伙伴 AI 用途：这招自己的一套出手计划——贴着人朝一个方向糊一排。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、它还没被任何「糊眼」类状态罩住，并且以威胁方向为准、
 *   按本招自己公式算出的扇面里至少站着 ai.crowd 个非友方——扇角取参数公式（含粗粝/细腻修正），人群按
 *   真实身体箱（WorldGeometry.bodySector + selectBodies）估算，不再固定 70 度或只看中心点。
 * 对谁出手：当前威胁；已经带着共享身份 aim_impaired 的目标跳过。
 * 够不到怎么办：reach 就是扇面长度（全族最短），超出先走近；这是近身招，站得越近扇面越早罩住人。
 * 放完之后：扇面里的敌人命中一起下降，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("sandattack", { ai: { maxChase: 6, crowd: 1, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 12, 1),
        PokemonSkills.number("ai.crowd", "扇面最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 本次配置实际踢出的张角与射程：走本招参数公式（含砂质修正），不硬编码一套近似扇角。 */
    function sandattackGeometry(context: WorldBehavior.Context, item: WorldBehavior.Capability): { range: number; angle: number } {
        const world = CompanionBehavior.world(context);
        const config = item.data.config || {};
        const coarse = !(config.grit === "fine");
        let angle = 48;
        try {
            const value = PokemonSkills.p("sandattack", "coneAngle",
                { world: world, actor: world.source(), skill: PokemonSkills.skills["sandattack"], detail: { values: config } });
            if (typeof value === "number" && isFinite(value) && value > 0) angle = value;
        } catch (error) { }
        const range = Math.max(2.5, Number(item.data.range) || 3.5);
        return { range: range, angle: Math.max(30, Math.min(100, Math.round(angle * (coarse ? 1.35 : 0.85)))) };
    }

    /** 以当前威胁方向为准、按真实扇面体积笼罩的非友方数量；命中判定仍走招式自己的同一份张角与射程。 */
    function sandattackCrowd(context: WorldBehavior.Context, item: WorldBehavior.Capability, self: Entity, target: Entity): number {
        const world = CompanionBehavior.world(context);
        const geometry = sandattackGeometry(context, item);
        const origin = CompanionBehavior.point(self.point), aim = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(aim.minus(origin), WorldCombat.point(0, 0, 1));
        const region = WorldGeometry.bodySector(origin, heading, geometry.range, geometry.angle);
        let count = 0;
        WorldGeometry.selectBodies(world, region, function (actor, facts) {
            if (String(actor.ref()) === String(self.ref) || facts.friendly() || facts.health() <= 0 || !facts.visible()) return;
            count++;
        });
        return count;
    }

    function sandattackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 6)) return false;
        if (status(context, threat, "aim_impaired")) return false;
        return sandattackCrowd(context, item, self, threat) >= ai<number>(item, "crowd", 1);
    }

    registerUse("sandattack", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || sandattackWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !sandattackWants(context, item, target)) return 0;
            const crowd = sandattackCrowd(context, item, source(context), target);
            return Math.min(90, 45 + (crowd - 1) * 8);
        }
    });
}
