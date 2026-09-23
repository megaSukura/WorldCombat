/**
 * 怪异电波 / eerieimpulse — 执行组织。
 *
 * 核心念头：从身体放射出一片看不见的怪异电波，以自己为圆心贴地铺开一圈。圈里的敌人都被迫「沐浴」其中，
 *   特攻被扰乱。它不对准谁、也不需要看见谁，只要对方近身；代价是电波从身体放射、射程短，放电时还得站定。
 *   它是本组唯一绕身一圈、唯一作用于特攻、唯一能一次罩住多人的一招。
 *
 * 出手：短起手（windup 在身上攒起电弧）后提交；一圈电波从身上放开。
 * 命中：世界几何用 WorldGeometry.ring 选出圈内所有非友方；每个目标挂共享身份 world_combat:status/jammed
 *       （本单元效果 world_combat:eerie_impulse_jammed，只借身份），再 NativeEffects.boost 下降特攻：
 *       宝可梦损失原生特攻等级，其他生物落到攻击属性。
 * 反制：站到电波半径之外就沐浴不到；它不造成伤害，也不会把人推开——冲进去的人只要还在圈里就会被扰乱。
 */
namespace PokemonSkills {
    function eerieimpulseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: eerieimpulseId,
        cooldownParameter: "wait",
        name: "怪异电波",
        description: "从身体放射出看不见的怪异电波，以自己为圆心铺开一圈；圈里的敌人特攻等级立即下降，而且不会自行恢复。它不对准谁、也不需要看见谁，只要近身；过载能把圈铺得更开、电弧更密，但起手与冷却都更长。",
        uses: ["被近身时一次扰乱身周所有的法系输出", "在混战里不用瞄准就削掉一圈人的特攻", "配合队友抢先手，让贴上来的人打不出特攻"],
        kind: "self",
        range: 4,
        maxRange: 7,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 120,
        style: "eerie",
        defaults: { overload: false },
        fields: [
            flag("overload", "过载")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[eerieimpulseId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(eerieimpulseId, "tempo", context)),
                recover: p(eerieimpulseId, "recover", context),
                cooldown: Math.round(p(eerieimpulseId, "wait", context)),
                active: 1,
                range: p(eerieimpulseId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("eerieimpulse-windup", eerieimpulseScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", overload: config && config.overload ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: config && config.overload ? 7 : 4, geometry: "area", style: "eerie", color: 0xA8D84A,
                label: config && config.overload ? "怪异电波·过载" : "怪异电波" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const radius = Math.max(3.0, Math.min(7.5, p(eerieimpulseId, "reach", action)));
            const drop = Math.max(1, Math.min(3, Math.round(p(eerieimpulseId, "drop", action))));
            const jam = Math.max(60, Math.round(p(eerieimpulseId, "jam", action)));
            const arcs = Math.max(8, Math.round(p(eerieimpulseId, "arcs", action)));
            const overload = !!(config && config.overload);
            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 3 }),
                function (target, facts) {
                    NativeEffects.boost(world, target, "spa", -drop);
                    MobEffects.apply(world, target, eerieimpulseEffect, jam, 0);
                    hits++;
                    WorldFeedback.emit(world, eerieimpulseScene, 1, facts.position(),
                        { moment: "jam", target: String(target.ref()), drop: drop, arcs: Math.round(6 + arcs * 0.4) }, 24);
                });
            WorldFeedback.emit(world, eerieimpulseScene, 1, centre,
                { moment: "pulse", radius: radius, arcs: arcs, drop: drop, hits: hits, overload: overload ? 1 : 0,
                    scale: radius / 4 }, 28);
            sound(action, "minecraft:block.conduit.ambient");
            if (hits > 0)
                WorldFeedback.text(world, eerieimpulseAbove(centre), "world_combat.move.eerieimpulse.text.jam", [hits, drop], 34);
            else
                WorldFeedback.text(world, eerieimpulseAbove(centre), "world_combat.move.eerieimpulse.text.miss", [], 26);
            done(action);
        }
    });

    // 电波未散期间，被扰乱者身上持续冒出零星的干扰电弧。
    WorldCombat.on("world_combat:move_eerieimpulse/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== eerieimpulseEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "eerieimpulse:" + String(actor.ref()), eerieimpulseScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
