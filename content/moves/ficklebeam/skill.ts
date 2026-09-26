/**
 * 随机光 / ficklebeam 的出手方式。
 *
 * 核心念头：**一束忽明忽暗的多股光线**——平时只有一束随手打出；偶尔所有的头一起聚焦，这一发同时醒来 `heads` 股，
 * 每股各走一条近似平行的窄线、覆盖更宽的一条线面。它没有代价，风险和回报都在那一次掷骰里。
 *
 * 两幕 + 收（提交前只播预告）：
 *   起（windup）：光在身前聚成几股、明灭不定；**掷骰在准备期一次决定并存储**——醒来的股数当场可见，
 *       同一发不再重抽。
 *   射（beam → hit / unison / fizzle / wall）：提交后每股各做一次真实 `trace`：单股是一条窄线只咬首个目标；
 *       齐心是数股近线并行、覆盖更宽，每股都在自己的线上取首个接触——**方块逐股截断**。同一目标本次合计伤害
 *       封顶 `2 × beam`，不按股无限乘。齐射那一发的命中处才亮起 unison 的爆光。
 *   散：打空在尽头散成几缕光，撞墙在该股的真实方块格收束。
 *
 * 与同族分开：铁蹄光线重而短、叶绿爆震覆盖面、破灭之光粗重贯穿，三者都有自损；随机光是唯一
 * **细长、无代价、把一切押在一次翻倍**上的那一束。
 *
 * 选取 `kind: "aim"`：可朝任意方向或世界点射出，也能空放；命中权限仍由命中层按敌我结算。
 */
namespace PokemonSkills {
    const ficklebeamRollKey = "world_combat:move_ficklebeam/roll";

    /** 一段走廊四角；每股的判定与表现共用这组顶点。 */
    function ficklebeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(direction.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function ficklebeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: ficklebeamId,
        cooldownParameter: "recharge",
        name: "Fickle Beam",
        description: "一束细长、不带自损的龙光：平时只有一股、命中走廊里最近的敌人；每次射出有几率所有光股一起醒来并肩齐射，数股近线并行覆盖更宽的一条线面，同一目标本次合计伤害封顶为原来的两倍。也能朝任意方向或世界点空放。",
        uses: ["一束细长、不带自损的远程龙光", "赌一次所有光股齐射、数股并行覆盖更宽", "远距离稳定消耗对手"],
        kind: "aim",
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
            const heads = Math.max(1, Math.round(p(ficklebeamId, "heads", action)));
            const chance = Math.max(0, Math.min(1, p(ficklebeamId, "chance", action)));
            // 准备期一次决定单股或齐心并存储：醒来的股数当场可见，同一发不再重抽。
            const stored = action.data(ficklebeamRollKey);
            let unison = false;
            if (stored !== null) unison = JSON.parse(stored).unison === true;
            else { unison = action.sense().random() < chance; action.data(ficklebeamRollKey, JSON.stringify({ unison: unison, heads: heads })); }
            const strands = unison ? heads : 1;
            action.present("world_combat:move_ficklebeam:gather", ficklebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", unison: unison ? 1 : 0, heads: heads, strands: strands,
                    wake: unison ? heads : 0,
                    chance: Math.round(chance * 100) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(1, p(ficklebeamId, "reach", action));
            const half = Math.max(0.05, p(ficklebeamId, "width", action));
            const power = p(ficklebeamId, "beam", action);
            const heads = Math.max(1, Math.round(p(ficklebeamId, "heads", action)));
            const motes = Math.max(1, Math.round(p(ficklebeamId, "motes", action)));
            const stored = action.data(ficklebeamRollKey);
            const unison = stored !== null ? JSON.parse(stored).unison === true : world.random() < Math.max(0, Math.min(1, p(ficklebeamId, "chance", action)));
            const strands = unison ? Math.max(1, Math.round(p(ficklebeamId, "heads", action))) : 1;
            const scale = half / 0.42;
            const intensity = Math.max(0.6, Math.min(2.8, (power * (unison ? 2 : 1)) / 80));
            const body = world.observe(actor);
            const muzzle = Math.max(half + 0.4, body !== null ? body.width() * 0.5 + 0.3 : 0.7);
            const flat = WorldCombat.point(direction.x(), 0, direction.z());
            const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const spacing = half * 1.4;
            const bundleHalf = spacing * (strands - 1) / 2;
            const totalNotes = Math.round(30 + power * (unison ? 1.4 : 0.6));
            const perStrandNotes = Math.max(10, Math.round(totalNotes / strands));
            const cap = power * 2;
            const dealt: { [ref: string]: number } = {};
            let hits = 0, walled = 0;

            sound(action, "cobblemon:move.aurorabeam.actor_1");

            for (let index = 0; index < strands; index++) {
                const offset = strands === 1 ? 0 : -bundleHalf + (2 * bundleHalf) * (index / (strands - 1));
                const base = origin.plus(side.scale(offset));
                const from = base.plus(direction.scale(muzzle));
                const to = base.plus(direction.scale(reach));
                // 每股各自真实截断：首个活体或挡墙处收束，判定与画面读同一个落点。
                const contact = action.trace(from, to, half, true);
                const end = contact.position();
                const victim = contact.hitEntity() ? contact.target() : null;
                const blocked = contact.blocked();
                if (blocked) walled++;
                const delta = end.minus(base), span = delta.length();
                const lane = ficklebeamLane(base, span > 0.01 ? delta.unit() : direction, Math.max(0.2, span), half);
                WorldFeedback.emit(world, ficklebeamScene, 1, base,
                    { moment: "beam", path: ficklebeamPath(lane), direction: [direction.x(), direction.y(), direction.z()],
                        unison: unison ? 1 : 0, heads: heads, strands: strands, strand: index + 1, motes: motes,
                        notes: perStrandNotes, glow: Math.max(16, Math.round(perStrandNotes * 0.6)),
                        edge: Math.max(6, Math.round(perStrandNotes * 0.4)), blocked: blocked ? 1 : 0,
                        scale: scale, intensity: intensity }, 24,
                    "strand" + index);

                if (victim !== null && world.valid(victim) && !world.friendly(victim)) {
                    const ref = String(victim.ref());
                    const remaining = cap - (dealt[ref] || 0);
                    if (remaining > 0.05) {
                        const applied = Math.min(power, remaining);
                        if (hurt(action, victim, ficklebeamId, applied, { damage: damageSpec(ficklebeamId, "beam") })) {
                            dealt[ref] = (dealt[ref] || 0) + applied;
                            hits++;
                            WorldFeedback.emit(world, ficklebeamScene, 1, end,
                                { moment: unison ? "unison" : "hit", target: ref, heads: heads, strands: strands,
                                    unison: unison ? 1 : 0, motes: motes, scale: scale, intensity: intensity,
                                    strand: index + 1 }, 26);
                            sound(action, "cobblemon:impact.dragon");
                            WorldFeedback.text(world, end.plus(WorldCombat.point(0, 1.2, 0)),
                                unison ? ficklebeamUnisonText : ficklebeamHitText, unison ? [heads] : [Math.round(applied)], 26);
                        }
                    }
                }
            }

            if (hits === 0) {
                const tip = origin.plus(direction.scale(reach));
                WorldFeedback.emit(world, ficklebeamScene, 1, tip,
                    { moment: "fizzle", motes: motes, scale: scale, blocked: walled > 0 ? 1 : 0 }, 20);
                if (walled === 0) WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), ficklebeamMissText, [], 22);
            }
            done(action);
        }
    });
}
