/**
 * 电击波 / shockwave 的出手方式。
 *
 * 核心念头：一记比反应更快的电击——出手即到，不做随机命中检定，也不显示假的飞行过程。
 *
 * 两幕：
 *   起：指尖聚电（提交前 windup 预告）。
 *   击：提交后电流从脚下窜出，沿施法者到目标的直线一瞬折成一道闪电；首个拦路的身体或方块就是真实
 *       终点，path 按它绘制，空放也成立。目标湿身或天在下雨时，电沿水传导，威力抬高。
 *
 * 回执分层：只有真正造成伤害才报命中文字与命中火花；目标系免疫（`hurt` 返回 false）时报一道暗淡的
 *           抗性熄火；墙或空放报落空，末端落在真实接触点。
 *
 * 与同族分开：zingzap 是冲上去放电、thunder 是天上落雷，电击波是出手即到的一道直击。
 */
namespace PokemonSkills {
    const shockwaveScene = "world_combat:move_shockwave";
    const shockwaveHitText = "world_combat.move.shockwave.text.hit";
    const shockwaveMissText = "world_combat.move.shockwave.text.miss";

    /** 现场是否在下雨；雨水让电传导得更狠。 */
    function shockwaveRain(world: CombatWorld, point: CombatPoint): boolean {
        const env = WorldEnvironment.read(world, point);
        return !!env && typeof env.rain === "number" && env.rain > 0.2;
    }

    /** 施法者到落点的折线顶点；供判定与表现共用同一组世界坐标。 */
    function shockwaveBolt(origin: CombatPoint, landing: CombatPoint, jags: number, world: CombatWorld): number[][] {
        const delta = landing.minus(origin), length = delta.length();
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const jitter = Math.min(0.5, Math.max(0.1, length * 0.06));
        const points: number[][] = [[origin.x(), origin.y() + 0.1, origin.z()]];
        for (var index = 1; index < jags; index++) {
            const base = origin.plus(delta.scale(index / jags));
            const point = base.plus(side.scale((world.random() * 2 - 1) * jitter))
                .plus(WorldCombat.point(0, (world.random() * 2 - 1) * 0.25, 0));
            points.push([point.x(), point.y(), point.z()]);
        }
        points.push([landing.x(), landing.y() + 0.1, landing.z()]);
        return points;
    }

    define({
        id: "shockwave",
        name: "Shock Wave",
        description: "一记出手即到的电击，不做随机命中检定：电流沿施法者到目标的直线一瞬闪到身上，首个拦路的身体或方块就是真实终点，空放也成立。目标湿身或在雨里时电传导得更狠；免疫的目标不吃伤害，墙会截住电流。",
        uses: ["出手即到的电击", "打湿身或雨里的目标"],
        kind: "aim",
        range: 10,
        maxRange: 14,
        prepare: 5,
        active: 20,
        recover: 8,
        cooldown: 28,
        style: "bolt",
        defaults: { ai: { maxChase: 14, preferWet: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("shockwave", "collisionRadius", pokemon) * 1.4, geometry: "line", style: "electric", color: 0xFFF27A, label: "电击波" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shockwave:windup", shockwaveScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("shockwave", "jolt", action);
            const bonus = p("shockwave", "wetBonus", action);
            const jags = Math.max(3, Math.round(p("shockwave", "jags", action)));
            const radius = p("shockwave", "collisionRadius", action);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const landing = targetBody !== null ? targetBody.position() : action.targetPosition();
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const flow = Math.round(50 + jags * 20);

            sound(action, "minecraft:block.beacon.activate");

            // 直击：一瞬折线，首个拦路的身体或方块就是真实终点，path 按它绘制。
            const probe = action.trace(origin, landing, radius, false);
            const endpoint = probe.position();
            WorldFeedback.emit(world, shockwaveScene, 1, origin,
                { moment: "bolt", path: shockwaveBolt(origin, endpoint, jags, world), flow: flow, jags: jags,
                    intensity: intensity, scale: radius / 0.5 }, 14);

            const struck = probe.hitEntity() ? probe.target() : null;
            if (struck !== null && world.valid(struck) && !world.friendly(struck)) {
                const struckBody = world.observe(struck);
                const at = struckBody === null ? endpoint : struckBody.position();
                const wet = struckBody !== null && (struckBody.wet() || shockwaveRain(world, at));
                const applied = hurt(action, struck, "shockwave", wet ? power * (1 + bonus) : power, { damage: damageSpec("shockwave", "jolt") });
                if (applied) {
                    // 只有真正造成伤害才报命中：文字、火花、湿身水花与落地音效。
                    WorldFeedback.emit(world, shockwaveScene, 1, at,
                        { moment: "hit", target: String(struck.ref()), intensity: intensity, wet: wet, notes: 20, scale: radius / 0.5 }, 26);
                    if (wet) WorldFeedback.emit(world, shockwaveScene, 1, at, { moment: "wet", scale: 1 }, 22);
                    world.sound("minecraft:entity.lightning_bolt.impact", at, 16, "{}");
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), shockwaveHitText, [], 26);
                } else {
                    // 免疫或原生命中拒绝：不报命中，只在真实接触点留一道熄火。共享免疫回执已浮出“免疫”字样。
                    WorldFeedback.emit(world, shockwaveScene, 1, at, { moment: "resist", scale: 1 }, 18);
                }
            } else {
                // 墙或空放：末端落在真实接触点，贴墙给出朝向。
                WorldFeedback.emit(world, shockwaveScene, 1, endpoint,
                    { moment: "miss", scale: 1, face: probe.blocked() ? probe.blockFace() : "" }, 20);
                world.sound("minecraft:entity.lightning_bolt.impact", landing, 16, "{}");
                WorldFeedback.text(world, endpoint.plus(WorldCombat.point(0, 1.2, 0)), shockwaveMissText, [], 26);
            }
            done(action);
        }
    });
}
