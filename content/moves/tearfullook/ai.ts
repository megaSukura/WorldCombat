/**
 * 泪眼汪汪 的伙伴 AI 用途：这招自己的一套出手计划——先看自己伤得够不够重，再决定示弱给谁看。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、目标还没在失落里，而且自己的生命比例不高于
 *   ai.hurtBelow（默认 1，任何时候都愿意示弱）。眼泪要被看见，所以视线被挡就不出手；
 *   放声大哭还要求面前扇形里至少站着 ai.minFoes 个非友方。
 * 对谁出手：当前威胁；已经失落的跳过，避免重复。
 * 优先：自己越接近见底，越优先示弱——生命降到 35% 及以下时进入 2 级危机档，价值更高；ai.hurtBelow 调低则留到更危险时才用。
 * 够不到怎么办：含泪需要通视，被挡住时由共享接近逻辑换一个能相望的位置；放声大哭则要继续往人堆里挤。
 *   驻守只约束「离位」：原地够得到就照样示弱，由共享的 approach／站位规则决定要不要动。
 * 放完之后：目标物攻与特攻一起下降，伙伴交回共享顺序，再决定追击还是趁对方下不去手时脱离。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("tearfullook", { ai: { maxChase: 11, hurtBelow: 1, minFoes: 2, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.hurtBelow", "示弱血线", 0, 1, 0.05),
        PokemonSkills.number("ai.minFoes", "大哭人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与本招参数同源的哭声半径，用当前个体与配置求值，不写死近似值。 */
    function tearfullookRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(2.0, PokemonSkills.p(PokemonSkills.tearfullookId, "sobRadius",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[PokemonSkills.tearfullookId], detail: { values: item.data.config } }));
        } catch (error) { return 3.0; }
    }

    /** 与本招参数同源的扇面张角；AI 与真正的扇形判定读同一个公式。 */
    function tearfullookAngle(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(60, Math.min(140, PokemonSkills.p(PokemonSkills.tearfullookId, "sectorAngle",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[PokemonSkills.tearfullookId], detail: { values: item.data.config } })));
        } catch (error) { return 90; }
    }

    /** 面前扇形内、看得见且视线可达的非友方数量；命中判定仍走招式自己的几何。 */
    function tearfullookFoesInFront(context: WorldBehavior.Context, self: Entity, threat: Entity, radius: number, angle: number): number {
        const world = CompanionBehavior.world(context);
        const from = point(self.point);
        const forward = [threat.point[0] - self.point[0], threat.point[2] - self.point[2]];
        const length = Math.sqrt(forward[0] * forward[0] + forward[1] * forward[1]) || 1;
        const cosHalf = Math.cos(Math.min(360, Math.max(0, angle)) * Math.PI / 360);
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const distanceTo = Math.sqrt(dx * dx + dz * dz);
            if (distanceTo > radius) continue;
            if (distanceTo >= 0.001 && (dx * forward[0] + dz * forward[1]) / (distanceTo * length) < cosHalf - 1e-9) continue;
            if (!world.clear(from, point(other.point))) continue;
            count++;
        }
        return count;
    }

    function tearfullookWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        if (status(context, threat, "disheartened")) return false;
        if (ratio(self) > ai<number>(item, "hurtBelow", 1)) return false;
        if (item.data.config && item.data.config.sob)
            return tearfullookFoesInFront(context, self, threat, tearfullookRadius(context, item), tearfullookAngle(context, item)) >= ai<number>(item, "minFoes", 2);
        return world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("tearfullook", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || tearfullookWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !tearfullookWants(context, item, target)) return 0;
            const self = source(context);
            const hurt = 1 - ratio(self);
            // 生命降到 35% 及以下才是 2 级危机档，价值更高一档。
            const crisis = ratio(self) <= 0.35 ? 8 : 0;
            if (item.data.config && item.data.config.sob)
                return Math.min(95, 45 + hurt * 40 + crisis + tearfullookFoesInFront(context, self, target, tearfullookRadius(context, item), tearfullookAngle(context, item)) * 5);
            return Math.min(90, 42 + hurt * 45 + crisis);
        }
    });
}
