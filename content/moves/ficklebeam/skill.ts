/**
 * 随机光 / ficklebeam 的出手方式。
 *
 * 核心念头：**一束忽明忽暗的多股光线**——平时只有一束随手打出；偶尔所有的头一起聚焦，同一束里每股都亮起来，
 * 这一发的威力翻倍。它没有代价，风险和回报都在那一次掷骰里。
 *
 * 两幕 + 收（提交前只播预告）：
 *   起（windup）：光在身前聚成几股、明灭不定，只播预告。
 *   射（beam → hit / fizzle）：提交后立刻掷一次齐射：光线沿准线射出，命中走廊里最近的一个非友方；
 *       齐射时同一束整体 ×2，浮字与画面都亮出所有股数。
 *   散（fizzle）：打空只在尽头散成几缕光。
 *
 * 与同族分开：铁蹄光线重而短、叶绿爆震覆盖面、破灭之光粗重贯穿，三者都有自损；随机光是唯一
 * **细长、无代价、把一切押在一次翻倍**上的那一束。
 */
namespace PokemonSkills {
    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这组顶点。 */
    function ficklebeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function ficklebeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: ficklebeamId,
        cooldownParameter: "recharge",
        name: "Fickle Beam",
        description: "The user shoots a beam of light to inflict damage. Sometimes all the user's heads shoot beams in unison, doubling the move's power.",
        uses: ["一束细长、无代价的远程龙光", "赌一次所有光股齐射、威力翻倍", "远距离稳定消耗对手"],
        kind: "enemy",
        range: 10,
        maxRange: 18,
        prepare: 10,
        active: 18,
        recover: 8,
        cooldown: 26,
        maximumTicks: 180,
        style: "beam",
        defaults: { unison: false, ai: { maxChase: 13 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(ficklebeamId, "reach", pokemon) : 10, geometry: "line", style: "beam",
                color: 0x9AD8FF, label: config && config.unison === true ? "齐心式随机光" : "随意式随机光" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[ficklebeamId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(ficklebeamId, "tempo", context)),
                recover: Math.round(p(ficklebeamId, "aftercast", context)),
                cooldown: Math.round(p(ficklebeamId, "recharge", context)),
                active: skills[ficklebeamId].active,
                range: p(ficklebeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_ficklebeam:gather", ficklebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", unison: config && config.unison === true ? 1 : 0,
                    heads: Math.round(p(ficklebeamId, "heads", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(1, p(ficklebeamId, "reach", action));
            const half = Math.max(0.05, p(ficklebeamId, "width", action));
            const power = p(ficklebeamId, "beam", action);
            const chance = Math.max(0, Math.min(1, p(ficklebeamId, "chance", action)));
            const heads = Math.max(1, Math.round(p(ficklebeamId, "heads", action)));
            const motes = Math.max(1, Math.round(p(ficklebeamId, "motes", action)));
            const unison = world.random() < chance;
            const strands = unison ? heads : 1;
            const damage = power * (unison ? 2 : 1);
            const scale = half / 0.42;
            const intensity = Math.max(0.6, Math.min(2.8, damage / 80));
            const vertices = ficklebeamLane(origin, direction, reach, half);
            const tip = origin.plus(direction.scale(reach));
            let hits = 0;

            sound(action, "cobblemon:move.aurorabeam.actor_1");
            WorldFeedback.emit(world, ficklebeamScene, 1, origin,
                { moment: "beam", path: ficklebeamPath(vertices), direction: [direction.x(), direction.y(), direction.z()],
                    unison: unison ? 1 : 0, heads: heads, strands: strands, motes: motes, scale: scale,
                    intensity: intensity, notes: Math.round(30 + damage * 0.6) }, 24);

            if (half > 0.01) {
                const region = WorldGeometry.polygon(vertices, { below: 2, above: 3 });
                const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
                WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                    if (!world.clear(origin, facts.position())) return;
                    candidates.push({ actor: enemy, at: facts.position() });
                });
                candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
                if (candidates.length > 0) {
                    const first = candidates[0];
                    if (hurt(action, first.actor, ficklebeamId, damage, { damage: damageSpec(ficklebeamId, "beam") })) {
                        hits++;
                        WorldFeedback.emit(world, ficklebeamScene, 1, first.at,
                            { moment: unison ? "unison" : "hit", target: String(first.actor.ref()), heads: heads,
                                strands: strands, unison: unison ? 1 : 0, motes: motes, scale: scale, intensity: intensity }, 26);
                        sound(action, "cobblemon:impact.dragon");
                        WorldFeedback.text(world, first.at.plus(WorldCombat.point(0, 1.2, 0)),
                            unison ? ficklebeamUnisonText : ficklebeamHitText, unison ? [heads] : [Math.round(damage)], 26);
                    }
                }
            }

            if (hits === 0) {
                WorldFeedback.emit(world, ficklebeamScene, 1, tip, { moment: "fizzle", motes: motes, scale: scale }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), ficklebeamMissText, [], 22);
            }
            done(action);
        }
    });
}
