/** 日光束：蓄力后贯穿直线上的敌人；阳光影响蓄力和威力，光束与命中碎光承载反馈。 */
namespace PokemonSkills {
    const solarbeamScene = "world_combat:move_solarbeam";
    const solarbeamSunText = "world_combat.move.solarbeam.text.sun";
    const solarbeamHitText = "world_combat.move.solarbeam.text.hit";
    const solarbeamPierceText = "world_combat.move.solarbeam.text.pierce";
    const solarbeamFizzleText = "world_combat.move.solarbeam.text.fizzle";

    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这一组顶点。 */
    function solarbeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }

    function solarbeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "solarbeam",
        name: "日光束",
        description: "站定聚光，再沿直线放出贯穿的光柱，依次攻击走廊内的敌人。强日光下直接发射；阴雨天威力降低、聚光更慢。",
        uses: ["在开阔地上贯穿一条线", "晴天里的无预警重击"],
        kind: "enemy",
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
            const direction = aim(action);
            const reach = Math.max(3, action.range());
            const half = Math.max(0.2, p("solarbeam", "width", action));
            const power = p("solarbeam", "ray", action);
            const pierce = Math.max(1, Math.round(p("solarbeam", "pierce", action)));
            const push = p("solarbeam", "push", action);
            const light = Math.max(6, Math.round(p("solarbeam", "light", action)));
            const scale = Math.max(0.6, Math.min(2.2, half / 0.62));
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            const vertices = solarbeamLane(origin, direction, reach, half);
            const path = solarbeamPath(vertices);
            let hits = 0;

            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.emit(world, solarbeamScene, 1, origin.plus(WorldCombat.point(0, 0.6, 0)),
                { moment: "beam", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    light: light, scale: scale, intensity: intensity, pierce: pierce, reach: reach }, 26);

            const region = WorldGeometry.polygon(vertices, { below: 2, above: 3 });
            const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (!world.clear(origin, facts.position())) return;
                candidates.push({ actor: enemy, at: facts.position() });
            });
            candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
            for (let index = 0; index < candidates.length && hits < pierce; index++) {
                const candidate = candidates[index];
                if (!hurt(action, candidate.actor, "solarbeam", power, { damage: damageSpec("solarbeam", "ray") })) continue;
                hits++;
                if (world.valid(candidate.actor)) world.displace(candidate.actor, direction.scale(push));
                WorldFeedback.emit(world, solarbeamScene, 1, candidate.at,
                    { moment: "pierce", target: String(candidate.actor.ref()), light: light, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.6, power / 120)) }, 24);
            }

            const tip = origin.plus(direction.scale(reach));
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
