/**
 * 叶绿爆震 / chloroblast 的出手方式。
 *
 * 核心念头：**把全身积蓄的叶绿素一次放尽**——从全身收进核心，再沿准线喷成一整片扇形，越近越重、越远越轻；
 * 放完之后施法者的叶绿素被抽空，按**放出去的力量**损失生命。罩得多、但每一下按距离打折。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：叶绿素从四肢向核心汇聚、身体透出青绿的光，只播预告，此时代价未结清。
 *   放（release → hit）：提交后一片叶绿爆流从身前朝准线推成一整片扇形（`WorldGeometry.sector` 判定，
 *       表现用同一组 reach/angle/direction 的扇面形状），扇形里的每个非友方各挨一次 `bloom` 伤害，
 *       按到中心的距离衰减 `falloff`。
 *   枯（wither）：叶绿素放尽后施法者透出的光暗下去，按最大生命 ×`cost` 扣血（浮字提示），只剩枯色余屑。
 *
 * 与同族分开：铁蹄光线重而短、只打第一个；破灭之光粗重贯穿、自损随伤害；随机光没有自损。
 * 叶绿爆震是唯一**覆盖面**、也是唯一自损随放出的力量走的一招。
 *
 * 选取 `kind: "aim"`：可朝任意方向或世界点喷扇，也能空放；没有实体时沿选定方向/落点铺开，不强行要求存在敌人。
 * 墙后的对象仍经共享 `world.clear` 排除。命中权限由命中层按敌我结算。
 */
namespace PokemonSkills {
    define({
        id: chloroblastId,
        cooldownParameter: "recharge",
        name: "Chloroblast",
        description: "朝任意方向或世界点把全身积蓄的叶绿素喷成一整片扇形爆震：罩住的敌人各挨一下、越近越重，也能空放；自己按放出的力量损失生命。",
        uses: ["把全身叶绿素朝身前喷成一整片扇形", "一次罩住挤在正前方的一队敌人", "用随力量增长的自损换一发范围压制"],
        kind: "aim",
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
            // 用与出招同一个配置求值，指示的半径/张角与真实覆盖一致；标签顺便亮出这一发实际要付的自损比例。
            const context = pokemon ? { pokemon: pokemon, skill: skills[chloroblastId], detail: { values: config } } : undefined;
            const reach = p(chloroblastId, "reach", context);
            const angle = p(chloroblastId, "angle", context);
            const cost = p(chloroblastId, "cost", context);
            return { radius: reach, geometry: "cone", orientation: "ground", spread: angle, style: "verdant", color: 0x8FBF3A,
                label: (config && config.burst === true ? "爆散式叶绿爆震" : "束流式叶绿爆震") + " · 自损 " + Math.round(cost * 100) + "%" };
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
            // 水平朝向：表现用 orient:"heading" 的扇面与判定用 sector 读同一个方向，竖直/零输入有安全回退。
            const flat = WorldGeometry.flatUnit(direction, action.direction());
            const heading = [flat.x(), flat.y(), flat.z()];
            const scale = reach / 7;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            let hits = 0;

            sound(action, "cobblemon:move.leafstorm.actor");
            WorldFeedback.emit(world, chloroblastScene, 1, origin,
                { moment: "release", direction: heading, angle: angle, reach: reach, motes: motes, scale: scale, intensity: intensity,
                    flow: Math.round(50 + power * 0.5) }, 26);

            const region = WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (!world.clear(origin, facts.position())) return;
                const flat = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                const ratio = Math.max(0, Math.min(1, flat.length() / reach));
                const strength = power * (1 - falloff * ratio);
                if (!hurt(action, enemy, chloroblastId, strength, { damage: damageSpec(chloroblastId, "bloom") })) return;
                hits++;
                // 近处浓、远处淡：命中处爆开的叶屑量按到中心的距离比例派生，实际接进表现载荷。
                const count = Math.max(6, Math.round(motes * (1 - falloff * ratio)));
                WorldFeedback.emit(world, chloroblastScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), motes: motes, count: count, scale: scale,
                        intensity: Math.max(0.5, Math.min(2.4, strength / 150)), ratio: ratio, near: Math.round((1 - ratio) * 100) / 100 }, 24);
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
                const lost = -world.health(actor, -body.maxHealth() * cost, "world_combat:chloroblast_wither");
                if (lost > 0) {
                    // 枯叶量按实际自损：真的被抽走多少叶绿素，画面就落多少枯叶。
                    const count = Math.max(8, Math.round(motes * (0.4 + Math.min(1.6, lost / Math.max(1, body.maxHealth() * 0.3)))));
                    WorldFeedback.emit(world, chloroblastScene, 1, body.position(),
                        { moment: "wither", motes: motes, count: count, loss: Math.round(lost * 10) / 10,
                            scale: scale, cost: cost, hits: hits,
                            intensity: Math.max(0.6, Math.min(2.6, cost * 3 + intensity * 0.4)) }, 30);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), chloroblastWitherText,
                        [Math.round(cost * 100)], 28);
                }
            }
            sound(action, "minecraft:block.grass.break");
            done(action);
        }
    });
}
