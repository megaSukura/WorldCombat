/**
 * 怪异电波 的伙伴 AI 用途：这招自己的一套出手计划——先决定值不值得放电，再说放不放得出来。
 *
 * 什么局面有意义：一个以自身为中心、绕身一圈的扰乱。`ready` 要求**实际电波半径**罩住的圈内至少站着
 *   `ai.minFoes`（默认 1）个可见、敌对、确实靠特攻吃饭且特攻等级未封底的敌人，否则整招不参与选择——
 *   圈里没有值得削的人时白放。`ai.maxChase` 仍是愿意接近的追击距离，用于先身位再放电。
 *   它不对准谁、也不需要看见谁，所以混战里贴上来的人越多越值。
 * 什么时候最想出手：圈里人越多 priority 越高；自己血量偏低时再加一段——被压着打时，一次削掉身边一圈人的特攻
 *   比继续对拼更值。
 * 对谁出手：不需要选目标（绕身放）；`available` 只用来核对考虑距离。
 * 够不到怎么办：reach 就是电波半径，共享任务会先把身位收进圈内再放。
 * 放完之后：圈内敌人特攻一起下降并带上电波身份；伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    /** 电波是贴地、半径 reach、上下各 3 格的一圈；按水平距离与身体竖直跨度判断，和实际 hitbox 判定一致。 */
    function eerieimpulseInField(self: Entity, other: Entity, reach: number): boolean {
        const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
        if (Math.sqrt(dx * dx + dz * dz) > reach) return false;
        const half = (typeof other.height === "number" && other.height > 0 ? other.height : 1.4) / 2;
        return other.point[1] + half >= self.point[1] - 3 && other.point[1] - half <= self.point[1] + 3;
    }
    /** 圈内真正值得扰乱的人：可见、敌对，且确实靠特攻吃饭、特攻等级还没封底。 */
    function eerieimpulseCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context), nearby = context.facts.nearby as Entity[];
        const reach = typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : 4;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (!eerieimpulseInField(self, other, reach)) continue;
            if (CompanionBehavior.stage(context, other, "spa") <= -6) continue;
            const stats = CompanionBehavior.combatStats(context, other);
            const spa = stats && stats.stats ? Number(stats.stats.spa) : 0;
            if (!(spa > 0)) continue;
            count++;
        }
        return count;
    }

    function eerieimpulseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        const self = source(context);
        return distance(self.point, threat.point) <= ai<number>(item, "maxChase", 8);
    }

    registerUse("eerieimpulse", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        ready: function (context, item) {
            return item.data.ready !== false && eerieimpulseCount(context, item) >= ai<number>(item, "minFoes", 1);
        },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return eerieimpulseWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !eerieimpulseWants(context, item, target)) return 0;
            let base = 42 + Math.min(20, eerieimpulseCount(context, item) * 8);
            if (ratio(source(context)) < 0.5) base += 8;
            return Math.min(90, base);
        }
    });

    PokemonSkills.addPreferences("eerieimpulse", { ai: { maxChase: 8, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "放电距离", 2, 16, 1),
        PokemonSkills.number("ai.minFoes", "圈内最少人数", 1, 6, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
