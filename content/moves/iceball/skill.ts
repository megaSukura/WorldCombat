/**
 * 冰球 / iceball 的出手方式。
 *
 * 核心念头：蜷身抱成一颗冰球，把它抛出去；每撞中一趟就冻上一层新冰，球更大、下一趟更重，飞空就绕回来再撞，
 * 直到撞满 5 趟——最后一下撞碎，落点冻出一小片冰面。它的身份是「一次出手内越滚越大的冰弹」：
 * 施法者定在原地控制它，代价是这几秒里不能动、不能还手；对手的读法是躲开它的飞行距离或绕到墙后。
 *
 * 两幕：
 *   起（windup，提交前）：蜷身，脚边冰屑向怀里聚成一颗球。
 *   滚（execute，提交后）：把冰球抛向目标（真实飞行、带追踪），命中即结算一段 `ball` 并把趟数抬一级
 *       （下一趟威力 × ramp）；飞空则绕回来再撞，不涨趟数。撞满 `passes` 趟或目标消失就碎开，
 *       在落点用 `world.terrain` 租借 `frostCells` 块冰（走完 `frostTicks` 自己化掉）。
 *
 * 与同族分开：滚动是石球本身跨出手一趟趟滚、把人顶开；冰球是一次出手内离手的冰弹，自己回头、最后留下冰面。
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

    define({
        id: iceballId,
        name: "Ice Ball",
        description: "The user attacks the target for five turns. The move's power increases each time it hits.",
        uses: ["抛出一颗会自己回头的冰球", "每撞中一趟冻厚一层，下一趟更重", "碎开时在落点留下一小片冰面"],
        kind: "enemy",
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
            const target = action.target();
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const ball = p(iceballId, "ball", action);
            const ramp = p(iceballId, "ramp", action);
            const cap = p(iceballId, "cap", action);
            const speed = p(iceballId, "speed", action);
            const flightRange = p(iceballId, "flight", action);
            const radius = p(iceballId, "radius", action);
            const gap = Math.max(2, Math.round(p(iceballId, "gap", action)));
            const passes = Math.max(1, Math.round(p(iceballId, "passes", action)));
            const shards = Math.max(6, Math.round(p(iceballId, "shards", action)));
            const frostCells = Math.max(1, Math.round(p(iceballId, "frostCells", action)));
            const frostTicks = Math.max(20, Math.round(p(iceballId, "frostTicks", action)));
            const up = WorldCombat.point(0, 1.1, 0);
            let pass = 0, attempts = 0, settled = false;
            let lastPoint: any = null;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (lastPoint !== null) {
                    iceballFrost(current.world(), lastPoint, frostCells, frostTicks);
                    WorldFeedback.emit(current.world(), iceballScene, 1, lastPoint, { moment: "shatter", cells: frostCells, passes: pass, ticks: frostTicks }, 24);
                    sound(current, "minecraft:block.glass.break");
                }
                done(current);
            }

            function launch(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const selfBody = scope.observe(current.actor());
                if (victimBody === null || selfBody === null) { finish(current); return; }
                if (pass >= passes || attempts >= passes * 2) {
                    WorldFeedback.text(scope, victimBody.position().plus(up), iceballCapText, [pass], 26);
                    finish(current);
                    return;
                }
                const origin = selfBody.position().plus(WorldCombat.point(0, 0.6, 0));
                let heading = victimBody.position().plus(WorldCombat.point(0, 0.2, 0)).minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                heading = heading.unit();
                const scale = Math.max(0.8, Math.min(2.4, (radius + pass * 0.09) / iceballReference));
                const intensity = Math.max(0.6, Math.min(2.6, Math.min(cap, ball * Math.pow(ramp, pass)) / 12));
                let resolved = false;
                const appearance: any = { item: "minecraft:ice", spin: true, glow: true, scale: 0.9 + pass * 0.12,
                    homing: { target: targetRef, turn: 14, delay: 1, range: flightRange + 2 } };
                attempts++;
                sound(current, "minecraft:entity.snowball.throw");
                const flight = current.projectile(origin, heading.scale(speed), 0, radius, flightRange, 60,
                    function (inner: CombatAction, hit: CombatImpact) {
                        if (resolved) return;
                        const victim2 = hit.target();
                        if (victim2 === null) return;
                        resolved = true;
                        const power = Math.min(cap, ball * Math.pow(ramp, pass));
                        lastPoint = hit.position();
                        // 每一趟用不同的 strike 身份：动作按 strike/目标 去重，同一身份只会结算一次。
                        impact(inner, hit, iceballId, power, { damage: damageSpec(iceballId, "ball"), contact: true }, "ball" + (pass + 1));
                        WorldFeedback.emit(inner.world(), iceballScene, 1, hit.position(),
                            { moment: "hit", target: targetRef, pass: pass + 1, passes: passes, power: Math.round(power * 10) / 10,
                                shards: shards, scale: scale, intensity: intensity }, 24);
                        WorldFeedback.text(inner.world(), hit.position().plus(up), iceballHitText, [Math.round(power)], 24);
                        sound(inner, "cobblemon:impact.ice");
                        pass++;
                        inner.after(gap, launch);
                    },
                    function (inner: CombatAction) {
                        if (resolved) return;
                        resolved = true;
                        WorldFeedback.emit(inner.world(), iceballScene, 1, selfBody.position(),
                            { moment: "return", pass: pass + 1, passes: passes, shards: shards, scale: scale }, 20);
                        inner.after(gap, launch);
                    },
                    JSON.stringify(appearance));
                WorldFeedback.keep(scope, "world_combat:move_iceball:ball:" + String(action.id()) + ":" + pass, iceballScene, 1, origin,
                    { moment: "flight", projectile: flight, target: targetRef, pass: pass + 1, passes: passes,
                        shards: shards, scale: scale, direction: [heading.x(), heading.y(), heading.z()], intensity: intensity }, 60);
            }

            WorldFeedback.emit(world, iceballScene, 1, body.position().plus(WorldCombat.point(0, 0.4, 0)),
                { moment: "charge", passes: passes, shards: shards }, 20);
            action.after(2, launch);
        }
    });
}
