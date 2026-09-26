/**
 * 细雪 / powdersnow 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内；这一招射程很短，够不到先走近。
 * 对谁出手：默认（ai.spread 开）优先挑沿自己→目标方向张开的那片实际短扇能同时吹到几个敌人的目标
 *   （会用本招真实的角度与掩体通视来数），关闭则只按射程与血量挑一个目标，当便宜的近身点伤用。
 * 放完之后：瞬发结算，伙伴交回共享顺序；因为冷却很短，它会被反复使用。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("powdersnow", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 12, 1),
        PokemonSkills.flag("ai.spread", "优先挨着的目标")
    ]);

    /** 沿施法者→目标方向张开、与本招判定同形的短扇里实际能吹到几个敌人；被方块挡住的除外。 */
    function powdersnowFanCount(context: WorldBehavior.Context, target: Entity, range: number): number {
        const self = source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.2) return 0;
        const ux = dx / length, uz = dz / length;
        const access = world(context);
        let half = 40;
        try { half = PokemonSkills.p("powdersnow", "angle", access); } catch (error) { half = 40; }
        if (!isFinite(half) || half <= 0) half = 40;
        const cosHalf = Math.cos(Math.min(90, half) * Math.PI / 180);
        const here = point(self.point);
        const nearby = (context.facts.nearby as Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const span = Math.sqrt(ox * ox + oz * oz);
            if (span < 0.2 || span > range) continue;
            if ((ox * ux + oz * uz) / span < cosHalf) continue;
            if (!access.clear(here, point(other.point))) continue;
            count++;
        }
        return count;
    }

    registerUse("powdersnow", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 18 : 0;
            if (ai<boolean>(capability, "spread", true)) score += Math.min(16, powdersnowFanCount(context, target, capability.data.range) * 8);
            return score + Math.round(ratio(target) * 5);
        }
    });
}
