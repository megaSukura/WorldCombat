/**
 * 强力鞭打 / powerwhip 的出手方式。
 *
 * 核心念头：把青藤或触手盘起、探高，再激烈地甩出一道横扫——弧面扫过的那块扇形就是被打到的范围，
 * 站在弧面里的人和物一起挨这一记，被推得散开。它是本族里**够得最远、覆盖最宽**的一招：起手重、冷却久，
 * 但一道弧面就能把身前一片清干净。
 *
 * 两幕（提交前只播预告）：
 *   起（coil）：青藤自脚边盘起、叶屑向臂弯收拢，只播预告。
 *   扫（sweep → hit / miss）：提交后甩出弧面；`WorldGeometry.sector` 圈出扇形里的非友方，
 *       逐名结算 `lash` 接触伤害并沿离心方向推开 shove 格。弧面里一个人都没有就播落空。
 *
 * 与同族分开：藤鞭是短而快的单线一抽、缠绕是贴身绞缠减速、百万吨重踢是直线单体踢飞；
 * 强力鞭打凭「一道远而宽的横扫弧面」认出来。配置 extend 由 resolve 改射程、由公式改弧度与威力。
 * 提交后才触碰世界。
 */
namespace PokemonSkills {
    const powerwhipScene = "world_combat:move_powerwhip";
    const powerwhipHitText = "world_combat.move.powerwhip.text.hit";
    const powerwhipMissText = "world_combat.move.powerwhip.text.miss";

    define({
        id: "powerwhip",
        name: "Power Whip",
        description: "The user violently whirls its vines, tentacles, or the like to lash the target.",
        uses: ["一道横扫清空身前一片", "隔着中距离先手扫开成群的对手", "被围住时原地整圈甩开"],
        kind: "enemy",
        range: 4.7,
        maxRange: 6.8,
        prepare: 14,
        active: 22,
        recover: 12,
        cooldown: 42,
        style: "lash",
        defaults: { extend: true, ai: { maxChase: 9, preferGroups: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("powerwhip", "reach", pokemon), geometry: "area", style: "lash",
                color: 0x6FA83C, label: config && config.extend === false ? "强力鞭打·旋身式" : "强力鞭打" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powerwhip"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const extend = !(config && config.extend === false);
            return {
                prepare: Math.round(p("powerwhip", "tempo", context)),
                recover: Math.round(p("powerwhip", "aftercast", context)),
                cooldown: Math.round(p("powerwhip", "recharge", context)),
                active: skills["powerwhip"].active,
                range: p("powerwhip", "reach", context) + (extend ? 0.4 : 0.2)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_powerwhip:coil", powerwhipScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", extend: config && config.extend === false ? 0 : 1, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("powerwhip", "reach", action);
            const arc = p("powerwhip", "arc", action);
            const power = p("powerwhip", "lash", action);
            const shove = p("powerwhip", "shove", action);
            const leaves = Math.max(10, Math.round(p("powerwhip", "leaves", action)));
            const maxTargets = Math.max(1, Math.round(p("powerwhip", "maxTargets", action)));
            const extend = !(config && config.extend === false);
            const scale = reach / 4.6;
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const lashY = origin.y();
            // 与判定同一组顶点：弧面填出的扇形就是被打到的范围。整圈时用闭合的圆环轮廓。
            const ring = arc >= 350;
            const steps = ring ? 28 : 12;
            const path: number[][] = [];
            if (!ring) path.push([origin.x(), lashY, origin.z()]);
            let hx = direction.x(), hz = direction.z();
            const flat = Math.sqrt(hx * hx + hz * hz);
            if (flat < 1e-6) { hx = 0; hz = 1; } else { hx /= flat; hz /= flat; }
            for (let i = 0; i <= steps; i++) {
                const a = (ring ? i / steps : i / steps - 0.5) * arc * Math.PI / 180;
                const dx = hx * Math.cos(a) - hz * Math.sin(a), dz = hx * Math.sin(a) + hz * Math.cos(a);
                path.push([origin.x() + dx * reach, lashY, origin.z() + dz * reach]);
            }

            sound(action, extend ? "cobblemon:move.razorleaf.actor_1" : "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, powerwhipScene, 1, origin,
                { moment: "sweep", path: path, arc: arc, reach: reach, leaves: leaves, scale: scale,
                    intensity: intensity, extend: extend ? 1 : 0 }, 24);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, reach, arc, { below: 2.0, above: 1.8 }),
                function (target, facts) {
                    if (hits >= maxTargets) return;
                    const landed = hurt(action, target, "powerwhip", power, { damage: damageSpec("powerwhip", "lash"), contact: true });
                    if (!landed) return;
                    hits++;
                    if (world.valid(target)) {
                        const away = facts.position().minus(origin);
                        world.displace(target, (away.length() < 0.05 ? direction : away).unit().scale(shove));
                    }
                    WorldFeedback.emit(world, powerwhipScene, 1, facts.position(),
                        { moment: "hit", target: String(target.ref()), leaves: leaves, scale: scale, intensity: intensity }, 24);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), powerwhipHitText, [], 22);
                });

            if (hits === 0) {
                WorldFeedback.emit(world, powerwhipScene, 1, origin, { moment: "miss", leaves: Math.round(leaves * 0.6), scale: scale }, 20);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), powerwhipMissText, [], 22);
            }
            sound(action, hits > 0 ? "cobblemon:impact.grass" : "minecraft:entity.player.attack.weak");
            done(action);
        }
    });
}
