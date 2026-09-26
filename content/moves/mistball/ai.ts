/**
 * 薄雾球 / mistball 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，在 `ai.maxChase`（默认 11）格内。它必须有一条真实的抛路：
 *   先看直线是否通视；不通时沿 `ballistic` 的弧线逐步用 `world.clipBlocks` 采样——能真正越过矮掩体
 *   才算可用，厚墙挡住的抛路不当作“高弧能穿”。因此它优先选择能压低障碍的抛法，而不是把高弧当穿墙。
 * 对谁出手：当前威胁；正在攻击自己或主人的目标优先。身上已有羽绒减速的目标控收益降低（不再完全拒用），
 *   剩余主伤仍有价值；目标残血时当斩杀手段再抬一档。
 * 够不到怎么办：`reach` 就是射程，共享任务先把身位收进射程；它是一条慢弧线，所以要留出提前量。
 * 放完之后：目标掉一段血、多半被糊住减速，伙伴交回共享顺序。
 */
namespace PokemonSkills {
    function mistballWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    /** 沿真实抛弧步进，返回能否落到目标；直线通视优先，否则要弧线不被厚墙挡住。 */
    function mistballPath(context: WorldBehavior.Context, target: CompanionBehavior.Entity, world: CombatWorld, origin: CombatPoint, point: CombatPoint): "direct" | "arc" | "none" {
        if (world.clear(origin, point)) return "direct";
        const speed = Math.max(0.35, p(mistballId, "lob", world));
        const gravity = Math.max(0.01, p(mistballId, "fall", world));
        const start = LivingActions.ballistic(origin, point, speed, gravity);
        if (start === null) return "none";
        let pos = origin, velocity = start.scale(speed);
        for (let tick = 0; tick < 100; tick++) {
            const next = pos.plus(velocity);
            const clip = world.clipBlocks(pos, next);
            if (clip && clip.blocked()) return next.minus(point).length() <= 1.3 ? "arc" : "none";
            pos = next;
            if (pos.minus(point).length() <= 0.9) return "arc";
            velocity = WorldCombat.point(velocity.x() * 0.99, velocity.y() * 0.99 - gravity, velocity.z() * 0.99);
        }
        return "none";
    }

    /** 本个体当前有一条到达该目标的真实抛路时的分类；拿不到现场事实时按直线处理。 */
    function mistballReach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): "direct" | "arc" | "none" {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const actor = world.actor(self.ref);
        if (actor === null) return "direct";
        const body = world.observe(actor);
        if (body === null) return "direct";
        return mistballPath(context, target, world, body.position(), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(mistballId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!mistballWants(context, capability, target)) return false;
            return mistballReach(context, target) !== "none";
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !mistballWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context), owner = context.facts.owner;
            let base = 24;
            if (target.attacking && (target.attacking === self.ref || !!owner && target.attacking === owner.ref)) base += 10;
            if (CompanionBehavior.status(context, target, "downcast")) base -= 8;
            const path = mistballReach(context, target);
            if (path === "direct") base += 2;
            else if (path === "arc") base += 6;
            else base -= 12;
            if (CompanionBehavior.ratio(target) < 0.35) base += 6;
            return base;
        }
    });

    addPreferences(mistballId, { ai: { maxChase: 11 } }, [
        number("ai.maxChase", "考虑距离", 3, 18, 1)
    ]);
}
