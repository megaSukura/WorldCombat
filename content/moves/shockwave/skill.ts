/**
 * 电击波 / shockwave 的出手方式。
 *
 * 核心念头：一记比反应更快的电击——出手即到，不做随机命中检定，也不显示假的飞行过程。
 *
 * 两幕：
 *   起：指尖聚电（提交前 windup 预告）。
 *   击：提交后电流从脚下窜出。直击形态沿施法者到目标的直线一瞬折线；`ground`（地导）形态沿瞄准
 *       方向扫过身前贴地的一条窄走廊，命中沿途所有敌人，空扫也成立。首个拦路的身体或方块就是真实
 *       终点，path 按它绘制。目标湿身或天在下雨时，电沿水传导，威力抬高。
 *
 * 与同族分开：zingzap 是冲上去放电、thunder 是天上落雷，电击波是贴地疾行的电流走廊，湿处更狠。
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

    /** 地导走廊的四个地面角点（近左、远左、远右、近右），供 polygon／polyline 表现与判定同宽。 */
    function shockwaveCorners(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, length: number, halfWidth: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const far = origin.plus(heading.scale(length));
        function onGround(point: CombatPoint): number[] {
            const ground = WorldGeometry.ground(world, point, 3);
            return [ground.x(), ground.y() + 0.05, ground.z()];
        }
        return [onGround(origin.plus(side.scale(halfWidth))), onGround(far.plus(side.scale(halfWidth))),
            onGround(far.minus(side.scale(halfWidth))), onGround(origin.minus(side.scale(halfWidth)))];
    }

    define({
        id: "shockwave",
        name: "Shock Wave",
        description: "一记出手即到的电击，不做随机命中检定：直击沿直线闪到目标身上，地导形态则沿瞄准方向扫过身前贴地的一条走廊，空扫也成立；首个拦路的身体或方块就是终点。目标湿身或在雨里时电传导得更狠。",
        uses: ["出手即到的电击", "沿地面扫过一条走廊", "打湿身的目标"],
        kind: "aim",
        range: 10,
        maxRange: 14,
        prepare: 5,
        active: 20,
        recover: 8,
        cooldown: 28,
        style: "bolt",
        defaults: { ground: false, ai: { maxChase: 14, preferWet: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("shockwave", "collisionRadius", pokemon) * 1.4, geometry: "line", style: "electric", color: 0xFFF27A, label: "电击波" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["shockwave"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var ground = !!(config && config.ground);
            return {
                prepare: p("shockwave", "prepare", context) + (ground ? 2 : 0),
                recover: p("shockwave", "recover", context),
                cooldown: p("shockwave", "cooldown", context) + (ground ? 5 : 0),
                range: ground ? 13 : p("shockwave", "range", context)
            };
        },
        windup: function (action, config, prepare) {
            var ground = !!(config && config.ground);
            action.present("world_combat:move_shockwave:windup", shockwaveScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, ground: ground }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const ground = !!(config && config.ground);
            const segment = ground ? "surge" : "jolt";
            const power = p("shockwave", segment, action);
            const bonus = p("shockwave", "wetBonus", action);
            const jags = Math.max(3, Math.round(p("shockwave", "jags", action)));
            const corridor = p("shockwave", "corridor", action);
            const radius = p("shockwave", "collisionRadius", action);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const landing = targetBody !== null ? targetBody.position() : action.targetPosition();
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const flow = Math.round(50 + jags * 20);

            sound(action, "minecraft:block.beacon.activate");

            if (ground) {
                // 地导：沿瞄准方向扫一条贴地窄带；终点取实际瞄准点与射程的较小值，空扫也成立。
                const delta = landing.minus(origin), flat = WorldCombat.point(delta.x(), 0, delta.z());
                const heading = WorldGeometry.flatUnit(flat, action.direction());
                const length = Math.max(0.5, Math.min(action.range(), flat.length()));
                const lane = WorldGeometry.lane(origin, heading, length, corridor, { below: 2, above: 3 });
                WorldFeedback.emit(world, shockwaveScene, 1, origin,
                    { moment: "lane", path: shockwaveCorners(world, origin, heading, length, corridor),
                        corridor: corridor, reach: length, intensity: intensity, scale: radius / 0.5 }, 30);

                let hits = 0;
                WorldGeometry.selectEnemies(world, lane, function (enemy: CombatActor, facts: CombatObservation) {
                    const at = facts.position();
                    if (!world.clear(origin, at)) return;
                    const wet = facts.wet() || shockwaveRain(world, at);
                    hurt(action, enemy, "shockwave", wet ? power * (1 + bonus) : power, { damage: damageSpec("shockwave", "surge") });
                    hits++;
                    WorldFeedback.emit(world, shockwaveScene, 1, at,
                        { moment: "hit", target: String(enemy.ref()), intensity: intensity, wet: wet, notes: 18, scale: radius / 0.5 }, 22);
                    if (wet) WorldFeedback.emit(world, shockwaveScene, 1, at, { moment: "wet", scale: 1 }, 20);
                });
                world.sound("minecraft:entity.lightning_bolt.impact", landing, 16, "{}");
                if (hits === 0) WorldFeedback.emit(world, shockwaveScene, 1, landing, { moment: "miss", scale: 1 }, 20);
                WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.2, 0)), hits > 0 ? shockwaveHitText : shockwaveMissText,
                    hits > 0 ? [hits] : [], 26);
                done(action);
                return;
            }

            // 直击：一瞬折线，首个拦路的身体或方块就是真实终点，path 按它绘制。
            const probe = action.trace(origin, landing, radius, false);
            const endpoint = probe.position();
            WorldFeedback.emit(world, shockwaveScene, 1, origin,
                { moment: "bolt", path: shockwaveBolt(origin, endpoint, jags, world), flow: flow, jags: jags,
                    intensity: intensity, scale: radius / 0.5 }, 30);

            const struck = probe.hitEntity() ? probe.target() : null;
            if (struck !== null && world.valid(struck) && !world.friendly(struck)) {
                const struckBody = world.observe(struck);
                const at = struckBody === null ? endpoint : struckBody.position();
                const wet = struckBody !== null && (struckBody.wet() || shockwaveRain(world, at));
                hurt(action, struck, "shockwave", wet ? power * (1 + bonus) : power, { damage: damageSpec("shockwave", "jolt") });
                WorldFeedback.emit(world, shockwaveScene, 1, at,
                    { moment: "hit", target: String(struck.ref()), intensity: intensity, wet: wet, notes: 20, scale: radius / 0.5 }, 26);
                if (wet) WorldFeedback.emit(world, shockwaveScene, 1, at, { moment: "wet", scale: 1 }, 22);
                world.sound("minecraft:entity.lightning_bolt.impact", at, 16, "{}");
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), shockwaveHitText, [1], 26);
            } else {
                const blockPoint = probe.blocked() ? probe.blockPosition() : null;
                WorldFeedback.emit(world, shockwaveScene, 1, blockPoint === null ? endpoint : blockPoint,
                    { moment: "miss", scale: 1, face: probe.blocked() ? probe.blockFace() : "" }, 20);
                world.sound("minecraft:entity.lightning_bolt.impact", landing, 16, "{}");
                WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.2, 0)), shockwaveMissText, [], 26);
            }
            done(action);
        }
    });
}
