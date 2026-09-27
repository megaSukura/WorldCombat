/**
 * 极光束 / aurorabeam —— 注册与动作。
 *
 * 核心念头：一条**会跑的虹色光束**。身前把冷光折成一段棱镜，沿瞄准线冲出去，命中处炸开一圈虹色光、
 * 地面结出一小片霜；被这道冷光刺到的人偶尔攻击下降。它只打最前面的一个，比冰冻光束轻、快、便宜。
 *
 * 折射：虹光撞到**已有的雪／冰表面**时，按原生 `blockFace()` 的法线把入射方向做一次镜面反射，
 *   剩余射程继续前进；只折一次，第二次碰块（或碰到任何身体）就结束。反射起点在接触面上有一小段偏移，
 *   这段偏移也算进总路程，所以折射不会凭空增加射程；石墙、泥土、木头都不会折射。
 *   新结的霜只在最终落点铺出，本发不会把自己刚结的霜当成反射面。
 *
 * 两幕：
 *   起（windup，提交前）：身前把冷光折成一点棱镜，只播预告。
 *   射（travel → reflect/hit/rime，提交后）：虹光从肢体前端沿瞄准方向冲出；连续光带绑在真实投影上，
 *       命中身体结算 beam 伤害、按 chillChance 与原生实际接受的 delta 把攻击压 1 级（已经到底或免疫时不假报）；
 *       命中冰雪表面且有有效方块面时在真实接触点折一下，剩余射程走第二段；最终落点在真实顶面逐格结霜。
 *       一路没碰到任何东西时在 `world.projectilePosition` 的真实末点消散，不结霜、不拿满射程点假造终点。
 *
 * 与冰冻光束分开：冰冻光束是瞬发贯穿一条线的白蓝光、冻住人、留冰线；极光束是看得见轨迹、可借冰面
 * 折射一次的彩虹缎带、只打最前一个、留霜斑、压攻击。配置 `spectrum`（虹谱）由 resolve 改时序、
 * 由公式改射程／霜斑／概率。
 */
namespace PokemonSkills {
    /** 在落点找真实地面，租借一小片霜（packed_ice）：逐格取原生顶面、要求当刻为空并带 expectedState，被拒就少一格。 */
    function aurorabeamFrost(world: CombatWorld, point: CombatPoint, band: number, ticks: number): number {
        const surface = SurfacePaths.support(world, point, 1.5, 4);
        if (surface === null) return 0;
        const centre = WorldCombat.point(Math.floor(surface.x()), Math.floor(surface.y()), Math.floor(surface.z()));
        const limit = Math.max(6, Math.round(band));
        const seen: { [key: string]: boolean } = Object.create(null);
        let laid = 0;
        for (let index = 0; index < limit; index++) {
            const angle = index * 2.399963229728653;
            const spread = index === 0 ? 0 : 1.0;
            const x = Math.round(centre.x() + Math.cos(angle) * spread);
            const z = Math.round(centre.z() + Math.sin(angle) * spread);
            // 每格各取真实表面：不把空隙、植被或竖直墙面当成冰地基，也不重复冻同一格。
            const face = SurfacePaths.support(world, WorldCombat.point(x + 0.5, centre.y() + 1.5, z + 0.5), 1, 4);
            if (face === null) continue;
            const cell = { x: Math.floor(face.x()), y: Math.floor(face.y()), z: Math.floor(face.z()) };
            const id = cell.x + "," + cell.y + "," + cell.z;
            if (seen[id]) continue;
            seen[id] = true;
            const block = world.block(WorldCombat.point(cell.x, cell.y, cell.z));
            if (block === null || String(block.id()) !== "minecraft:air") continue;
            try {
                if (world.terrain(JSON.stringify({ cells: [{ x: cell.x, y: cell.y, z: cell.z, block: "minecraft:packed_ice", expectedState: String(block.state()) }], replace: true, linger: true }), ticks) <= 0) continue;
            } catch (error) { continue; }
            laid++;
            WorldFeedback.emit(world, aurorabeamScene, 1, WorldCombat.point(cell.x + 0.5, cell.y + 0.4, cell.z + 0.5), { moment: "rime" }, 20);
        }
        return laid;
    }

    /** 原生命中的方块面法线；空 face 表示没有具体方块接触。 */
    function aurorabeamNormal(face: string): CombatPoint | null {
        switch (face) {
            case "up": return WorldCombat.point(0, 1, 0);
            case "down": return WorldCombat.point(0, -1, 0);
            case "north": return WorldCombat.point(0, 0, -1);
            case "south": return WorldCombat.point(0, 0, 1);
            case "west": return WorldCombat.point(-1, 0, 0);
            case "east": return WorldCombat.point(1, 0, 0);
            default: return null;
        }
    }

    /** 可折射表面：已有的雪／冰方块。新结的霜要到下一发才算。 */
    function aurorabeamReflective(block: CombatBlock | null): boolean {
        if (block === null) return false;
        const id = String(block.id());
        if (id === "minecraft:ice" || id === "minecraft:packed_ice" || id === "minecraft:blue_ice" || id === "minecraft:frosted_ice"
            || id === "minecraft:snow" || id === "minecraft:snow_block" || id === "minecraft:powder_snow") return true;
        return block.tagged("minecraft:ice") || block.tagged("c:ice") || block.tagged("c:snow") || block.tagged("minecraft:snow");
    }

    define({
        id: aurorabeamId,
        cooldownParameter: "recharge",
        name: "Aurora Beam",
        description: "射出一条会跑的虹色光束：命中最前面的敌人造成特殊伤害、按原生实际接受的量让它的攻击下降 1 级（已经到底或免疫时不降），并在落点地面结出一小片霜。首次撞到已有的雪或冰表面时会按入射角镜面折射一次、继续走完剩余射程，石墙不会折射。广谱更远更宽更易降攻，聚谱更快更强。",
        uses: ["中远距离的直线点名", "压制物理攻击手", "瞄冰墙斜角，折射后打到掩体后的敌人", "在通道上留下一小片湿滑的霜"],
        kind: "aim",
        range: 14,
        maxRange: 19,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "frost",
        defaults: { spectrum: false, ai: { maxChase: 17, disarm: true, finish: true } },
        fields: [flag("spectrum", "虹谱")],
        indicator: function (config, pokemon) {
            return { radius: p(aurorabeamId, "reach", pokemon), geometry: "line", style: "frost", color: 0x9FE8FF,
                label: config && config.spectrum === true ? "极光束·广谱" : "极光束·聚谱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aurorabeamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aurorabeamId, "tempo", context)),
                recover: Math.round(p(aurorabeamId, "aftercast", context)),
                cooldown: Math.round(p(aurorabeamId, "recharge", context)),
                active: 0,
                range: p(aurorabeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:aurorabeam:windup", aurorabeamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", spectrum: config && config.spectrum === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(aurorabeamId, "beam", action);
            const speed = p(aurorabeamId, "velocity", action);
            const radius = p(aurorabeamId, "radius", action);
            const chance = Math.max(0.02, Math.min(0.9, p(aurorabeamId, "chillChance", action)));
            const stages = Math.max(1, Math.round(p(aurorabeamId, "chillStages", action)));
            const band = Math.max(6, Math.round(p(aurorabeamId, "band", action)));
            const bandTicks = Math.max(40, Math.round(p(aurorabeamId, "bandTicks", action)));
            const shimmer = Math.max(10, Math.round(p(aurorabeamId, "shimmer", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.3));
            const intensity = Math.max(0.5, Math.min(2.2, power / 64));
            const totalRange = action.range();
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/smallbeam", tint: 0xB8F0FF, glow: true,
                scale: Math.max(0.8, Math.min(1.8, radius / 0.3))
            };
            const waypoints: number[][] = [[origin.x(), origin.y(), origin.z()]];
            let settled = false, reflectionUsed = false;

            sound(action, "cobblemon:move.aurorabeam.actor_1");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function trail(flight: string): void {
                WorldFeedback.keep(world, "aurorabeam:trail:" + action.id(), aurorabeamScene, 1, origin,
                    { moment: "travel", projectile: flight, shimmer: shimmer, scale: scale, intensity: intensity }, 60);
            }
            function beamPath(scope: CombatWorld, point: CombatPoint): void {
                waypoints.push([point.x(), point.y(), point.z()]);
                WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "beam", path: waypoints, shimmer: shimmer, scale: scale }, 22);
            }
            function rime(scope: CombatWorld, point: CombatPoint): void {
                // 逐格按真实顶面落霜；结出的每格各自播一小簇霜花，实际格数由原生接受结果决定。
                aurorabeamFrost(scope, point, band, bandTicks);
            }
            function strikeBody(current: CombatAction, hit: CombatImpact, point: CombatPoint, victim: CombatActor): void {
                const scope = current.world();
                const landed = impact(current, hit, aurorabeamId, power, { damage: damageSpec(aurorabeamId, "beam") });
                beamPath(scope, point);
                if (landed) {
                    WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "hit", target: String(victim.ref()), shimmer: shimmer, scale: scale, intensity: intensity }, 24);
                    if (scope.valid(victim) && scope.random() < chance) {
                        // 降攻按原生实际接受的 delta 报告：已经到底或免疫时不闪 chill、也不浮字。
                        const delta = NativeEffects.boost(scope, victim, "atk", -stages);
                        if (delta < 0) {
                            WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "chill", target: String(victim.ref()), shimmer: shimmer }, 24);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), aurorabeamChillText, [-delta], 26);
                        }
                    }
                    sound(current, "cobblemon:move.aurorabeam.target");
                } else {
                    WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "miss", target: String(victim.ref()), scale: scale }, 20);
                }
                rime(scope, point);
                finish(current);
            }
            function landBlock(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                beamPath(scope, point);
                WorldFeedback.emit(scope, aurorabeamScene, 1, point, { moment: "miss", target: "", scale: scale }, 20);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), aurorabeamMissText, [], 20);
                rime(scope, point);
                finish(current);
            }

            /** 启动一段飞行；路程按剩余射程给，真实撞点决定下一段。 */
            function fireLeg(current: CombatAction, from: CombatPoint, heading: CombatPoint, legRange: number): void {
                let resolved = false;
                const flight = current.projectile(from, heading.scale(speed), 0, radius, legRange, 200,
                    function (inner: CombatAction, hit: CombatImpact): void {
                        if (resolved) return;
                        resolved = true;
                        const scope = inner.world();
                        const point = hit.position();
                        const victim = hit.target();
                        const travelled = point.minus(from).length();
                        const left = Math.max(0, legRange - travelled);
                        if (hit.hitEntity() && victim !== null) {
                            if (scope.valid(victim) && !scope.friendly(victim)) strikeBody(inner, hit, point, victim);
                            else landBlock(inner, point);
                            return;
                        }
                        const cell = hit.blockPosition(), face = hit.blockFace();
                        const reflective = face !== "" && cell !== null && aurorabeamReflective(scope.block(cell));
                        if (reflective && !reflectionUsed && left > 0.6) {
                            reflectionUsed = true;
                            const normal = aurorabeamNormal(face);
                            if (normal !== null) {
                                const dot = heading.x() * normal.x() + heading.y() * normal.y() + heading.z() * normal.z();
                                const reflected = heading.minus(normal.scale(2 * dot));
                                const unit = reflected.length() < 1e-6 ? heading.scale(-1) : reflected.unit();
                                // 折角用两段实际路径：先把入射段画到真实接触点，再在接触点闪一下。
                                beamPath(scope, point);
                                WorldFeedback.emit(scope, aurorabeamScene, 1, point,
                                    { moment: "glint", point: [point.x(), point.y(), point.z()], face: face,
                                        shimmer: Math.round(shimmer * 0.6), scale: scale }, 18);
                                const start = point.plus(normal.scale(0.08)).plus(unit.scale(0.06));
                                // 反射起点偏移也算进总路程，第二段不吃额外射程；棱镜长度按剩余射程有界展示。
                                const remaining = Math.max(0, left - start.minus(point).length());
                                WorldFeedback.emit(scope, aurorabeamScene, 1, point,
                                    { moment: "prism", direction: [unit.x(), unit.y(), unit.z()], face: face, left: remaining,
                                        fold: Math.max(0.4, Math.min(2.0, remaining * 0.12)),
                                        shimmer: shimmer, scale: scale, intensity: intensity }, 22);
                                sound(inner, "cobblemon:impact.ice");
                                inner.after(1, function (next: CombatAction): void { fireLeg(next, start, unit, remaining); });
                                return;
                            }
                        }
                        landBlock(inner, point);
                    },
                    function (inner: CombatAction): void {
                        // 一路没碰到任何东西：在 projectilePosition 读到的真实弹体末点消散，不结霜、不拿满射程点假造终点。
                        if (resolved || settled) return;
                        resolved = true;
                        const end = inner.world().projectilePosition(flight);
                        if (end !== null)
                            WorldFeedback.emit(inner.world(), aurorabeamScene, 1, end, { moment: "miss", target: "", scale: scale }, 20);
                        finish(inner);
                    }, JSON.stringify(appearance));
                trail(flight);
            }

            fireLeg(action, origin, aim(action), totalRange);
        }
    });
}
