/**
 * 泼冷水 / chillingwater —— 注册与动作。
 *
 * 核心念头：兜起一团接近冰点的水，迎头泼在对手身上。水浇灭了它的力气（攻击下降），把它浇得湿透
 *   （借共享身份 world_combat:status/soaked），落点地上留下湿冷的水渍。已经湿透的目标被这一泼激得更冷：
 *   伤害更高、掉攻多一级——共享身份回流进这招自己的公式。
 *
 * 自由瞄准（kind: "aim"）：可指向任意阵营实体或一个世界点，碰墙即停。谁实际碰到水团，就按谁当刻的
 *   湿身状态结算这一泼；命中的伤害被拒绝（相性免疫、权限、已被挡下）时不降攻、不加湿身，只当水花落地。
 *
 * 三幕：
 *   起（windup，提交前）：水在头顶兜成一颗冷冽的水团（`action.present` 预告）。
 *   泼（throw → drench）：提交后水团飞向准线；飞行表现绑在真实弹体 id 上，与弹体同行。
 *     命中活物时以**该受击者**为上下文求威力／掉攻级数，实际伤害成立才降攻并把 soaked 挂上去。
 *   渍（glaze）：冰面形态下，按原生 `terrainResult` 真正放下的格结冰（租借，到期原方块回来）；
 *     没放下就不显示冰面、不报成功。到程落空时水花散在弹体真正的末端，不落在选中目标当前位置。
 *
 * 与同族分开：水之波动是沿直线荡开的水环、万有引力从头顶落下苹果；泼冷水是**单体、必然掉攻、留下湿身**的一泼。
 * 配置 `glaze`（泼水成冰）由公式改威力／射程／湿身、由 resolve 改时序，并在落点留下真冰。
 */
namespace PokemonSkills {
    const chillingwaterScene = "world_combat:move_chillingwater";
    const chillingwaterSoaked = "world_combat:chillingwater_soaked";
    const chillingwaterText = "world_combat.move.chillingwater.text.drench";
    const chillingwaterGlazeText = "world_combat.move.chillingwater.text.glaze";

    /** 在落点铺一圈冰：逐列找地表，把表层换成冰（租借，到期原方块回来）；返回 terrainResult 真正放下的格数。 */
    function chillingwaterGlaze(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius);
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 2; dy >= -3; dy--) {
                const ground = world.block(WorldCombat.point(x, baseY + dy, z));
                if (ground === null) break;
                const id = String(ground.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                if (id !== "minecraft:ice" && id !== "minecraft:frosted_ice") cells.push({ x: x, y: baseY + dy, z: z, block: "minecraft:ice" });
                break;
            }
        }
        if (!cells.length) return 0;
        try {
            const receipt = JSON.parse(String(world.terrainResult(
                JSON.stringify({ cells: cells, replace: true, linger: true, bestEffort: true }), Math.max(40, Math.round(ticks)))));
            return Array.isArray(receipt.placed) ? receipt.placed.length : 0;
        } catch (error) { return 0; }
    }

    define({
        id: "chillingwater",
        cooldownParameter: "wait",
        name: "Chilling Water",
        description: "兜起一团接近冰点的水迎头泼在对手身上：浇灭它的力气（攻击下降）、把它浇得湿透，落点留下湿冷水渍；冰面形态下还会在落点结起一圈会打滑的冰，但单发更轻、出手更慢。",
        uses: ["压低对手的物理输出", "把目标浇湿，让后续水冰招能利用这层湿身", "在狭窄地面上结一圈冰，逼对手走位"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "chillwater",
        defaults: { glaze: false, ai: { maxChase: 14 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: Math.max(0.6, p("chillingwater", "radius", pokemon)), geometry: "circle", style: "chillwater",
                color: 0x6FC3E8, label: config && config.glaze === true ? "泼水成冰" : "泼冷水" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["chillingwater"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("chillingwater", "tempo", context)),
                recover: Math.round(p("chillingwater", "aftercast", context)),
                cooldown: Math.round(p("chillingwater", "wait", context)),
                active: 0,
                range: p("chillingwater", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("chillingwater:gather", chillingwaterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", glaze: config && config.glaze === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const speed = p("chillingwater", "velocity", action);
            const radius = p("chillingwater", "radius", action);
            const chill = Math.max(60, Math.round(p("chillingwater", "chillTicks", action)));
            const drops = Math.max(8, Math.round(p("chillingwater", "drops", action)));
            const puddleRadius = Math.max(1.0, p("chillingwater", "puddleRadius", action));
            const puddleTicks = Math.max(40, Math.round(p("chillingwater", "puddleTicks", action)));
            const glaze = !!(config && config.glaze);
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.22));
            // 视觉强度用无目标的中性上下文，避免把选中目标的湿身状态误当成实际命中结果。
            const baseline = Math.max(0.5, Math.min(2, p("chillingwater", "drench", withTarget(factContext(action), null)) / 50));
            const range = action.range();
            const offset = action.targetPosition().minus(origin);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                if (glaze) {
                    const placed = chillingwaterGlaze(scope, point, puddleRadius, puddleTicks);
                    if (placed > 0) {
                        WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                            { moment: "glaze", radius: puddleRadius, cells: placed, scale: Math.max(0.6, Math.min(1.8, puddleRadius / 1.6)) }, 26);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), chillingwaterGlazeText, [], 26);
                        scope.sound("minecraft:block.glass.place", point, 14, "{}");
                    }
                }
                finish(current);
            }

            sound(action, "cobblemon:move.watergun.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: 180, direction: direction,
                appearance: { sprite: "cobblemon:generic/water/waterjet", tint: 0x8FD6F5, glow: true, scale: Math.max(0.7, Math.min(1.5, scale)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struck = true;
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 以真实受击者为上下文：威力与掉攻级数读到的是这个身体当刻的湿身状态。
                        const aimed = withTarget(factContext(current), victim);
                        const power = p("chillingwater", "drench", aimed);
                        const stages = Math.max(1, Math.min(2, Math.round(p("chillingwater", "atkDrop", aimed))));
                        const soaked = CombatStatus.has(scope, victim, "soaked") ? 1 : 0;
                        const landed = impact(current, hit, "chillingwater", power, { damage: damageSpec("chillingwater", "drench") });
                        const intensity = Math.max(0.5, Math.min(2, power / 50));
                        if (landed) {
                            NativeEffects.boost(scope, victim, "atk", -stages);
                            MobEffects.apply(scope, victim, chillingwaterSoaked, chill, 0);
                            const at = scope.observe(victim);
                            WorldFeedback.keep(scope, "chillingwater:soak:" + String(victim.ref()), chillingwaterScene, 1,
                                at !== null ? at.position() : point,
                                { moment: "soak", target: String(victim.ref()), drops: drops, stages: stages, bonus: soaked,
                                    scale: scale, intensity: intensity }, Math.min(chill, 200));
                            WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                                { moment: "drench", target: String(victim.ref()), drops: drops, stages: stages, bonus: soaked,
                                    scale: scale, intensity: intensity }, 24);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), chillingwaterText, [stages], 30);
                            scope.sound("cobblemon:impact.water", point, 16, "{}");
                        } else {
                            // 伤害被拒绝：只当冷水打在身上，不降攻、不加湿身、不报成功。
                            WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                                { moment: "drench", target: String(victim.ref()), drops: drops, bonus: 0, scale: scale, intensity: intensity }, 22);
                            scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                        }
                    } else {
                        WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                            { moment: "drench", drops: drops, bonus: 0, scale: scale, intensity: baseline }, 22);
                        scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    }
                    settle(current, point);
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    // 到程落空：水花散在弹体沿准线真正走到的末端，而不是选中目标当前位置。
                    WorldFeedback.emit(current.world(), chillingwaterScene, 1, origin.plus(direction.scale(range)),
                        { moment: "drench", drops: drops, bonus: 0, scale: scale, intensity: baseline }, 20);
                }
                finish(current);
            });
            // 飞行表现绑真实弹体 id，与弹体同行。
            WorldFeedback.keep(world, "chillingwater:throw:" + action.id(), chillingwaterScene, 1, origin,
                { moment: "throw", projectile: flight, drops: drops, scale: scale, intensity: baseline }, 120);
        }
    });
}
