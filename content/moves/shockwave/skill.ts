/**
 * 电击波 / shockwave 的出手方式。
 *
 * 核心念头：一记比反应更快的电击——电流贴着地面窜到对手脚下，来不及躲，所以必定命中。
 *
 * 两幕：
 *   起：指尖聚电（提交前 windup 预告）。
 *   击：提交后电流从脚下窜出，沿折线扫向目标；ground 开时扫过身前的整条走廊，命中沿途所有敌人。
 *       目标湿身或天在下雨时，电沿水传导，威力抬高。
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

    define({
        id: "shockwave",
        name: "Shock Wave",
        description: "The user strikes the target with a quick jolt of electricity. This attack never misses.",
        uses: ["比反应更快的电击", "沿地面扫过一条走廊", "打湿身的目标"],
        kind: "enemy",
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
            const path = shockwaveBolt(origin, landing, jags, world);
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const flow = Math.round(50 + jags * 20);
            const primaryWet = targetBody !== null && (targetBody.wet() || shockwaveRain(world, landing));

            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, shockwaveScene, 1, origin,
                { moment: "bolt", path: path, flow: flow, jags: jags, intensity: intensity, scale: radius / 0.5,
                    ground: ground, wet: primaryWet, power: power }, 30);

            let hits = 0;
            if (ground) {
                const delta = landing.minus(origin), flat = WorldCombat.point(delta.x(), 0, delta.z());
                const length = Math.max(0.5, flat.length());
                const lane = WorldGeometry.lane(origin, flat, length, corridor, { below: 2, above: 3 });
                WorldGeometry.selectEnemies(world, lane, function (enemy: CombatActor, facts: CombatObservation) {
                    const wet = facts.wet() || shockwaveRain(world, facts.position());
                    hurt(action, enemy, "shockwave", wet ? power * (1 + bonus) : power, { damage: damageSpec("shockwave", "surge") });
                    hits++;
                    WorldFeedback.emit(world, shockwaveScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), intensity: intensity, wet: wet, notes: 18, scale: radius / 0.5 }, 22);
                    if (wet) WorldFeedback.emit(world, shockwaveScene, 1, facts.position(), { moment: "wet", scale: 1 }, 20);
                });
            } else if (targetBody !== null && target !== null) {
                const amount = primaryWet ? power * (1 + bonus) : power;
                hurt(action, target, "shockwave", amount, { damage: damageSpec("shockwave", "jolt") });
                hits = 1;
                WorldFeedback.emit(world, shockwaveScene, 1, landing,
                    { moment: "hit", target: String(target.ref()), intensity: intensity, wet: primaryWet, notes: 20, scale: radius / 0.5 }, 26);
                if (primaryWet) WorldFeedback.emit(world, shockwaveScene, 1, landing, { moment: "wet", scale: 1 }, 22);
            } else {
                WorldFeedback.emit(world, shockwaveScene, 1, landing, { moment: "miss", scale: 1 }, 20);
            }

            world.sound("minecraft:entity.lightning_bolt.impact", landing, 16, "{}");
            WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.2, 0)), hits > 0 ? shockwaveHitText : shockwaveMissText,
                hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
