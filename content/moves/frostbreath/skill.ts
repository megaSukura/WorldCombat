/**
 * 冰息 / frostbreath —— 注册与动作。
 *
 * 核心念头：一口漫过全身的冷气。单点命中护得住要害，一片罩住全身的冷雾护不住，所以每一口都打在薄弱处
 *   （必定击中要害）；雾到之前看得见，走出雾外就躲开了（原生命中 90）。
 *
 * 两幕：
 *   起（windup，提交前）：深吸一口气、嘴边凝起白霜，只播预告。
 *   呼（exhale → burst，提交后）：冷雾从口中铺出，按 `cloudSpeed` 用 `reach / cloudSpeed` 刻漫到呼程末端；
 *       到点后罩住扇形内的每个敌人，各按 `breath` 结算一次**必定要害**的冰属性特殊伤害、冻僵 `chillTicks`、
 *       并在各自脚下结出一层霜（租借，linger，到期原方块回来）。一个也没罩到就只留一层薄霜与浮字。
 *
 * 与同族／近邻分开：极光束是一条细快的直线光（点名最前一个、压攻击、留霜斑）；冰息是一片宽而慢的扇形冷雾
 *   （罩住一片、必暴、冻僵、留霜）；冰砾是一枚瞬发物理碎冰；冰冻光束是贯穿一条线。冷雾的形状本身就是判定区，
 *   表现用同一组扇形顶点画出（path + polygon）。
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
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "frost",
        defaults: { wide: false, ai: { maxChase: 14, cluster: true, finish: true } },
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
            const half = spread * Math.PI / 360;
            const yaw = Math.atan2(heading.z(), heading.x());
            const delay = Math.max(6, Math.min(30, Math.round(reach / speed)));
            const size = Math.max(0.08, radius * 0.16);
            const intensity = Math.max(0.5, Math.min(2.2, power / 58));

            // 判定与表现读同一组扇形顶点：扇心 + 弧上若干顶点。
            const path: number[][] = [[origin.x(), origin.y(), origin.z()]];
            const segment = 12;
            for (let step = 0; step <= segment; step++) {
                const angle = yaw - half + (step / segment) * 2 * half;
                path.push([origin.x() + Math.cos(angle) * reach, origin.y() + 0.12, origin.z() + Math.sin(angle) * reach]);
            }

            sound(action, "minecraft:block.powder_snow.break");
            WorldFeedback.emit(world, frostbreathScene, 1, origin,
                { moment: "exhale", path: path, direction: [heading.x(), 0, heading.z()], reach: reach,
                    halfAngle: spread / 2, radius: radius, motes: motes, size: size, delay: delay, intensity: intensity }, delay + 40);

            let settled = false;
            action.after(delay, function (current) {
                const scope = current.world();
                const region = WorldGeometry.sector(origin, heading, reach, spread, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    hits++;
                    const landed = hurt(current, enemy, frostbreathId, power,
                        { damage: damageSpec(frostbreathId, "breath"), critical: true });
                    const at = facts.position();
                    WorldFeedback.emit(scope, frostbreathScene, 1, at,
                        { moment: "hit", target: String(enemy.ref()), motes: motes, size: size * 1.3, intensity: intensity }, 24);
                    if (landed) {
                        CombatStatus.apply(scope, enemy, "chill", frostbreathChillEffect, chillTicks, 0, { unique: true });
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), frostbreathChillText, [], 24);
                    }
                    const cells = frostbreathRime(scope, at, frost, frostTicks);
                    if (cells > 0)
                        WorldFeedback.emit(scope, frostbreathScene, 1, at, { moment: "rime", cells: cells, size: size * 0.8 }, 28);
                });
                const far = origin.plus(heading.scale(reach));
                scope.sound("minecraft:entity.player.hurt_freeze", far, 16, "{}");
                WorldFeedback.emit(scope, frostbreathScene, 1, origin.plus(heading.scale(reach * 0.62)),
                    { moment: "burst", motes: motes, size: size * 1.5, hits: hits, intensity: intensity }, 26);
                if (hits === 0) {
                    const cells = frostbreathRime(scope, far, Math.max(4, Math.round(frost * 0.5)), frostTicks);
                    WorldFeedback.emit(scope, frostbreathScene, 1, far, { moment: "rime", cells: cells, size: size * 0.7 }, 24);
                    WorldFeedback.text(scope, far.plus(WorldCombat.point(0, 1.0, 0)), frostbreathMissText, [], 22);
                }
                if (!settled) { settled = true; done(current); }
            });
        }
    });
}
