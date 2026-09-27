/**
 * 撒菱 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 10）以内的威胁时布刺，且目标脚下是有望走过、
 *   踩得到的实体地面。封路优于蹲点：落点按本招真实的抛撒速度与距离估出弹体飞行时间，再叠加 `ai.lead`
 *   提前落点，把尖刺撒在移动中的威胁要经过的路线上，而不是等它站定时铺在脚下。
 * 对谁出手：当前威胁；落点用真实公式估算的飞行时间提前（`ai.lead` 只加额外刻数），悬空目标会被降权，
 *   已经满层的地点也会降权（再撒只续时、不再加伤）。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把碎片撒向提前量后的位置。
 * 放完之后：刺留在原地继续扎人，伙伴交回共享交战顺序；同一片地上再撒只并层/续时，所以它会持续复用这招。
 * 配置 dense（密布／撒布）改变覆盖与每层伤害；ai.maxChase、ai.lead、ai.cutoff 决定追多远、额外提前多少、是否专挑移动目标。
 */
namespace PokemonSkills {
    function spikesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    function spikesSpeed(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        if (!velocity) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    /** 本招当前实际的抛撒速度，按行动携带的偏好配置求值，和真正施放时一致。 */
    function spikesThrowSpeed(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(0.6, PokemonSkills.p(spikesId, "throwSpeed",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[spikesId], detail: { values: capability.data.config || {} } }));
        } catch (ignored) {
            return 1;
        }
    }

    /** 弹体从脱手到落地约需的刻数：真实距离 ÷ 本招当前抛撒速度。 */
    function spikesFlight(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        return Math.max(0, CompanionBehavior.distance(self.point, target.point) / spikesThrowSpeed(context, capability));
    }

    /** 计划落点：真实飞行时间 + `ai.lead` 额外提前量，沿目标当前速度前推。 */
    function spikesLeadPoint(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number[] {
        const velocity = target.velocity;
        const lead = spikesFlight(context, capability, target) + CompanionBehavior.ai<number>(capability, "lead", 0);
        if (lead <= 0 || !velocity) return target.point;
        return [target.point[0] + velocity[0] * lead, target.point[1], target.point[2] + velocity[2] * lead];
    }

    /** 本招当前实际覆盖半径，和施放时的 patchRadius 同源。 */
    function spikesRadius(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.5, PokemonSkills.p(spikesId, "patchRadius",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[spikesId], detail: { values: capability.data.config || {} } }));
        } catch (ignored) {
            return 2.4;
        }
    }

    /** 本招最多叠几层，和施放时读的 maxLayers 同源。 */
    function spikesMaxLayers(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1, Math.round(PokemonSkills.p(spikesId, "maxLayers",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[spikesId], detail: { values: capability.data.config || {} } })));
        } catch (ignored) {
            return 3;
        }
    }

    /** 计划落点上已有的自方尖刺层数（只读、决策内缓存），用于判断再撒是否还有加伤空间。 */
    CompanionBehavior.registerFact("world_combat:move_spikes/layers", function (access, _actor, argument) {
        const request = typeof argument === "string" ? JSON.parse(argument) : {};
        if (!request || !Array.isArray(request.point) || request.point.length !== 3) return 0;
        const point = WorldCombat.point(request.point[0], request.point[1], request.point[2]);
        const radius = typeof request.radius === "number" && isFinite(request.radius) ? request.radius : 2.4;
        const found = WorldEffects.areas(access, spikesRule, point, radius);
        let layers = 0;
        for (let i = 0; i < found.length; i++) layers = Math.max(layers, Number(found[i].data.layers) || 1);
        return layers;
    });

    function spikesExistingLayers(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const predicted = spikesLeadPoint(context, capability, target);
        const raw = CompanionBehavior.fact<number>(context, "world_combat:move_spikes/layers", target,
            JSON.stringify({ point: predicted, radius: spikesRadius(context, capability) }));
        return typeof raw === "number" && isFinite(raw) ? raw : 0;
    }

    CompanionBehavior.registerUse(spikesId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return spikesWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, selected) {
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = spikesLeadPoint(context, capability, selected);
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !spikesWants(context, capability, target)) return 0;
            let score = 24;
            const cutoff = CompanionBehavior.ai<number>(capability, "cutoff", 1) > 0;
            if (cutoff && spikesSpeed(target) > 0.02) score += 14;
            // 飞在半空的威胁根本踩不到刺：降权，别把刺浪费在它脚下的半空。
            if (target.grounded === false) score -= 18;
            // 已经满层的地点再撒只续时、不再加伤：降权，把机会留给还没铺满的地面。
            if (spikesExistingLayers(context, capability, target) >= spikesMaxLayers(context, capability)) score -= 10;
            return Math.max(0, score);
        }
    });

    const spikesAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    spikesAiChase.help = "威胁离自己这么远以内才考虑撒刺；调小只在近处撒，调大愿意先把刺撒在远处的路上。";
    const spikesAiLead = number("ai.lead", "额外提前量", 0, 20, 1);
    spikesAiLead.help = "在按本招抛撒速度估出的弹体飞行时间之外，再提前这么多刻落点；0 表示只按预计落地时间，调大更适合拦远处冲过来的对手（目标中途折返则容易撒空）。";
    const spikesAiCutoff = number("ai.cutoff", "优先封路", 0, 1, 1);
    spikesAiCutoff.help = "1 = 优先对正在移动的威胁封路（给更高优先级）；0 = 静止和移动的目标一视同仁，只当普通布防。";

    addPreferences(spikesId, { ai: { maxChase: 10, lead: 0, cutoff: 1 } }, [spikesAiChase, spikesAiLead, spikesAiCutoff]);
}
