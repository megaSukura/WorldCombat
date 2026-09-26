/**
 * 太晶爆发 / terablast —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 14）格内时，作为远程攻击出手；
 * 焦点目标不受距离限制（共享任务会先走近到射程）。够不到交给共享接近逻辑。
 * 形态取自本个体当下的物攻/特攻对比：晶矛优先挑附近生命上限最高的单个敌人（高价值目标），
 * 晶束优先在目标方向上能串起两个及以上敌人的时机。两者走同一 `world_combat:ranged` 入口。
 * 配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    function terablastForm(context: WorldBehavior.Context, self: WorldMethods.Subject): string {
        var stats: any = CompanionBehavior.combatStats(context, self), values = stats && stats.stats;
        var attack = values && typeof values.atk === "number" ? values.atk : 0;
        var special = values && typeof values.spa === "number" ? values.spa : 0;
        return attack > special ? "ram" : "beam";
    }

    /** Non-friendly bodies within `radius` of the segment self→target (t in [0,1]). */
    function terablastLine(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject, radius: number): number {
        var nearby: WorldMethods.Subject[] = context.facts.nearby || [], from = self.point, to = target.point;
        var dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], lengthSquared = dx * dx + dy * dy + dz * dz;
        if (lengthSquared < 1e-6) return 0;
        var count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly === true || other.visible === false) continue;
            var ox = other.point[0] - from[0], oy = other.point[1] - from[1], oz = other.point[2] - from[2];
            var t = (ox * dx + oy * dy + oz * dz) / lengthSquared;
            if (t < 0 || t > 1) continue;
            var px = ox - dx * t, py = oy - dy * t, pz = oz - dz * t;
            if (Math.sqrt(px * px + py * py + pz * pz) <= radius) count++;
        }
        return count;
    }

    function terablastTopMaximum(context: WorldBehavior.Context): number {
        var nearby: WorldMethods.Subject[] = context.facts.nearby || [], best = 0;
        for (var i = 0; i < nearby.length; i++) if (nearby[i].friendly !== true && nearby[i].visible !== false) best = Math.max(best, Number(nearby[i].maximum) || 0);
        return best;
    }

    registerUse("terablast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            return !!target && !!target.health && target.health > 0;
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref)
                return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 14);
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target)
                return 0;
            var self = source(context);
            if (terablastForm(context, self) === "ram")
                return (Number(target.maximum) || 0) >= terablastTopMaximum(context) - 0.001 ? 45 : 5;
            return terablastLine(context, self, target, 1.4) >= 2 ? 55 : 5;
        }
    });
    PokemonSkills.addPreferences("terablast", { ai: { maxChase: 14, leaveStation: false } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位")]);
}
