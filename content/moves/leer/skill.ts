/**
 * 瞪眼 / Leer — 执行组织。
 *
 * 核心念头：眯起眼，把一道犀利的目光沿身前扫成一个扇面——被扫到的人缩紧架势，防御下降。目光要有形、
 *   要被看见：扇面里的人必须和施法者通视，掩体挡下就扫不到。横扫铺得开、只降 1 级；瞪住收成一道、降 2 级。
 *
 * 两幕：
 *   起（windup 播「眯眼」，提交前只观察与预告，可被打断，打断不花代价）。
 *   扫（提交后）：以施法者为顶点、朝瞄准方向张开 sweepAngle 度、推出 sweepRange 格；
 *     WorldGeometry.sector 选出锥内所有非友方，逐个挂共享的 world_combat:leer_spook（身份
 *     world_combat:status/guardbroken）并下降防御。表现用的扇面顶点与判定读同一份形状。
 * 反制：躲到掩体后（挡住视线就扫不到）、或绕过扇面走到身侧与身后。
 */
namespace PokemonSkills {
    function leerAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 以施法者为顶点、朝方向张开 arc 度的扇面地面顶点；判定（sector）与表现（path polygon）读同一份形状。 */
    function leerFan(origin: CombatPoint, heading: CombatPoint, reach: number, arc: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (arc * Math.PI / 180) / 2, steps = 10;
        const vertices: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * reach, origin.y(), origin.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    function leerHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: leerId,
        cooldownParameter: "recharge",
        name: "瞪眼",
        description: "眯起眼，把一道犀利的目光沿身前扫成一个扇面，让扫到的对手缩紧架势、降低防御；目光要被看见，掩体挡下就扫不到。横扫铺得开，瞪住收成一道、降得更深。",
        uses: ["在敌人排成一排冲上来时一次压住正面", "为队友的物攻打开缺口", "在开阔地削弱身前一片对手的防御"],
        kind: "enemy",
        range: 5,
        maxRange: 8,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 95,
        style: "glare",
        defaults: { focus: false },
        fields: [
            flag("focus", "瞪住")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[leerId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(leerId, "tempo", context)),
                recover: p(leerId, "recover", context),
                cooldown: Math.round(p(leerId, "recharge", context)),
                active: 1,
                range: p(leerId, "sweepRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("leer-windup", leerScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const focus = !!(config && config.focus);
            return { radius: focus ? 4 : 5, geometry: "area", style: "glare", color: 0x7FA6C4,
                label: focus ? "瞪眼·瞪住" : "瞪眼·横扫" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const origin = action.origin();
            const heading = leerHeading(aim(action));
            const reach = Math.max(3, Math.min(8, p(leerId, "sweepRange", action)));
            const angle = Math.max(45, Math.min(160, Math.round(p(leerId, "sweepAngle", action))));
            const drop = Math.max(1, Math.min(2, Math.round(p(leerId, "drop", action))));
            const scowl = Math.max(60, Math.round(p(leerId, "scowlTicks", action)));
            const glares = Math.max(14, Math.round(p(leerId, "glares", action)));
            const path = leerFan(origin, heading, reach, angle);
            const region = WorldGeometry.sector(origin, heading, reach, angle, { below: 1, above: 3 });
            sound(action, "minecraft:entity.vindicator.ambient");
            let hits = 0;
            WorldGeometry.select(world, region, function (actor, facts) {
                // 目光要被看见：通视才算扫到。
                if (facts.friendly() || !world.clear(origin, facts.position())) return;
                MobEffects.apply(world, actor, leerEffect, scowl, 0);
                NativeEffects.boost(world, actor, "def", -drop);
                hits++;
                WorldFeedback.emit(world, leerScene, 1, facts.position(),
                    { moment: "mark", target: String(actor.ref()), drop: drop, glares: glares }, 26);
            });
            WorldFeedback.emit(world, leerScene, 1, origin,
                { moment: "sweep", path: path, reach: reach, halfAngle: angle / 2, drop: drop, glares: glares, hits: hits,
                    direction: [heading.x(), heading.y(), heading.z()] }, 30);
            const body = world.observe(self);
            if (body !== null)
                WorldFeedback.text(world, leerAbove(body.position()),
                    hits > 0 ? "world_combat.move.leer.text.gaze" : "world_combat.move.leer.text.empty",
                    hits > 0 ? [hits, drop] : [], 30);
            done(action);
        }
    });

    // 破防存续期间，被扫到的人头顶持续浮起缩紧的尖光。
    WorldCombat.on("world_combat:move_leer/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== leerEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "leer:" + String(actor.ref()), leerScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
