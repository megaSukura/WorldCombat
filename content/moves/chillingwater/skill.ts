/**
 * 泼冷水 / chillingwater —— 注册与动作。
 *
 * 核心念头：兜起一团接近冰点的水，迎头泼在对手身上。水浇灭了它的力气（攻击下降），把它浇得湿透
 *   （借共享身份 world_combat:status/soaked），落点地上留下湿冷的水渍。已经湿透的目标被这一泼激得更冷：
 *   伤害更高、掉攻多一级——共享身份回流进这招自己的公式。
 *
 * 三幕：
 *   起（windup，提交前）：水在头顶兜成一颗冷冽的水团（`action.present` 预告）。
 *   泼（throw → drench）：提交后水团飞向目标；命中活物时结算一次特殊伤害、必然掉攻（`NativeEffects.boost`），
 *     并把共享身份 soaked 挂到目标身上（本单元效果 world_combat:chillingwater_soaked）。
 *   渍（glaze）：冰面形态下，落点结起一圈冰（`world.terrain` 租借，到期原方块回来）；水面只是湿痕。
 *
 * 与同族分开：水之波动是沿直线荡开的水环、万有引力从头顶落下苹果；泼冷水是**单体、必然掉攻、留下湿身**的一泼。
 * 配置 `glaze`（泼水成冰）由公式改威力／射程／湿身、由 resolve 改时序，并在落点留下真冰。
 */
namespace PokemonSkills {
    const chillingwaterScene = "world_combat:move_chillingwater";
    const chillingwaterSoaked = "world_combat:chillingwater_soaked";
    const chillingwaterText = "world_combat.move.chillingwater.text.drench";
    const chillingwaterGlazeText = "world_combat.move.chillingwater.text.glaze";

    /** 在落点铺一圈冰：逐列找地表，把表层换成冰（租借，到期原方块回来）；冰面原生会打滑。 */
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
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "chillingwater",
        cooldownParameter: "wait",
        name: "Chilling Water",
        description: "兜起一团接近冰点的水迎头泼在对手身上：浇灭它的力气（攻击下降）、把它浇得湿透，落点留下湿冷水渍；冰面形态下还会在落点结起一圈会打滑的冰，但单发更轻、出手更慢。",
        uses: ["压低对手的物理输出", "把目标浇湿，让后续水冰招能利用这层湿身", "在狭窄地面上结一圈冰，逼对手走位"],
        kind: "enemy",
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
            const power = p("chillingwater", "drench", action);
            const speed = p("chillingwater", "velocity", action);
            const radius = p("chillingwater", "radius", action);
            const stages = Math.max(1, Math.min(2, Math.round(p("chillingwater", "atkDrop", action))));
            const chill = Math.max(60, Math.round(p("chillingwater", "chillTicks", action)));
            const drops = Math.max(8, Math.round(p("chillingwater", "drops", action)));
            const puddleRadius = Math.max(1.0, p("chillingwater", "puddleRadius", action));
            const puddleTicks = Math.max(40, Math.round(p("chillingwater", "puddleTicks", action)));
            const glaze = !!(config && config.glaze);
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.22));
            const intensity = Math.max(0.5, Math.min(2, power / 50));
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                if (glaze) {
                    const cells = chillingwaterGlaze(scope, point, puddleRadius, puddleTicks);
                    WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                        { moment: "glaze", radius: puddleRadius, cells: cells, scale: Math.max(0.6, Math.min(1.8, puddleRadius / 1.6)) }, 26);
                    if (cells > 0) {
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), chillingwaterGlazeText, [], 26);
                        scope.sound("minecraft:block.glass.place", point, 14, "{}");
                    }
                }
                finish(current);
            }

            sound(action, "cobblemon:move.watergun.actor");
            WorldFeedback.keep(world, "chillingwater:throw:" + action.id(), chillingwaterScene, 1, action.origin(),
                { moment: "throw", drops: drops, scale: scale, intensity: intensity }, 80);
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 180,
                appearance: { sprite: "cobblemon:generic/water/waterjet", tint: 0x8FD6F5, glow: true, scale: Math.max(0.7, Math.min(1.5, scale)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struck = true;
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        impact(current, hit, "chillingwater", power, { damage: damageSpec("chillingwater", "drench") });
                        NativeEffects.boost(scope, victim, "atk", -stages);
                        MobEffects.apply(scope, victim, chillingwaterSoaked, chill, 0);
                        const at = scope.observe(victim);
                        WorldFeedback.keep(scope, "chillingwater:soak:" + String(victim.ref()), chillingwaterScene, 1,
                            at !== null ? at.position() : point,
                            { moment: "soak", target: String(victim.ref()), drops: drops, stages: stages, scale: scale, intensity: intensity }, Math.min(chill, 200));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), chillingwaterText, [stages], 30);
                        scope.sound("cobblemon:impact.water", point, 16, "{}");
                    } else {
                        WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                            { moment: "drench", drops: drops, scale: scale, intensity: intensity }, 22);
                        scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    }
                    settle(current, point);
                }
            }, function (current: CombatAction) {
                if (!struck) WorldFeedback.emit(current.world(), chillingwaterScene, 1, current.targetPosition(),
                    { moment: "drench", drops: drops, scale: scale, intensity: intensity }, 20);
                finish(current);
            });
        }
    });
}
