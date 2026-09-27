/**
 * 毒液冲击 / venoshock 的 AI 用途。
 *
 * 什么局面下出手：远程消耗手段，对手可见、敌对、活着且在 `ai.maxChase` 之内，并且有一条真实可达的抛路。
 *   它是一颗带重力的毒团：直线通视时按直线命中，被矮掩体挡住时沿 `ballistic` 的真实弧线逐步采样，
 *   能越过才算可用，厚墙挡死的抛路不当作“高弧能穿”。
 * 对已经中毒的目标 priority 抬到 55（那一下翻倍、还把毒升格为剧毒），否则 14——
 *   它会先让别的招或自己把毒点上，再用毒液冲击收。
 */
namespace PokemonSkills {
    function venoshockWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 沿真实抛弧步进，返回能否落到目标；直线通视优先，否则要弧线不被厚墙挡住。 */
    function venoshockPath(context: WorldBehavior.Context, target: CompanionBehavior.Entity, world: CombatWorld, origin: CombatPoint, point: CombatPoint): "direct" | "arc" | "none" {
        if (world.clear(origin, point)) return "direct";
        const speed = Math.max(0.4, p("venoshock", "globSpeed", world));
        const gravity = Math.max(0.01, p("venoshock", "arcGravity", world));
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
    function venoshockReach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): "direct" | "arc" | "none" {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const actor = world.actor(self.ref);
        if (actor === null) return "direct";
        const body = world.observe(actor);
        if (body === null) return "direct";
        return venoshockPath(context, target, world, body.position(), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse("venoshock", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!venoshockWants(context, capability, target)) return false;
            return venoshockReach(context, target) !== "none";
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !venoshockWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const path = venoshockReach(context, target);
            if (path === "none") return 0;
            let score = CompanionBehavior.status(context, target, "poison") ? 55 : 14;
            if (path === "direct") score += 2;
            else if (path === "arc") score += 5;
            return score;
        }
    });

    addPreferences("venoshock", {}, [
        field(pathOf("corrode"), "侵蚀取向", "boolean", {
            help: "开启：即时威力 ×0.85，但升格后的剧毒持续 ×1.6，收招与冷却各多 2／4 刻。关闭：更重的一泼，毒性按基准持续。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 24, step: 1,
            help: "超过这个距离就不主动泼毒，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时泼毒。"
        })
    ]);
}
