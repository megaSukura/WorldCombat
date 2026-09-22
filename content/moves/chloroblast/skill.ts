/**
 * 叶绿爆震 / chloroblast 的出手方式。
 *
 * 核心念头：**把全身积蓄的叶绿素一次放尽**——从全身收进核心，再沿准线喷成一整片扇形，越近越重、越远越轻；
 * 放完之后施法者的叶绿素被抽空，按**放出去的力量**损失生命。罩得多、但每一下按距离打折。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：叶绿素从四肢向核心汇聚、身体透出青绿的光，只播预告，此时代价未结清。
 *   放（release → hit）：提交后一片叶绿爆流沿准线铺成扇形（`WorldGeometry.sector`，与表现同一组顶点），
 *       扇形里的每个非友方各挨一次 `bloom` 伤害，按到中心的距离衰减 `falloff`。
 *   枯（wither）：叶绿素放尽后施法者透出的光暗下去，按最大生命 ×`cost` 扣血（浮字提示），只剩枯色余屑。
 *
 * 与同族分开：铁蹄光线重而短、只打第一个；破灭之光粗重贯穿、自损随伤害；随机光没有自损。
 * 叶绿爆震是唯一**覆盖面**、也是唯一自损随放出的力量走的一招。
 */
namespace PokemonSkills {
    /** 以 origin 为顶点、朝 direction 张开 angleDeg 度、半径 reach 的扇形多边形；判定与表现共用这组顶点。 */
    function chloroblastFan(origin: CombatPoint, direction: CombatPoint, reach: number, angleDeg: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const base = Math.atan2(heading.z(), heading.x());
        const half = angleDeg * Math.PI / 360;
        const points: CombatPoint[] = [origin];
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + (2 * half) * (i / steps);
            points.push(origin.plus(WorldCombat.point(Math.cos(angle) * reach, 0, Math.sin(angle) * reach)));
        }
        return points;
    }

    define({
        id: chloroblastId,
        name: "Chloroblast",
        description: "The user launches its amassed chlorophyll to inflict damage on the target. This also damages the user.",
        uses: ["把全身叶绿素朝身前喷成一整片扇形", "一次罩住挤在正前方的一队敌人", "用随力量增长的自损换一发范围压制"],
        kind: "enemy",
        range: 7,
        maxRange: 12,
        prepare: 13,
        active: 24,
        recover: 11,
        cooldown: 48,
        maximumTicks: 220,
        style: "verdant",
        defaults: { burst: false, ai: { maxChase: 9, minFoes: 1, minHealth: 0.4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(chloroblastId, "reach", pokemon) : 7, geometry: "line", style: "verdant",
                color: 0x8FBF3A, label: config && config.burst === true ? "爆散式叶绿爆震" : "束流式叶绿爆震" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[chloroblastId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(chloroblastId, "tempo", context)),
                recover: Math.round(p(chloroblastId, "aftercast", context)),
                cooldown: Math.round(p(chloroblastId, "recharge", context)),
                active: skills[chloroblastId].active,
                range: p(chloroblastId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_chloroblast:gather", chloroblastScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", burst: config && config.burst === true ? 1 : 0,
                    motes: Math.round(p(chloroblastId, "motes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(1, p(chloroblastId, "reach", action));
            const angle = Math.max(20, p(chloroblastId, "angle", action));
            const power = p(chloroblastId, "bloom", action);
            const falloff = Math.max(0, Math.min(0.9, p(chloroblastId, "falloff", action)));
            const cost = Math.max(0, Math.min(1, p(chloroblastId, "cost", action)));
            const motes = Math.max(1, Math.round(p(chloroblastId, "motes", action)));
            const vertices = chloroblastFan(origin, direction, reach, angle);
            const path = vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
            const scale = reach / 7;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            let hits = 0;

            sound(action, "cobblemon:move.leafstorm.actor");
            WorldFeedback.emit(world, chloroblastScene, 1, origin,
                { moment: "release", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    angle: angle, reach: reach, motes: motes, scale: scale, intensity: intensity,
                    flow: Math.round(50 + power * 0.5) }, 26);

            const region = WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (!world.clear(origin, facts.position())) return;
                const flat = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                const ratio = Math.max(0, Math.min(1, flat.length() / reach));
                const strength = power * (1 - falloff * ratio);
                if (!hurt(action, enemy, chloroblastId, strength, { damage: damageSpec(chloroblastId, "bloom") })) return;
                hits++;
                WorldFeedback.emit(world, chloroblastScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), motes: motes, count: Math.round(motes * 0.5), scale: scale,
                        intensity: Math.max(0.5, Math.min(2.4, strength / 150)), ratio: ratio }, 24);
            });

            if (hits > 0) {
                sound(action, "cobblemon:impact.grass");
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.5, 0)), chloroblastHitText, [hits], 26);
            } else {
                const tip = origin.plus(direction.scale(reach));
                WorldFeedback.emit(world, chloroblastScene, 1, tip, { moment: "fizzle", motes: motes, scale: scale }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), chloroblastMissText, [], 22);
            }

            const body = world.observe(actor);
            if (body !== null) {
                world.health(actor, -body.maxHealth() * cost, "world_combat:chloroblast_wither");
                WorldFeedback.emit(world, chloroblastScene, 1, body.position(),
                    { moment: "wither", motes: motes, count: Math.max(10, Math.round(motes * (0.6 + cost))),
                        scale: scale, cost: cost, hits: hits,
                        intensity: Math.max(0.6, Math.min(2.6, cost * 3 + intensity * 0.4)) }, 30);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), chloroblastWitherText,
                    [Math.round(cost * 100)], 28);
            }
            sound(action, "minecraft:block.grass.break");
            done(action);
        }
    });
}
