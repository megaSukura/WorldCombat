/**
 * 冰锥 / iciclespear 的出手方式。本族「2～5 连发硬物」的冰型。
 *
 * 核心念头：**碎冰齐排**——在身前横排凝出一排平行冰锥，一次齐射出去；近处宽目标会被多根同时穿中。
 *   每根各自独立结算一次伤害，命中让目标霜寒、移速变慢；撞在硬面上的那根当场碎冰。它是本族命中 100、
 *   PP 最多的一梭，也是唯一「一排同发」的一梭。
 *
 * 幕（提交前只播预告）：
 *   起（gather）：寒气收敛、身侧横排凝出一排冰锥，只播预告，并把冰排宽度画出来。
 *   射（volley → shatter / break）：提交后同一刻按左右错位、方向平行地发射 `shots` 根真冰锥；
 *       每根首次碰实体各结算一次 `spear` 物理伤害、散出 `shards` 片冰屑，并按 `chill` 时长施加
 *       `world_combat:iciclespear_chill`（霜附式振幅 +1 → 减速等级高一档）。
 *   碎（shatter / break / fade）：命中在目标身上碎开；撞块在原生方块格与表面碎冰；空飞耗尽只淡出。
 *
 * 与同族分开：岩石爆击走弧线落尘、飞弹针追踪钉身、尖刺加农炮直线穿排；只有冰锥是齐排平行同发，
 *   靠冰排宽度覆盖宽目标。取消原「每落点换雪块」，霜寒只随实际命中，落点只留会消散的冰屑。
 *
 * 选取 `kind: "aim"`：自由方向放排刺，实体只作为朝向；撞块碎冰，不附着。
 *
 * 配置 `rime`（霜附式）由公式改霜寒振幅／时长、锥数、威力与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 由准线与锥数算出这一排的左右端点与逐根横向偏移；判定与表现读同一组位置。 */
    function icicleSpearRow(origin: CombatPoint, direction: CombatPoint, shots: number, spacing: number): { forward: CombatPoint; offsets: CombatPoint[]; left: CombatPoint; right: CombatPoint } {
        let forward = direction;
        if (forward.length() < 0.05) forward = WorldCombat.point(0, 0, 1);
        forward = forward.unit();
        let side = WorldCombat.point(forward.z(), 0, -forward.x());
        if (side.length() < 0.05) side = WorldCombat.point(1, 0, 0);
        side = side.unit();
        const half = (shots - 1) / 2, offsets: CombatPoint[] = [];
        for (let i = 0; i < shots; i++) offsets.push(side.scale((i - half) * spacing));
        return { forward: forward, offsets: offsets, left: origin.plus(side.scale(-half * spacing)), right: origin.plus(side.scale(half * spacing)) };
    }

    define({
        id: "iciclespear",
        cooldownParameter: "recharge",
        name: "Icicle Spear",
        description: "在身前横排凝出一排平行冰锥、一次齐射：近处宽目标会被多根同时穿中，每根各自结算一次物理伤害并让目标霜寒、移速变慢。撞在硬面上的冰锥当场碎掉；落点只留会消散的冰屑。霜附式减速更狠、锥数更少；纯碎式锥数更多、单锥更锋利。",
        uses: ["一次齐射一整排平行冰锥", "对宽目标（Boss／横排）多根同时穿中", "用霜寒减速目标，纯碎式堆单锥伤害"],
        kind: "aim",
        range: 8,
        maxRange: 13,
        prepare: 8,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 240,
        style: "ice",
        defaults: { rime: false, ai: { maxChase: 11, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("iciclespear", "reach", pokemon), geometry: "line", style: "ice", color: 0x9FD8E8,
                label: config && config.rime === true ? "霜附冰锥" : "纯碎冰锥" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["iciclespear"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("iciclespear", "tempo", context)),
                recover: Math.round(p("iciclespear", "aftercast", context)),
                cooldown: Math.round(p("iciclespear", "recharge", context)),
                active: 0,
                range: p("iciclespear", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shots = Math.max(2, Math.min(5, Math.round(p("iciclespear", "shots", action))));
            const radius = Math.max(0.1, p("iciclespear", "radius", action));
            const row = icicleSpearRow(action.origin(), aim(action), shots, Math.max(0.28, radius * 2.4));
            action.present("iciclespear:gather", icicleSpearScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", shots: shots, rime: config && config.rime === true ? 1 : 0,
                    path: [[row.left.x(), row.left.y(), row.left.z()], [row.right.x(), row.right.y(), row.right.z()]],
                    direction: [row.forward.x(), row.forward.y(), row.forward.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("iciclespear", "spear", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("iciclespear", "shots", action))));
            const speed = Math.max(0.8, p("iciclespear", "velocity", action));
            const radius = Math.max(0.1, p("iciclespear", "radius", action));
            const reach = p("iciclespear", "reach", action);
            const chillTicks = Math.max(40, Math.round(p("iciclespear", "chill", action)));
            const frostRadius = Math.max(0.6, p("iciclespear", "frost", action));
            const shards = Math.max(6, Math.round(p("iciclespear", "shards", action)));
            const rime = !!(config && config.rime);
            const amplitude = rime ? 1 : 0;
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.16));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            try { action.releaseTarget(); } catch (error) { }
            const origin = action.origin();
            const row = icicleSpearRow(origin, aim(action), shots, Math.max(0.28, radius * 2.4));
            const scenes = WorldFeedback.actionScenes(icicleSpearScene);
            const lifetime = Math.max(24, Math.round((reach + 3) / Math.max(0.4, speed)) + 24);
            const directionData = [row.forward.x(), row.forward.y(), row.forward.z()];
            let active = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            sound(action, "cobblemon:move.iceshard.actor_2");
            WorldFeedback.emit(world, icicleSpearScene, 1, origin,
                { moment: "gather", shots: shots, shards: shards, scale: scale, intensity: intensity, rime: rime ? 1 : 0,
                    path: [[row.left.x(), row.left.y(), row.left.z()], [row.right.x(), row.right.y(), row.right.z()]],
                    direction: directionData }, 14);

            function launch(index: number): void {
                if (settled) return;
                const start = origin.plus(row.offsets[index]);
                const key = "spear:" + (index + 1);
                let resolved = false;
                active++;
                const flight = action.projectile(start, row.forward.scale(speed), 0, radius, reach + 3, lifetime,
                    function (inner: CombatAction, hit: CombatImpact) {
                        resolved = true;
                        scenes.stop(inner, key);
                        const scope = inner.world();
                        const struck = hit.target();
                        const at = hit.position();
                        if (struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                            const landed = impact(inner, hit, "iciclespear", power, { damage: damageSpec("iciclespear", "spear") });
                            if (landed) {
                                CombatStatus.apply(scope, struck, "chill", icicleSpearChill, chillTicks, amplitude);
                                WorldFeedback.emit(scope, icicleSpearScene, 1, at,
                                    { moment: "shatter", target: String(struck.ref()), shot: index + 1, shots: shots, shards: shards,
                                        scale: scale, intensity: intensity, rime: rime ? 1 : 0, duration: chillTicks,
                                        frost: frostRadius, direction: directionData }, 20);
                                sound(inner, "cobblemon:impact.ice");
                                sound(inner, "minecraft:block.glass.break");
                                // 冰屑落在地面：只按霜圈半径表现，不改动方块。
                                WorldFeedback.emit(scope, icicleSpearScene, 1, at,
                                    { moment: "frost", shot: index + 1, shots: shots, shards: Math.round(shards * 0.6),
                                        scale: Math.max(0.5, frostRadius / 1.0), intensity: Math.max(0.4, intensity * 0.7), rime: rime ? 1 : 0 }, 18);
                            } else {
                                WorldFeedback.emit(scope, icicleSpearScene, 1, at,
                                    { moment: "break", target: String(struck.ref()), shot: index + 1, shots: shots, shards: Math.round(shards * 0.5),
                                        scale: scale, intensity: Math.max(0.4, intensity * 0.7) }, 16);
                            }
                            return;
                        }
                        const cell = hit.blockPosition();
                        WorldFeedback.emit(scope, icicleSpearScene, 1, cell === null ? at : cell,
                            { moment: "break", shot: index + 1, shots: shots, shards: Math.round(shards * 0.5), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7), face: hit.blockFace(), blocked: hit.blocked() ? 1 : 0 }, 16);
                    },
                    function (inner: CombatAction) {
                        if (!resolved) {
                            scenes.stop(inner, key);
                            WorldFeedback.emit(inner.world(), icicleSpearScene, 1, start.plus(row.forward.scale(reach + 3)),
                                { moment: "fade", shot: index + 1, shots: shots, scale: scale, intensity: Math.max(0.3, intensity * 0.5) }, 14);
                        }
                        active--;
                        if (active <= 0) finish(inner);
                    },
                    JSON.stringify({ sprite: "cobblemon:particle/generic/ice/iceshard", tint: 0xBFE8F5, glow: true,
                        scale: Math.max(0.8, Math.min(1.6, radius / 0.16)) }));
                if (!settled) scenes.show(action, key, start,
                    { moment: "volley", projectile: flight, shot: index + 1, shots: shots, shards: shards,
                        scale: scale, intensity: intensity, rime: rime ? 1 : 0, direction: directionData,
                        path: [[row.left.x(), row.left.y(), row.left.z()], [row.right.x(), row.right.y(), row.right.z()]] });
            }

            for (let index = 0; index < shots; index++) launch(index);
        }
    });
}
