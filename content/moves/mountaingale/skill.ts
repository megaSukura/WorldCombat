/**
 * 冰山风 / mountaingale 的出手方式。
 *
 * 核心念头：把身前的碎冰拔成一块冰山般的巨冰，抡起来沿低弧线砸向选定的地点——飞得慢、看得见、能侧身躲，
 * 砸实的一刻碎冰炸开一整圈，中心还竖起一簇冰锥。它是全家最重的远程招。
 *
 * 四幕：
 *   起（hoist，提交前）：碎冰向身前汇聚、凝成巨冰，只播预告（这是全家最长的前摇，可被打断）。
 *   掷（throw）：提交后巨冰从与解算相同的那一点、按同一份弧线飞出，拖着冰尘；下落影摆向真弹预计的第一处碰撞，
 *       随动作结束一起清理。地形挡得住它。
 *   碎（shatter）：**只在实际碰撞点**结算——正面命中的目标吃满 mass 并按 flinchChance 掷畏缩、走 hitDisplace 推退；
 *       只从落点同侧可达的其他敌人各吃一记 splash；落点结出冰面、中心竖起 spikeHeight 格冰锥（linger，到期还原），
 *       逐格由原生地形裁决，已有活体占据或无支撑的格子跳过，只有真正放下的冰锥位置才亮起。
 *   果（hit / miss）：浮字报出砸中几个，或“落空”；冰面停留 iceTicks。
 *   飞行结束却什么都没撞到时（越顶、飞出世界），巨冰就此消散：**不在旧目标点补炸、也不造冰**。
 *
 * 与同族分开：头锤短促便宜、意念头锤会追人、铁头短程掀人。与同为冰系投掷的冰柱坠击分开：冰柱是从天上
 * 竖直砸向事先标好的点，本招是从施法者这边沿弧线甩过去、会被地形挡下，留下的是冰锥簇。
 *
 * 选取：`kind: "point"`——玩家点选落点或空投，提交时不要求存在敌人；命中权限仍由命中层判断，
 * 地形只放在实际落点且由原生保护裁决。AI 仍为攻击用途推荐敌人，用敌人当前位置作为落点。
 *
 * 配置 `glacier`（冰山式）由 resolve 改时序、由公式改份量／弧线／半径，提交后才触碰世界。
 */
namespace PokemonSkills {
    const mountaingaleScene = "world_combat:move_mountaingale";
    const mountaingaleFlinchEffect = "world_combat:mountaingale_flinch";
    const mountaingaleFlinchText = "world_combat.move.mountaingale.text.flinch";
    const mountaingaleHitText = "world_combat.move.mountaingale.text.hit";
    const mountaingaleMissText = "world_combat.move.mountaingale.text.miss";

    function mountaingaleFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, mountaingaleFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 从 from 指向 to 的水平／空间单位向量；两点重合时退回瞄准方向。 */
    function mountaingaleHeading(from: CombatPoint, to: CombatPoint, fallback: CombatPoint): CombatPoint {
        var delta = to.minus(from);
        return delta.length() < 0.01 ? fallback : delta.unit();
    }

    /** 空气中、剩余路程内的第一处方块接触；水、未知区块或到程无碰撞时不显示落点。 */
    function mountaingaleForecast(world: CombatWorld, origin: CombatPoint, velocity: CombatPoint, gravity: number,
        range: number, lifetime: number): CombatImpact | null {
        if (!(range > 0) || !(lifetime > 0)) return null;
        const points = LivingActions.ballisticPath(origin, velocity, gravity, lifetime);
        let travelled = 0;
        for (let i = 1; i < points.length; i++) {
            const delta = points[i].minus(points[i - 1]), steps = Math.max(1, Math.ceil(delta.length() / .2));
            const hit = world.clipBlocks(points[i - 1], points[i]);
            if (hit === null) return null;
            const end = hit.blocked() ? hit.position() : points[i];
            for (let j = 0; j <= steps; j++) {
                const fluid = world.fluid(points[i - 1].plus(end.minus(points[i - 1]).scale(j / steps)));
                if (fluid === null || !fluid.empty()) return null;
            }
            if (hit.blocked()) return hit;
            travelled += delta.length();
            // 原生先处理整刻接触，再检查总路程预算。
            if (travelled >= range) return null;
        }
        return null;
    }

    function mountaingaleLaunch(action: CombatAction) {
        const world = action.sense(), body = world.observe(action.actor());
        const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * .6, 0));
        const aimed = action.targetPosition(), speed = p("mountaingale", "flightSpeed", action);
        const gravity = p("mountaingale", "arcFall", action);
        const direction = LivingActions.ballistic(origin, aimed, speed, gravity)
            || mountaingaleHeading(origin, aimed, action.direction());
        return { origin: origin, velocity: direction.scale(speed), direction: direction, speed: speed,
            gravity: gravity, range: Math.max(9, aimed.minus(origin).length() + 4) };
    }

    function mountaingaleWarning(action: CombatAction, scenes: WorldFeedback.ActionScenes, hit: CombatImpact | null, key = "warning"): void {
        if (hit === null) { scenes.stop(action, key); return; }
        const at = hit.position();
        scenes.show(action, key, at, { moment: hit.blockFace() === "up" ? "warning" : "contact",
            radius: p("mountaingale", "shatterRadius", action), point: [at.x(), at.y(), at.z()] });
    }

    /**
     * 落点结出冰面、中心竖起一小簇冰锥；地面与冰锥各自租借，到期原方块回来。
     * 地形逐格交由原生 `terrainResult` 裁决（bestEffort）：被保护／无支撑／已有活体占据的格子跳过，
     * 只返回真正放下的冰锥位置供表现点亮。未落地时调用方不会走到这里。
     */
    function mountaingaleIce(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, spikeHeight: number): number[][] {
        var patch: any[] = [], spikes: any[] = [], r = Math.ceil(radius);
        var px = point.x(), py = point.y(), pz = point.z(), core = Math.max(0.7, radius * 0.35);
        for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
            var distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            var x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (var dy = 0; dy >= -3; dy--) {
                var y = Math.floor(py) + dy;
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                var surface = distance <= core ? "minecraft:packed_ice" : "minecraft:ice";
                if (id !== surface) patch.push({ x: x, y: y, z: z, block: surface });
                if (distance <= core && spikeHeight >= 1) {
                    for (var k = 1; k <= spikeHeight; k++) {
                        var up = world.block(WorldCombat.point(x, y + k, z));
                        if (up === null) break;
                        var uid = String(up.id());
                        if (uid !== "minecraft:air" && uid !== "minecraft:cave_air" && uid !== "minecraft:void_air"
                            && uid !== "minecraft:short_grass" && uid !== "minecraft:tall_grass") break;
                        spikes.push({ x: x, y: y + k, z: z, block: "minecraft:packed_ice" });
                    }
                }
                break;
            }
        }
        if (patch.length) { try { world.terrain(JSON.stringify({ cells: patch, replace: true, linger: true, bestEffort: true }), ticks); } catch (error) { } }
        var placedSpikes: number[][] = [];
        if (spikes.length) {
            try {
                // 逐格交由原生裁决：被保护、无支撑或已有活体占据的格子跳过，只亮真正放下的冰锥。
                var result = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: spikes, replace: true, linger: true, bestEffort: true, ground: true }), ticks)));
                var placed: any[] = result && result.placed ? result.placed : [];
                for (var i = 0; i < placed.length; i++)
                    placedSpikes.push([placed[i][0], placed[i][1], placed[i][2]]);
            } catch (error) { }
        }
        return placedSpikes;
    }

    define({
        id: "mountaingale",
        cooldownParameter: "recharge",
        name: "Mountain Gale",
        description: "拔出冰山般的巨冰、抡起来沿低弧线砸向点选的落点：正面命中的吃满一记重击，落点一圈里的其他敌人被碎冰扫到，地面结冰并在中心竖起一簇冰锥。飞行慢、看得见、能侧身躲，起手也最长；没砸到东西巨冰只会消散，不会在旧落点补炸。",
        uses: ["远距离砸出一记高额的单体伤害", "用爆开的碎冰扫到挤在落点的一圈敌人", "在落点竖起一小段冰锥当掩体"],
        kind: "point",
        range: 12,
        maxRange: 18,
        prepare: 16,
        active: 30,
        recover: 12,
        cooldown: 60,
        style: "ice",
        defaults: { glacier: false, ai: { maxChase: 15, opening: "fresh" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("mountaingale", "shatterRadius", pokemon), geometry: "area", style: "ice",
                color: 0x9FD8E8, label: config && config.glacier === true ? "冰山式" : "碎冰式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["mountaingale"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("mountaingale", "tempo", context)),
                recover: Math.round(p("mountaingale", "aftercast", context)),
                cooldown: Math.round(p("mountaingale", "recharge", context)),
                active: skills["mountaingale"].active,
                range: p("mountaingale", "throwRange", context)
            };
        },
        windup: function (action, config, prepare) {
            var aimed = action.targetPosition();
            action.present("mountaingale:hoist", mountaingaleScene, 1, action.origin(),
                JSON.stringify({ moment: "hoist", glacier: config && config.glacier === true,
                    point: [aimed.x(), aimed.y(), aimed.z()] }));
            const scenes = WorldFeedback.actionScenes(mountaingaleScene, 1);
            function preview(current: CombatAction): void {
                const plan = mountaingaleLaunch(current);
                mountaingaleWarning(current, scenes, mountaingaleForecast(current.sense(), plan.origin,
                    plan.velocity, plan.gravity, plan.range, 200), "prepare-warning");
            }
            preview(action);
            function update(current: CombatAction): void {
                if (!LivingActions.preparing(current.sense(), current.actor()).some(clock => clock.instance === current.id())) {
                    scenes.stop(current); return;
                }
                preview(current);
                current.after(1, update);
            }
            action.after(1, update);
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const plan = mountaingaleLaunch(action), origin = plan.origin, speed = plan.speed, gravity = plan.gravity;
            const radius = p("mountaingale", "collisionRadius", action);
            const mass = p("mountaingale", "mass", action);
            const splash = p("mountaingale", "splash", action);
            const blast = p("mountaingale", "shatterRadius", action);
            const shove = p("mountaingale", "shove", action);
            const chance = p("mountaingale", "flinchChance", action);
            const flinchTicks = Math.round(p("mountaingale", "flinchTicks", action));
            const iceTicks = Math.max(40, Math.round(p("mountaingale", "iceTicks", action)));
            const spikeHeight = Math.max(0, Math.round(p("mountaingale", "spikeHeight", action)));
            const aimed = action.targetPosition();
            const flightRange = plan.range;
            const scale = blast / 2.2;
            const intensity = Math.max(0.6, Math.min(2.4, mass / 100));
            const scenes = WorldFeedback.actionScenes(mountaingaleScene, 1);
            let settled = false, struck = 0, flight = "";
            const born = world.tick();

            sound(action, "minecraft:entity.snowball.throw");

            /** 只在实际碰撞点结算：正面目标吃满 mass，一圈里的其他敌人吃 splash；落点结冰竖锥，实际冰锥位置才亮。 */
            function shatter(current: CombatAction, at: CombatPoint, direct: CombatActor | null, hit: CombatImpact | null): void {
                if (settled) return;
                settled = true;
                scenes.stop(current);
                const scope = current.world();
                const directRef = direct === null ? "" : String(direct.ref());
                if (direct !== null && scope.valid(direct)) {
                    const landed = hit !== null ? impact(current, hit, "mountaingale", mass, { damage: damageSpec("mountaingale", "mass") })
                        : hurt(current, direct, "mountaingale", mass, { damage: damageSpec("mountaingale", "mass") });
                    if (landed) {
                        struck++;
                        // 受击推退走 hitDisplace：原生抗击退、击退事件与碰撞限制参与结算。
                        if (scope.valid(direct)) scope.hitDisplace(direct, mountaingaleHeading(origin, at, current.direction()).scale(shove));
                        WorldFeedback.emit(scope, mountaingaleScene, 1, at,
                            { moment: "hit", target: directRef, scale: scale, intensity: intensity, hits: Math.round(16 + mass * 0.14) }, 28);
                        if (scope.random() < chance && mountaingaleFlinch(scope, direct, flinchTicks)) {
                            WorldFeedback.emit(scope, mountaingaleScene, 1, at, { moment: "stagger", target: directRef }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), mountaingaleFlinchText, [], 24);
                        }
                    }
                }
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, blast, { below: 2, above: 4 }), function (enemy, facts) {
                    if (String(enemy.ref()) === directRef) return;
                    if (!scope.clear(at, facts.position())) return;
                    if (!hurt(current, enemy, "mountaingale", splash, { damage: damageSpec("mountaingale", "splash") })) return;
                    struck++;
                    WorldFeedback.emit(scope, mountaingaleScene, 1, facts.position(),
                        { moment: "splash", target: String(enemy.ref()), scale: blast / 2.2, intensity: Math.max(0.4, Math.min(2, splash / 45)) }, 22);
                });
                const spikes = mountaingaleIce(scope, at, Math.min(3.2, blast), iceTicks, spikeHeight);
                WorldFeedback.emit(scope, mountaingaleScene, 1, at, { moment: "shatter", scale: scale, radius: blast, intensity: intensity }, 30);
                // 只有原生真正放下的冰锥位置才亮起，逐个按实际格子发光。
                for (let i = 0; i < Math.min(spikes.length, 24); i++) {
                    WorldFeedback.emit(scope, mountaingaleScene, 1, at,
                        { moment: "spike", point: spikes[i], scale: Math.max(0.6, Math.min(1.6, spikeHeight / 2)) }, 42);
                }
                sound(current, "cobblemon:impact.ice");
                sound(current, "minecraft:block.glass.break");
                sound(current, "minecraft:block.powder_snow.break");
                if (struck === 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), mountaingaleMissText, [], 22);
                else WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), mountaingaleHitText, [struck], 24);
                done(current);
            }

            /** 飞行结束、什么都没撞到：巨冰原地消散，不在旧落点补炸也不造冰。 */
            function disperse(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.stop(current);
                const scope = current.world();
                const end = scope.projectilePosition(flight);
                if (end !== null) {
                    WorldFeedback.emit(scope, mountaingaleScene, 1, end, { moment: "miss", scale: scale, intensity: intensity }, 20);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), mountaingaleMissText, [], 22);
                }
                sound(current, "minecraft:block.powder_snow.fall");
                done(current);
            }

            flight = LivingActions.projectile(action, {
                speed: speed, range: flightRange, radius: radius, gravity: gravity, origin: origin,
                direction: plan.direction, lifetime: 200,
                appearance: { item: "minecraft:packed_ice", scale: Math.max(1.4, radius * 2.4) },
                impact: function (current, hit) {
                    const at = hit.position(), victim = hit.target();
                    if (victim !== null && current.world().valid(victim) && !current.world().friendly(victim)) shatter(current, at, victim, hit);
                    else shatter(current, at, null, null);
                }
            }, function (current) { disperse(current); });
            scenes.show(action, "throw", origin,
                { moment: "throw", projectile: flight, scale: scale, intensity: intensity,
                    rise: Math.max(1, Math.round(mass / 40)) });
            mountaingaleWarning(action, scenes, mountaingaleForecast(world, origin, plan.velocity, gravity, flightRange, 200));
            function updateFlight(current: CombatAction): void {
                if (settled) return;
                const scope = current.world(), at = scope.projectilePosition(flight);
                const shots: CombatProjectileFacts[] = at === null ? [] : JSON.parse(scope.projectiles(at, 1));
                const shot = shots.filter(candidate => candidate.id === flight)[0];
                let travelled = 0;
                if (shot) shot.path.forEach(segment => {
                    travelled += WorldCombat.point(segment.to[0], segment.to[1], segment.to[2])
                        .minus(WorldCombat.point(segment.from[0], segment.from[1], segment.from[2])).length();
                });
                mountaingaleWarning(current, scenes, at === null || !shot ? null : mountaingaleForecast(scope, at,
                    WorldCombat.point(shot.velocity[0], shot.velocity[1], shot.velocity[2]), gravity,
                    flightRange - travelled, 200 - (scope.tick() - born)));
                current.after(1, updateFlight);
            }
            action.after(1, updateFlight);
        }
    });

}
