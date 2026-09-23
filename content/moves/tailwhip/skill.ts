/**
 * 摇尾巴 / Tail Whip — 执行组织。
 *
 * 核心念头：转过身，把尾巴左右甩开一圈——看得见这条尾巴的对手跟着晃神，架势散掉、防御下降。它是绕身
 *   一整圈，所以被围住时连身后的敌人也会被甩到；与「瞪眼」身前的一张扇面互补，一个补正面、一个补四周。
 *
 * 两幕：
 *   起（windup 播「转身」，提交前只观察与预告，可被打断，打断不花代价）。
 *   甩（提交后）：以自身为圆心张开 sweepRadius 的一圈，凡圈内看得见这条尾巴的非友方逐个挂共享的
 *     world_combat:tailwhip_wobble（身份 world_combat:status/guardbroken）并下降防御。
 * 视线：尾巴要被看见；被掩体挡住的敌人甩不到。
 * 反制：躲到掩体后、或退到圈外；它不造成伤害，也拦不住远程。
 */
namespace PokemonSkills {
    function tailwhipAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: tailwhipId,
        cooldownParameter: "recharge",
        name: "摇尾巴",
        description: "转过身，把尾巴绕身左右甩开一圈，让看得见这条尾巴的对手晃神、降低防御。它是绕身一整圈，被围住时连身后的敌人也会被甩到；尾巴要被看见，掩体后甩不到。",
        uses: ["被围住时一圈敌人一起破防", "为队友的物攻打开缺口", "把贴身绕后的敌人也一起削到"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 100,
        style: "wag",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tailwhipId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(tailwhipId, "tempo", context)),
                recover: p(tailwhipId, "recover", context),
                cooldown: Math.round(p(tailwhipId, "recharge", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("tailwhip-windup", tailwhipScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        indicator: function () {
            return { radius: 3, geometry: "circle", style: "wag", color: 0xE0A060, label: "摇尾巴" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(1.8, Math.min(4.2, p(tailwhipId, "sweepRadius", action)));
            const drop = Math.max(1, Math.min(2, Math.round(p(tailwhipId, "drop", action))));
            const daze = Math.max(60, Math.round(p(tailwhipId, "dazeTicks", action)));
            const arcs = Math.max(14, Math.round(p(tailwhipId, "arcs", action)));
            sound(action, "minecraft:entity.cat.purreow");
            let hits = 0;
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius, { below: 1, above: 3 }), function (actor, facts) {
                // 尾巴要被看见：通视才算晃到。
                if (facts.friendly() || !world.clear(origin, facts.position())) return;
                MobEffects.apply(world, actor, tailwhipEffect, daze, 0);
                NativeEffects.boost(world, actor, "def", -drop);
                hits++;
                WorldFeedback.emit(world, tailwhipScene, 1, facts.position(),
                    { moment: "wobble", target: String(actor.ref()), drop: drop, arcs: arcs }, 26);
            });
            WorldFeedback.emit(world, tailwhipScene, 1, origin,
                { moment: "sweep", radius: radius, hits: hits, arcs: arcs, scale: radius / 3 }, 32);
            if (hits === 0)
                WorldFeedback.emit(world, tailwhipScene, 1, origin, { moment: "fizzle", scale: radius / 3 }, 16);
            WorldFeedback.text(world, tailwhipAbove(origin),
                hits > 0 ? "world_combat.move.tailwhip.text.sweep" : "world_combat.move.tailwhip.text.empty",
                hits > 0 ? [hits, drop] : [], 30);
            done(action);
        }
    });

    // 晃神存续期间，被尾巴甩到的人头顶持续卷起打转的弧光。
    WorldCombat.on("world_combat:move_tailwhip/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tailwhipEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "tailwhip:" + String(actor.ref()), tailwhipScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
