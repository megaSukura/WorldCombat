/** 日光束：聚光后朝瞄准方向放出一束贯穿直线；真实方块截断光柱，身体判定与光芯使用同一三维线段及宽度。 */
namespace PokemonSkills {
    const solarbeamScene = "world_combat:move_solarbeam";
    const solarbeamAxisScene = "world_combat:move_solarbeam_axis";
    const solarbeamSunText = "world_combat.move.solarbeam.text.sun";
    const solarbeamHitText = "world_combat.move.solarbeam.text.hit";
    const solarbeamPierceText = "world_combat.move.solarbeam.text.pierce";
    const solarbeamFizzleText = "world_combat.move.solarbeam.text.fizzle";

    define({
        id: "solarbeam",
        name: "日光束",
        description: "站定聚光，再朝瞄准方向放出贯穿的光柱，依次攻击走廊内的敌人；光柱被方块截断，只打到墙前。强日光下直接发射；阴雨天威力降低、聚光更慢。",
        uses: ["在开阔地上贯穿一条线", "晴天里的无预警重击"],
        kind: "aim",
        range: 12,
        maxRange: 20,
        prepare: 24,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "solar",
        stationary: true,
        defaults: { broad: false, ai: { maxChase: 18, minRange: 3, lineUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("solarbeam", "reach", pokemon), geometry: "line", style: "solar", color: 0xFFE9A0,
                label: config && config.broad ? "散光日光束" : "聚焦日光束" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["solarbeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const broad = !!(config && config.broad);
            return {
                prepare: Math.round(p("solarbeam", "charge", context)),
                recover: Math.round(p("solarbeam", "recover", context)) + (broad ? 2 : 0),
                cooldown: Math.round(p("solarbeam", "cooldown", context)) + (broad ? 3 : 0),
                active: skills["solarbeam"].active,
                range: p("solarbeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const light = Math.max(6, Math.round(p("solarbeam", "light", action)));
            const instant = p("solarbeam", "charge", action) <= 0 ? 1 : 0;
            action.present("solarbeam:gather", solarbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, light: light, sun: instant, target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            // 真实三维瞄准：保留俯仰，向上/向下指向的真实方向就是光轴；光带外壳由自定义场景按同一轴铺开。
            const direction = WorldGeometry.basis(aim(action), action.direction()).forward;
            action.releaseTarget();
            const wanted = Math.max(3, action.range());
            const half = Math.max(0.2, p("solarbeam", "width", action));
            const power = p("solarbeam", "ray", action);
            const pierce = Math.max(1, Math.round(p("solarbeam", "pierce", action)));
            const push = p("solarbeam", "push", action);
            const light = Math.max(6, Math.round(p("solarbeam", "light", action)));
            const scale = Math.max(0.6, Math.min(2.2, half / 0.62));
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            // 光柱先由真实方块截断，同一线段驱动身体接触与光带。
            const block = world.clipBlocks(origin, origin.plus(direction.scale(wanted)));
            const reach = block === null ? 0 : block.blocked() ? block.position().minus(origin).length() : wanted;
            const tip = origin.plus(direction.scale(reach));
            const path = [[origin.x(), origin.y(), origin.z()], [tip.x(), tip.y(), tip.z()]];
            let hits = 0;

            sound(action, "minecraft:entity.warden.sonic_boom");
            // 光柱主体是自定义场景：按真实三维端点画同轴稳定光柱与外壳，竖直瞄准时也成立。
            WorldFeedback.emit(world, solarbeamAxisScene, 1, origin,
                { moment: "beam", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    width: half, light: light, scale: scale, intensity: intensity, pierce: pierce, reach: reach }, 26);
            WorldFeedback.emit(world, solarbeamScene, 1, origin,
                { moment: "beam", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    light: light, scale: scale, intensity: intensity, pierce: pierce, reach: reach }, 26);

            const region = WorldGeometry.bodySegment(origin, tip, half);
            const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
            if (reach > .001) WorldGeometry.selectBodies(world, region, function (enemy, facts) {
                if (world.friendly(enemy) || String(enemy.ref()) === String(action.actor().ref())) return;
                const point = world.closestPoint(enemy, origin);
                if (point === null || !world.clear(origin, point)) return;
                candidates.push({ actor: enemy, at: point });
            });
            candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
            for (let index = 0; index < candidates.length && hits < pierce; index++) {
                const candidate = candidates[index];
                if (!hurt(action, candidate.actor, "solarbeam", power, { damage: damageSpec("solarbeam", "ray") })) continue;
                hits++;
                if (world.valid(candidate.actor)) world.hitDisplace(candidate.actor, direction.scale(push));
                WorldFeedback.emit(world, solarbeamScene, 1, candidate.at,
                    { moment: "pierce", target: String(candidate.actor.ref()), light: light, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.6, power / 120)) }, 24);
            }

            if (block !== null && block.blocked()) {
                const stop = block.position();
                WorldFeedback.emit(world, solarbeamScene, 1, stop,
                    { moment: "wall", point: [stop.x(), stop.y(), stop.z()], face: block.blockFace(), light: light, scale: scale, intensity: intensity }, 24);
            }
            if (hits > 0) {
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), hits > 1 ? solarbeamPierceText : solarbeamHitText, hits > 1 ? [hits] : [], 28);
                sound(action, "minecraft:block.beacon.activate");
            } else {
                WorldFeedback.emit(world, solarbeamScene, 1, tip, { moment: "fizzle", point: [tip.x(), tip.y(), tip.z()], scale: scale, light: light }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), solarbeamFizzleText, [], 24);
            }
            if (p("solarbeam", "charge", action) <= 0) {
                const body = world.observe(action.actor());
                if (body !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), solarbeamSunText, [], 26);
            }
            done(action);
        }
    });
}
