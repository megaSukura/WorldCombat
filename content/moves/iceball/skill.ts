/**
 * 冰球 / iceball 的出手方式。
 *
 * 核心念头：蜷身抱成一颗冰球，沿当刻自由 aim 把它直直推出去；每真实命中一个敌人就在壳上冻厚一层，
 * 球更大、下一发更重，最多推 `passes` 发。空发、撞门框或伤害被拒就当场碎冰结束，不追踪、不重试。
 * 它的身份是「一次出手内越推越大的冰弹」：卖的是逐层加宽的空间取舍——球越粗越重，越容易先撞上窄门口的框。
 * 施法者定在原地控制它，代价是整段里不能动、不能还手；对手的读法是躲开这一发、或者退到窄缝后面让大球撞框。
 *
 * 两幕：
 *   起（windup，提交前）：蜷身，脚边冰屑向怀里聚成一颗球。
 *   滚（execute，提交后）：每发读当刻自由 aim 直飞（真实飞行、无追踪），命中真实目标才结算一段 `ball`
 *       并把趟数抬一级（下一发威力 × ramp、半径按 girth 长粗）；空发即当场碎冰结束。
 *       撞满 `passes` 趟后收尾，在最后真实碰撞点用 `world.terrain` 租借 `frostCells` 块冰（走完 `frostTicks` 自己化掉）。
 *
 * 与同族分开：滚动是施法者自己跨出手一趟趟滚、靠自身惯性顶开人；冰球是一次出手内离手的冰弹，靠逐层加宽的空间取舍。
 */
namespace PokemonSkills {
    /** 在落点附近找地面，租借几块冰（replace，linger）；找不到地面或格子不可用就跳过。 */
    function iceballFrost(world: CombatWorld, point: CombatPoint, cells: number, ticks: number): number {
        let ground: CombatBlock | null = null;
        for (let step = 0; step < 5 && ground === null; step++) {
            const block = world.block(point.plus(WorldCombat.point(0, -0.5 * step, 0)));
            if (block !== null && String(block.id()) !== "minecraft:air") ground = block;
        }
        if (ground === null) return 0;
        const centre = ground.position();
        let laid = 0;
        for (let index = 0; index < cells; index++) {
            const angle = index * 2.399963229728653;
            const spread = index === 0 ? 0 : 0.9;
            const x = Math.round(centre.x() + Math.cos(angle) * spread);
            const y = Math.round(centre.y());
            const z = Math.round(centre.z() + Math.sin(angle) * spread);
            try {
                if (world.terrain(JSON.stringify({ cells: [{ x: x, y: y, z: z, block: "minecraft:ice" }], replace: true, linger: true }), ticks) <= 0) continue;
            } catch (error) { continue; }
            laid++;
            WorldFeedback.emit(world, iceballScene, 1, WorldCombat.point(x + 0.5, y + 0.5, z + 0.5), { moment: "freeze" }, 18);
        }
        return laid;
    }

    /** 当刻自由瞄准：按住技能键时读控制点（逐发可转向），否则用释放时锁定的瞄准方向。 */
    function iceballDirection(action: CombatAction, locked: CombatPoint): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const delta = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]).minus(action.origin());
                if (delta.length() >= 0.05) return delta.unit();
            }
        } catch (error) { }
        return locked;
    }

    define({
        id: iceballId,
        cooldownParameter: "recharge",
        name: "Ice Ball",
        description: "蜷身抱成一颗冰球，沿当刻自由瞄准直直推出去：每真实命中一个敌人就在壳上冻厚一层、下一发更大更重（最多 5 发）；空发、撞门框或伤害被拒就当场碎冰结束，不追踪也不重试。球越粗越容易先撞上窄门口的框。",
        uses: ["沿瞄准方向推出一串越冻越大的冰球", "每真实命中一发冻厚一层，下一发更重", "碎开时在最后碰撞点留下一小片冰面"],
        kind: "aim",
        range: 8,
        maxRange: 13,
        prepare: 7,
        active: 0,
        recover: 8,
        cooldown: 38,
        maximumTicks: 240,
        style: "shot",
        defaults: { thick: false, ai: { maxChase: 9 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(iceballId, "flight", pokemon), geometry: "line", style: "shot", color: 0xA9D6E8,
                label: config && config.thick === true ? "厚壳冰球" : "薄壳冰球" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[iceballId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(iceballId, "tempo", context)),
                recover: Math.round(p(iceballId, "recover", context)),
                cooldown: Math.round(p(iceballId, "recharge", context)),
                active: skills[iceballId].active,
                range: p(iceballId, "flight", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_iceball:charge", iceballScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", thick: config && config.thick === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const ball = p(iceballId, "ball", action);
            const ramp = p(iceballId, "ramp", action);
            const cap = p(iceballId, "cap", action);
            const speed = p(iceballId, "speed", action);
            const flightRange = p(iceballId, "flight", action);
            const radius = p(iceballId, "radius", action);
            const girth = p(iceballId, "girth", action);
            const girthMax = p(iceballId, "girthMax", action);
            const gap = Math.max(2, Math.round(p(iceballId, "gap", action)));
            const passes = Math.max(1, Math.round(p(iceballId, "passes", action)));
            const shards = Math.max(6, Math.round(p(iceballId, "shards", action)));
            const frostCells = Math.max(1, Math.round(p(iceballId, "frostCells", action)));
            const frostTicks = Math.max(20, Math.round(p(iceballId, "frostTicks", action)));
            const up = WorldCombat.point(0, 1.1, 0);
            const scenes = WorldFeedback.actionScenes(iceballScene);
            // 释放时锁定的瞄准方向：AI 或无输入时逐发沿它飞，手动按住技能键时逐发改读控制点。
            const locked = (function (): CombatPoint {
                try {
                    const delta = action.targetPosition().minus(body.position());
                    if (delta.length() >= 0.05) return delta.unit();
                } catch (error) { }
                const direction = action.direction();
                return direction.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : direction.unit();
            })();
            let pass = 0, settled = false;
            let lastPoint: CombatPoint | null = null;
            let lastRadius = radius;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (lastPoint !== null) {
                    iceballFrost(scope, lastPoint, frostCells, frostTicks);
                    // 撞满整串才播整串的碎开；撞框/空发的当场碎已由 breach 播过，这里只补结霜与声响，避免同点双爆。
                    if (pass >= passes) {
                        WorldFeedback.emit(scope, iceballScene, 1, lastPoint,
                            { moment: "shatter", cells: frostCells, passes: pass, radius: Math.round(lastRadius * 100) / 100, ticks: frostTicks }, 24);
                        const at = lastPoint;
                        WorldFeedback.text(scope, at.plus(up), iceballCapText, [pass], 26);
                    }
                    sound(current, "minecraft:block.glass.break");
                }
                scenes.finish(current, done);
            }

            /** 一发：聚壳、沿当刻 aim 直飞；只有真实命中才续下一发，空发/撞框/被拒当场碎冰收束。 */
            function launch(current: CombatAction): void {
                if (settled) return;
                if (pass >= passes) { finish(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position().plus(WorldCombat.point(0, 0.4, 0));
                const direction = iceballDirection(current, locked);
                if (direction.length() < 0.05) { finish(current); return; }
                const heading = direction.unit();
                // 真实半径随命中趟数增长并与画面同步；限制在 girthMax 以内，大球会先撞门框。
                const thisRadius = Math.min(girthMax, radius * (1 + pass * girth));
                const scale = Math.max(0.7, Math.min(2.4, thisRadius / iceballReference));
                const power = Math.min(cap, ball * Math.pow(ramp, pass));
                const intensity = Math.max(0.6, Math.min(2.6, power / 12));
                const appearance: any = { item: "minecraft:ice", spin: true, glow: true, scale: scale };
                const key = "ball:" + (pass + 1);
                lastRadius = thisRadius;
                let resolved = false;
                // 身前逐层包壳再推出：每发在推出前把新一层壳聚在身前。
                WorldFeedback.emit(scope, iceballScene, 1, origin,
                    { moment: "shell", pass: pass + 1, passes: passes, radius: Math.round(thisRadius * 100) / 100,
                        shards: shards, scale: scale, intensity: intensity }, 12);
                sound(current, "minecraft:entity.snowball.throw");
                const flight = current.projectile(origin, heading.scale(speed), 0, thisRadius, flightRange, 60,
                    function (inner: CombatAction, hit: CombatImpact) {
                        if (resolved) return;
                        resolved = true;
                        scenes.stop(inner, key);
                        const stage = inner.world();
                        const victim = hit.target();
                        const at = hit.position();
                        if (victim !== null && stage.valid(victim) && !stage.friendly(victim)) {
                            lastPoint = at;
                            const landed = impact(inner, hit, iceballId, power, { damage: damageSpec(iceballId, "ball") }, "ball" + (pass + 1));
                            if (landed) {
                                WorldFeedback.emit(stage, iceballScene, 1, at,
                                    { moment: "hit", target: String(victim.ref()), pass: pass + 1, passes: passes, power: Math.round(power * 10) / 10,
                                        radius: Math.round(thisRadius * 100) / 100, shards: shards, scale: scale, intensity: intensity }, 22);
                                WorldFeedback.text(stage, at.plus(up), iceballHitText, [Math.round(power)], 22);
                                sound(inner, "cobblemon:impact.ice");
                                pass++;
                                if (pass >= passes) { finish(inner); return; }
                                inner.after(gap, launch);
                                return;
                            }
                            // 伤害被拒：如实当碎冰，不再当作命中去续发。
                            WorldFeedback.emit(stage, iceballScene, 1, at,
                                { moment: "breach", target: String(victim.ref()), pass: pass + 1, passes: passes,
                                    radius: Math.round(thisRadius * 100) / 100, shards: shards, scale: scale, intensity: intensity, resisted: 1 }, 20);
                            finish(inner);
                            return;
                        }
                        // 撞门框：球碎在真实方块面；空飞则 complete 处理。
                        if (hit.blocked()) lastPoint = at;
                        WorldFeedback.emit(stage, iceballScene, 1, at,
                            { moment: "breach", pass: pass + 1, passes: passes, radius: Math.round(thisRadius * 100) / 100,
                                shards: shards, scale: scale, intensity: intensity, blocked: hit.blocked() ? 1 : 0,
                                face: hit.blockFace(), direction: [heading.x(), heading.y(), heading.z()] }, 20);
                        finish(inner);
                    },
                    function (inner: CombatAction) {
                        if (resolved) return;
                        resolved = true;
                        scenes.stop(inner, key);
                        // 空发：飞满射程没碰到东西，当场碎冰结束，不再绕回。
                        const away = origin.plus(heading.scale(flightRange));
                        WorldFeedback.emit(inner.world(), iceballScene, 1, away,
                            { moment: "breach", pass: pass + 1, passes: passes, radius: Math.round(thisRadius * 100) / 100,
                                shards: shards, scale: scale, intensity: intensity, blocked: 0,
                                direction: [heading.x(), heading.y(), heading.z()] }, 20);
                        finish(inner);
                    },
                    JSON.stringify(appearance));
                scenes.show(current, key, origin,
                    { moment: "flight", projectile: flight, pass: pass + 1, passes: passes, radius: Math.round(thisRadius * 100) / 100,
                        shards: shards, scale: scale, direction: [heading.x(), heading.y(), heading.z()], intensity: intensity });
            }

            WorldFeedback.emit(world, iceballScene, 1, body.position().plus(WorldCombat.point(0, 0.4, 0)),
                { moment: "charge", passes: passes, shards: shards }, 20);
            action.after(2, launch);
        }
    });

    // 玩家按住技能键连推一握冰球、每发之间可转向；AI 提交仍带一个目标点，读同一条控制输入。
    WorldCombat.preview("world_combat:iceball", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
