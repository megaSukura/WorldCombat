/**
 * 泼沙 的伙伴 AI 用途：这招自己的一套出手计划——贴着人朝一个方向糊一排。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、它还没被任何「糊眼」类状态罩住，并且目标方向上
 *   的扇面里至少站着 ai.crowd 个非友方——短射程换来的就是一次糊一排。
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

    /** 以当前威胁方向为准，扇面里看得见的非友方数量；命中判定仍走招式自己的张角与通视检查。 */
    function sandattackInCone(context: WorldBehavior.Context, self: Entity, target: Entity, range: number, angleDegrees: number): number {
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        const hx = dx / length, hz = dz / length, cosHalf = Math.cos(angleDegrees * Math.PI / 360);
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const gap = Math.sqrt(ox * ox + oz * oz);
            if (gap > range) continue;
            if (gap > 0.001 && (ox / gap * hx + oz / gap * hz) < cosHalf) continue;
            count++;
        }
        return count;
    }

    function sandattackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 6)) return false;
        if (status(context, threat, "aim_impaired")) return false;
        return sandattackInCone(context, self, threat, item.data.range, 70) >= ai<number>(item, "crowd", 1);
    }

    registerUse("sandattack", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || sandattackWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !sandattackWants(context, item, target)) return 0;
            const crowd = sandattackInCone(context, source(context), target, item.data.range, 70);
            return Math.min(90, 45 + (crowd - 1) * 8);
        }
    });
}
