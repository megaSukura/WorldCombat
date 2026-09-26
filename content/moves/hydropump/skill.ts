/**
 * 水炮 / hydropump 的出手方式。
 *
 * 核心念头：**撑住一股短而猛的水柱，把正前方顶出去**。它不再是一颗水弹加一圈圆炸，而是从喷口到
 *   实际受阻点始终连着的一道高压水柱：每刻用真实 trace 找出端点，把正前方第一个挡路的敌人浇透一次、
 *   随后只沿着最初的推距预算把它一格格顶出去；水柱扫到墙或身体就截住，方向在释放那一刻锁死。
 *
 * 时序：
 *   起（charge，提交前）：大量水在身前后翻涌成一大团、身体后仰，只播预告（可以被打断，所以能扑空）。
 *   轰（column，提交后 6 刻）：固定释放方向的水柱每刻 trace 到真实端点，喷口到端点始终相连；
 *       首个有效敌人只吃一次 `torrent`，之后只按原 `blow` 总预算分步持续推动，不重复满伤；
 *       漫灌式在水柱真实受阻端点再按 `backwash` 小范围溅射一次——圈内其他实体必须通视、且伤害真的
 *       结算成功才会被推开并湿透，免伤者不会被凭空的湿身或推动带走。
 *
 * 与场上最像的招分开：加农水炮是笔直单点高压柱、放完施法者力竭；喷水是从脚下整圈漫出；喷射火焰是
 *   一道会转向、会变长的火舌。水炮是**朝准线锁死、只持续 6 刻、只推一次的单体压力柱**——它窄、
 *   近、短，但把挡路的人一路顶出去。
 *
 * 配置 `deluge`（漫灌）由公式改威力／回溅／湿身／散射／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hydropumpScene = "world_combat:move_hydropump";
    const hydropumpSoaked = "world_combat:hydropump_soaked";
    const hydropumpSoakText = "world_combat.move.hydropump.text.soak";
    const hydropumpMissText = "world_combat.move.hydropump.text.miss";

    /** 把湿透挂到目标身上：共享身份 soaked，本单元效果，独一无二地替换同类载体。 */
    function hydropumpDrench(world: CombatWorld, victim: CombatActor, ticks: number): boolean {
        return CombatStatus.apply(world, victim, "soaked", hydropumpSoaked, Math.max(40, Math.round(ticks)), 0,
            { unique: true, secondary: true });
    }

    /** 把释放方向绕世界 Y 轴偏一个固定角度；散射在释放那一刻一次性决定整柱方向。 */
    function hydropumpRotate(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "hydropump",
        cooldownParameter: "recharge",
        name: "Hydro Pump",
        description: "撑住一股短而猛的高压水柱轰向准线：方向在释放那一刻锁死，水柱每刻从喷口连到真实受阻点，把正前方第一个敌人浇透一次、再一路顶出去。漫灌式会在撞上的那一点再溅开一小圈，圈内看得见的敌人各吃一次回溅并被浇透；免伤者不会被湿或推动。",
        uses: ["把正前方挡路的目标浇透并顶开一段", "把守着通道的敌人一路推出走廊口", "第一次命中先湿透，再让别的招（如加农水炮）来加成"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 15,
        active: 0,
        recover: 12,
        cooldown: 48,
        style: "tide",
        stationary: true,
        defaults: { deluge: false, ai: { maxChase: 12, reserve: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hydropump", "backwash", pokemon), geometry: "line", style: "tide",
                color: 0x2C86C8, label: config && config.deluge === true ? "漫灌水炮" : "冲压水炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["hydropump"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("hydropump", "tempo", context)),
                recover: Math.round(p("hydropump", "aftercast", context)),
                cooldown: Math.round(p("hydropump", "recharge", context)),
                active: 0,
                range: p("hydropump", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("hydropump:charge", hydropumpScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", volume: Math.round(p("hydropump", "volume", action)),
                    deluge: config && config.deluge === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("hydropump", "torrent", action);
            const splash = p("hydropump", "splash", action);
            const radius = Math.max(0.35, p("hydropump", "radius", action));
            const backwash = Math.max(1.2, p("hydropump", "backwash", action));
            const blow = Math.max(0.2, p("hydropump", "blow", action));
            const soak = Math.max(60, Math.round(p("hydropump", "soakTicks", action)));
            const spread = Math.max(1.5, p("hydropump", "spread", action));
            const volume = Math.max(30, Math.round(p("hydropump", "volume", action)));
            const flow = Math.max(0.3, p("hydropump", "velocity", action));
            const deluge = !!(config && config.deluge);
            const scale = Math.max(0.6, Math.min(2.6, backwash / 2.4));
            const intensity = Math.max(0.6, Math.min(2.4, power / 110));
            const active = 6;
            const base = aim(action);
            const direction = hydropumpRotate(base, (world.random() * 2 - 1) * spread * Math.PI / 180);
            const flat = WorldCombat.point(direction.x(), 0, direction.z());
            const push = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 0);
            const reach = action.range() + 1.5;
            const scenes = WorldFeedback.actionScenes(hydropumpScene);
            let tick = 0, mainRef = "", damaged = false, pushed = 0, splashed = false, wallHit = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(action.actor());
                const nozzle = body !== null ? body.position().plus(WorldCombat.point(0, 0.25, 0)) : current.origin();
                const hit = current.trace(nozzle, nozzle.plus(direction.scale(reach)), radius, true);
                let endpoint = hit.position();
                const victim = hit.target();
                if (damaged) {
                    const tracked = scope.actor(mainRef);
                    if (tracked !== null && scope.valid(tracked)) {
                        const state = scope.observe(tracked);
                        if (state !== null) endpoint = state.position();
                    }
                }
                current.face(nozzle.plus(direction.scale(2.0)), 18, 18);
                scenes.show(current, "column", nozzle,
                    { moment: "column", path: [[nozzle.x(), nozzle.y(), nozzle.z()], [endpoint.x(), endpoint.y(), endpoint.z()]],
                        direction: [direction.x(), direction.y(), direction.z()], flow: flow, volume: volume,
                        scale: scale, intensity: intensity, deluge: deluge ? 1 : 0 });

                // 首个有效敌人只吃一次原 torrent；免伤者不推动、不湿身。
                if (!damaged && victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    if (hurt(current, victim, "hydropump", power, { damage: damageSpec("hydropump", "torrent") })) {
                        damaged = true;
                        mainRef = String(victim.ref());
                        WorldFeedback.emit(scope, hydropumpScene, 1, endpoint,
                            { moment: "burst", target: mainRef, volume: volume, scale: scale, intensity: intensity, blow: blow }, 30);
                        WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 1.2, 0)), hydropumpSoakText, [], 26);
                        if (scope.valid(victim)) hydropumpDrench(scope, victim, soak);
                        sound(current, "cobblemon:move.hydropump.target");
                        sound(current, "cobblemon:impact.water");
                    }
                }

                // 沿原 blow 总预算分步持续推动：每刻把剩余预算摊到剩余刻数上，实际位移由原生碰撞决定。
                if (damaged && pushed < blow) {
                    const tracked = scope.actor(mainRef);
                    if (tracked !== null && scope.valid(tracked)) {
                        const remainingTicks = Math.max(1, active - tick);
                        const step = Math.min((blow - pushed) / remainingTicks, blow - pushed);
                        const applied = scope.displace(tracked, push.scale(step));
                        if (applied > 0) pushed += applied;
                    }
                }

                // 漫灌式：在水柱真实受阻端点小范围溅射一次；圈内目标必须通视、且伤害成功才被推/湿。
                if (deluge && !splashed && (hit.blocked() || hit.hitEntity())) {
                    splashed = true;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(endpoint, 0, backwash, { below: 2.0, above: 2.5 }),
                        function (other, facts) {
                            if (mainRef !== "" && String(other.ref()) === mainRef) return;
                            if (!scope.clear(endpoint, facts.position())) return;
                            if (!hurt(current, other, "hydropump", splash, { damage: damageSpec("hydropump", "splash") })) return;
                            const off = facts.position().minus(endpoint);
                            const flatOff = WorldCombat.point(off.x(), 0, off.z());
                            if (scope.valid(other) && flatOff.length() > 0.001) scope.hitDisplace(other, flatOff.unit().scale(blow * 0.6));
                            hydropumpDrench(scope, other, Math.round(soak * 0.7));
                            WorldFeedback.emit(scope, hydropumpScene, 1, facts.position(),
                                { moment: "douse", target: String(other.ref()), landed: 1,
                                    scale: Math.max(0.5, scale * 0.8), intensity: Math.max(0.4, intensity * 0.7) }, 22);
                        });
                }

                // 撞上硬面：同一点向四周溅水（水柱被墙截住，不穿过）。
                if (hit.blocked() && hit.blockPosition() !== null && !wallHit) {
                    wallHit = true;
                    WorldFeedback.emit(scope, hydropumpScene, 1, endpoint,
                        { moment: "dud", volume: volume, scale: scale, intensity: intensity, face: hit.blockFace() }, 20);
                    scope.sound("minecraft:entity.generic.splash", endpoint, 14, "{}");
                }

                tick++;
                if (tick >= active) {
                    if (!damaged && !wallHit)
                        WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 0.6, 0)), hydropumpMissText, [], 22);
                    finish(current);
                    return;
                }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.hydropump.actor");
            advance(action);
        }
    });
}
