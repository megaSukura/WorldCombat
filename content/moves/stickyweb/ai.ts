/**
 * 黏黏网 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、敌对、存活、在 `ai.maxChase`（默认 11）以内、且**身上还没有被网黏住**的威胁时织网
 *   （已经黏住的目标再织一张不会更慢，先不浪费）。`ai.lead` 给移动中的目标一点提前量，把网撒在它要经过的位置；
 *   窄路／门口加分，空地上铺网价值低；落点吸不到合法地面时直接跳过，避免把网浪费在不可达地形上。
 * 对谁出手：当前威胁；它的位置（或提前量）就是落点。
 * 够不到怎么办：交给共享接近逻辑；`kind` 为 point，AI 会把网撒向目标所在位置。
 * 放完之后：网留在原地，只有踩到线带的贴地目标才会被黏；伙伴交回共享交战顺序。
 * 配置 anchored（深锚／广铺）改变减速级数与覆盖；ai.maxChase、ai.lead 决定追多远、留多少提前量。
 */
namespace PokemonSkills {
    function stickywebWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "stickyweb")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    /** 落点要有合法地表支撑，否则网会散掉：水、岩浆、基岩、屏障与空中都算无效。 */
    function stickywebGround(world: CombatWorld, aim: number[]): boolean {
        const point = WorldCombat.point(aim[0], aim[1], aim[2]);
        const ground = WorldGeometry.ground(world, point, 6);
        const below = world.block(WorldCombat.point(ground.x(), ground.y() - 1, ground.z()));
        if (below === null) return false;
        const id = String(below.id());
        return id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air"
            && id !== "minecraft:water" && id !== "minecraft:lava" && id !== "minecraft:bedrock" && id !== "minecraft:barrier";
    }

    function stickywebBlocked(world: CombatWorld, from: CombatPoint, to: CombatPoint): boolean {
        const hit = world.clipBlocks(from, to);
        return !!hit && hit.blocked();
    }

    /** 窄路／门口：两侧近处是墙、正前方还通，网铺在这里能逼对手踩线或绕行。 */
    function stickywebCorridor(world: CombatWorld, aim: number[]): boolean {
        const here = WorldCombat.point(aim[0], aim[1] + 1.0, aim[2]);
        const east = WorldCombat.point(1, 0, 0), north = WorldCombat.point(0, 0, 1);
        return (stickywebBlocked(world, here, here.plus(east.scale(1.4))) && stickywebBlocked(world, here, here.minus(east.scale(1.4))))
            || (stickywebBlocked(world, here, here.plus(north.scale(1.4))) && stickywebBlocked(world, here, here.minus(north.scale(1.4))));
    }

    CompanionBehavior.registerUse(stickywebId, {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stickywebWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "stickyweb");
        },
        target: function (context, capability, selected) {
            const lead = CompanionBehavior.ai<number>(capability, "lead", 6), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + Number(velocity[0] || 0) * lead, selected.point[1], selected.point[2] + Number(velocity[2] || 0) * lead];
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !stickywebWants(context, capability, target)) return 0;
            const world = CompanionBehavior.world(context), lead = CompanionBehavior.ai<number>(capability, "lead", 6), velocity = target.velocity;
            const aim = lead > 0 && velocity
                ? [target.point[0] + Number(velocity[0] || 0) * lead, target.point[1], target.point[2] + Number(velocity[2] || 0) * lead]
                : target.point;
            if (!stickywebGround(world, aim)) return 0;
            let base = 22;
            const speed = velocity ? Math.sqrt(Number(velocity[0] || 0) * Number(velocity[0] || 0) + Number(velocity[2] || 0) * Number(velocity[2] || 0)) : 0;
            if (speed > 0.08) base += 10;
            if (stickywebCorridor(world, aim)) base += 12;
            return base;
        }
    });

    const stickywebAiChase = number("ai.maxChase", "考虑距离", 2, 20, 1);
    stickywebAiChase.help = "威胁离自己这么远以内才考虑织网；调小只在近处织，调大愿意先把网撒在远处的路上。";
    const stickywebAiLead = number("ai.lead", "提前量", 0, 20, 1);
    stickywebAiLead.help = "对移动中的目标提前这么多刻落点；0 表示直接撒在目标当前位置，调大更适合拦冲过来的对手。";

    addPreferences(stickywebId, { ai: { maxChase: 11, lead: 6 } }, [stickywebAiChase, stickywebAiLead]);
}
