/**
 * 冰息 / frostbreath —— 注册与动作。
 *
 * 核心念头：一口漫过全身的冷气。单点命中护得住要害，一片罩住全身的冷雾护不住，所以每一口都打在薄弱处
 *   （必定击中要害）；雾到之前看得见，走出雾外就躲开了（原生命中 90）。
 *
 * 两幕：
 *   起（windup，提交前）：深吸一口气、嘴边凝起白霜，只播预告。
 *   呼（advance → touch → burst，提交后）：冷雾的当前前沿从固定源点按 `cloudSpeed` 每刻推进一口雾带，雾带由
 *       `origin` 与 `spread`/`reach` 计算的同一组扇环顶点同时驱动判定与表现。每个非友方在小腿高度身体箱第一次
 *       与某口雾带相交时被触及一次：各按 `breath` 结算一次**必定要害**的冰属性特殊伤害、冻僵 `chillTicks`；
 *       每个被罩住的脚下结霜（租借，linger，到期原方块回来），总格数受 `frost` 预算约束。走到呼程末端即停，
 *       余雾散去。原生拒绝这次伤害时那一口既不上冻僵、也不留霜，也不发成功提示。
 *
 * 与同族／近邻分开：极光束是一条细快的直线光（点名最前一个、压攻击、留霜斑）；冰息是一片宽而慢、逐刻推进的
 *   扇形冷雾（罩住一片、必暴、冻僵、留霜）；冰砾是一枚瞬发物理碎冰；冰冻光束是贯穿一条线。雾带形状本身就是判定区，
 *   表现用同一组扇环顶点画出（path + polygon）。
 *
 * 选取 `kind: "aim"`：可朝任意方向或世界点呼出，也能点任意阵营实体；提交后方向锁死，冷雾沿这条方向推进。
 *   目标是空、离场或空呼都不提前结束——照样把这一口呼完，雾在真实到达的位置散去、不留霜。攻击许可仍由命中层按
 *   敌我关系判断；墙后的对象被 `world.clear` 排除（墙替它挡住冷雾），阵前站着的人才吃这一口。
 */
namespace PokemonSkills {
    /** 在落点地表上方空格结出一层霜，租约到期清去薄雪；返回实际铺出的格数。 */
    function frostbreathRime(world: CombatWorld, point: CombatPoint, cells: number, ticks: number): number {
        const list: any[] = [];
        const limit = Math.max(4, Math.round(cells));
        const baseY = Math.floor(point.y()), centreX = Math.floor(point.x()), centreZ = Math.floor(point.z());
        for (let dx = -2; dx <= 2 && list.length < limit; dx++) {
            for (let dz = -2; dz <= 2 && list.length < limit; dz++) {
                if (dx * dx + dz * dz > 5) continue;
                const x = centreX + dx, z = centreZ + dz;
                for (let dy = 1; dy >= -3; dy--) {
                    const y = baseY + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    const at = WorldCombat.point(x, y + 1, z), above = world.block(at);
                    const over = above === null ? "" : String(above.id());
                    if ((over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                        && world.canSurvive(at, "minecraft:snow"))
                        list.push({ x: x, y: y + 1, z: z, block: "minecraft:snow", expectedState: above!.state() });
                    break;
                }
            }
        }
        if (!list.length) return 0;
        try {
            return JSON.parse(world.terrainResult(JSON.stringify({ cells: list, linger: true, bestEffort: true }),
                Math.max(40, Math.round(ticks)))).placed.length;
        }
        catch (error) { return 0; }
    }

    /**
     * 当前推进雾带的顶点（判定与表现共用）：从 `inner` 到 `outer`、张角 `spread` 的扇环；
     * `inner` 为 0 时是一条从源点起的扇形。所有顶点在同一高度 `y`。
     */
    function frostbreathBand(origin: CombatPoint, heading: CombatPoint, inner: number, outer: number, spread: number, y: number): CombatPoint[] {
        const half = spread * Math.PI / 360, yaw = Math.atan2(heading.z(), heading.x()), steps = 6, points: CombatPoint[] = [];
        function at(angle: number, radius: number): CombatPoint {
            return WorldCombat.point(origin.x() + Math.cos(angle) * radius, y, origin.z() + Math.sin(angle) * radius);
        }
        if (inner > 0.05) {
            for (let i = 0; i <= steps; i++) points.push(at(yaw - half + (i / steps) * 2 * half, outer));
            for (let i = steps; i >= 0; i--) points.push(at(yaw - half + (i / steps) * 2 * half, inner));
        } else {
            points.push(WorldCombat.point(origin.x(), y, origin.z()));
            for (let i = 0; i <= steps; i++) points.push(at(yaw - half + (i / steps) * 2 * half, outer));
        }
        return points;
    }

    /** 水平朝向：瞄准目标，没有目标就朝面前。 */
    function frostbreathHeading(action: CombatAction): CombatPoint {
        const delta = action.targetPosition().minus(action.origin());
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        if (flat.length() >= 1e-6) return flat.unit();
        const facing = action.direction();
        const alt = WorldCombat.point(facing.x(), 0, facing.z());
        return alt.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : alt.unit();
    }

    define({
        id: frostbreathId,
        cooldownParameter: "recharge",
        name: "Frost Breath",
        description: "呼出一片宽而慢的冷雾：罩住的敌人各吃一记必定击中要害的冰属性特殊伤害并被冻僵，落点结出一层霜。广呼罩得更宽；细呼更快更远更重。",
        uses: ["罩住挤在一起的一片敌人", "用必定要害的冷雾压低一群目标", "在窄口铺一片冻得发僵的霜"],
        kind: "aim",
        range: 8,
        maxRange: 12,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "frost",
        defaults: { wide: false, ai: { maxChase: 14, cluster: true, finish: true, advantage: true } },
        fields: [flag("wide", "广呼")],
        indicator: function (config, pokemon) {
            return { radius: p(frostbreathId, "reach", pokemon), geometry: "cone", style: "frost", color: 0xCFEAF8,
                label: config && config.wide === true ? "冰息·广呼" : "冰息·细呼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[frostbreathId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(frostbreathId, "tempo", context)),
                recover: Math.round(p(frostbreathId, "aftercast", context)),
                cooldown: Math.round(p(frostbreathId, "recharge", context)),
                active: 0,
                range: p(frostbreathId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("frostbreath:inhale", frostbreathScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", windup: prepare, wide: !!(config && config.wide) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(frostbreathId, "breath", action);
            const reach = Math.max(4, p(frostbreathId, "reach", action));
            const spread = Math.max(30, Math.min(150, p(frostbreathId, "spread", action)));
            const speed = Math.max(0.2, p(frostbreathId, "cloudSpeed", action));
            const radius = Math.max(0.5, p(frostbreathId, "radius", action));
            const frost = Math.max(4, Math.round(p(frostbreathId, "frost", action)));
            const frostTicks = Math.max(40, Math.round(p(frostbreathId, "frostTicks", action)));
            const chillTicks = Math.max(20, Math.round(p(frostbreathId, "chillTicks", action)));
            const motes = Math.max(12, Math.round(p(frostbreathId, "motes", action)));
            const heading = frostbreathHeading(action);
            const size = Math.max(0.08, radius * 0.16);
            const intensity = Math.max(0.5, Math.min(2.2, power / 58));
            // 每刻推进的一口雾带；判定与表现共用这组顶点。
            const bandDepth = Math.max(0.6, speed * 2);
            const scenes = WorldFeedback.actionScenes(frostbreathScene);
            const touched: { [ref: string]: boolean } = {};
            let distance = 0, hits = 0, rimeBudget = frost, settled = false;

            function frontAt(at: number): CombatPoint {
                return WorldCombat.point(origin.x() + heading.x() * at, origin.y(), origin.z() + heading.z() * at);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), end = frontAt(reach);
                scenes.stop(current, "front");
                scope.sound("minecraft:entity.player.hurt_freeze", end, 16, "{}");
                if (hits > 0) {
                    WorldFeedback.emit(scope, frostbreathScene, 1, end,
                        { moment: "burst", motes: motes, size: size * 1.4, hits: hits, intensity: intensity }, 26);
                } else {
                    // 空呼：冷雾在真实呼程末端散去，不在任何地方留霜。
                    WorldFeedback.emit(scope, frostbreathScene, 1, end, { moment: "miss", motes: motes, size: size, reach: reach }, 22);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), frostbreathMissText, [], 22);
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                distance = Math.min(reach, distance + speed);
                const front = frontAt(distance), inner = Math.max(0, distance - bandDepth);
                const vertices = frostbreathBand(origin, heading, inner, distance, spread, origin.y());
                scenes.show(current, "front", front,
                    { moment: "front", path: vertices.map(function (point) { return [point.x(), point.y(), point.z()]; }),
                        direction: [heading.x(), 0, heading.z()], halfAngle: spread / 2, radius: radius,
                        length: Math.max(0.6, speed), motes: motes, size: size, progress: distance / reach });
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon(vertices, origin.y() - 2.5, origin.y() + 3),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (touched[ref] || scope.friendly(enemy)) return;
                        const at = facts.position();
                        // 墙替它挡住冷雾：中间隔着实墙的对象不算被罩住。
                        if (!scope.clear(origin, at)) return;
                        touched[ref] = true;
                        // 原生拒绝这次伤害时不发成功提示、不上冻僵，也不留霜。
                        if (!hurt(current, enemy, frostbreathId, power, { damage: damageSpec(frostbreathId, "breath"), critical: true })) return;
                        hits++;
                        CombatStatus.apply(scope, enemy, "chill", frostbreathChillEffect, chillTicks, 0, { unique: true });
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), frostbreathChillText, [], 24);
                        WorldFeedback.emit(scope, frostbreathScene, 1, at,
                            { moment: "hit", target: ref, motes: motes, size: size * 1.3, intensity: intensity }, 24);
                        if (rimeBudget > 0) {
                            const share = Math.max(3, Math.round(frost / 2));
                            const cells = frostbreathRime(scope, at, Math.min(rimeBudget, share), frostTicks);
                            if (cells > 0) {
                                rimeBudget -= cells;
                                WorldFeedback.emit(scope, frostbreathScene, 1, at, { moment: "rime", cells: cells, size: size * 0.8 }, 28);
                            }
                        }
                    });
                if (distance >= reach - 1e-6) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.powder_snow.break");
            advance(action);
        }
    });
}
