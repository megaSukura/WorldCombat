/**
 * 烈焰溅射 / flameburst 的出手方式。
 *
 * 核心念头：**一颗会溢出的火焰弹**——掌心凝出一颗火球射出去，命中点炸开的同时，火不停在那里，而是从爆点
 *   甩出几滴、沿弧线落到**旁边每个对手**身上，各自绽开一小簇火。画面的溅射轨迹就是它的判定范围：玩家一眼
 *   看得出站得离目标太近会被连带烧到。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：掌心凝火、火苗收拢，只播预告，此时代价未结清。
 *   飞（flight）：提交后火球拖着焰尾沿浅弧飞出，途中撒下火星。
 *   爆（burst → splash → drop → fade）：命中活体时结算 `burst` 主爆伤害，炸开一圈火；随后在爆点 `splashRadius`
 *       范围内挑出主目标之外的对手，各结算一记 `splash`，并从爆点到每个人甩出一条火滴轨迹（`path`）；没打中
 *       活体只在落点炸开、留下浮字。
 *
 * 与同族分开：火花是一粒点、喷射火焰是一道会变长的墙、大字爆炎是一幅字、火焰球是踢出的实心火石；只有烈焰
 *   溅射把命中能量主动往外分给旁边的人，而且原生没有灼伤概率——它不靠状态，靠「分出去的火」被认出来。
 *
 * 配置 `spread`（扇溅式）由 `resolve` 改时序与射程、由公式改爆裂／溅射与半径，提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: flameburstId,
        name: "Flame Burst",
        description: "The user attacks the target with a bursting flame. The bursting flame damages Pokemon next to the target as well.",
        uses: ["中距离点射并连带烧到目标旁边的人", "把挤在一起的一小群对手一起削血", "主目标之外的火用于补刀"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 34,
        maximumTicks: 320,
        style: "fire",
        defaults: { spread: true, ai: { maxChase: 16, cluster: true, finishLow: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(flameburstId, "reach", pokemon) : 12, geometry: "line", style: "fire",
                color: 0xFF7A2E, label: config && config.spread === true ? "扇溅式烈焰溅射" : "直爆式烈焰溅射" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[flameburstId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(flameburstId, "tempo", context)),
                recover: Math.round(p(flameburstId, "aftercast", context)),
                cooldown: Math.round(p(flameburstId, "recharge", context)),
                active: 0,
                range: p(flameburstId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_flameburst:gather", flameburstScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", spread: config && config.spread === true ? 1 : 0,
                    drops: Math.round(p(flameburstId, "drops", action)),
                    embers: Math.round(p(flameburstId, "embers", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(flameburstId, "burst", action);
            const splashPower = p(flameburstId, "splash", action);
            const splashRadius = p(flameburstId, "splashRadius", action);
            const velocity = p(flameburstId, "velocity", action);
            const gravity = p(flameburstId, "gravity", action);
            const radius = p(flameburstId, "radius", action);
            const drops = Math.max(6, Math.round(p(flameburstId, "drops", action)));
            const embers = Math.max(8, Math.round(p(flameburstId, "embers", action)));
            const spread = !!(config && config.spread);
            const scale = Math.max(0.6, Math.min(2.4, splashRadius / flameburstReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const direction = aim(action);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.ember.actor");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/fire/flame", tint: 0xFF8A3C, glow: true,
                scale: Math.max(0.8, Math.min(1.8, radius / 0.24))
            };
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, gravity: gravity, lifetime: 200,
                direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const primary = hit.target();
                    const ref = primary !== null ? String(primary.ref()) : "";
                    let landed = false;
                    if (primary !== null && scope.valid(primary) && !scope.friendly(primary))
                        landed = impact(current, hit, flameburstId, power, { damage: damageSpec(flameburstId, "burst") });
                    WorldFeedback.emit(scope, flameburstScene, 1, point,
                        { moment: "burst", target: ref, drops: drops, embers: embers, scale: scale,
                            intensity: intensity, radius: splashRadius }, 30);
                    sound(current, "cobblemon:impact.fire");
                    sound(current, "minecraft:entity.generic.explode");
                    if (landed) {
                        let splashed = 0;
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, splashRadius, { below: 2.5, above: 3 }),
                            function (other, facts) {
                                if (String(other.ref()) === ref) return;
                                if (!hurt(current, other, flameburstId, splashPower, { damage: damageSpec(flameburstId, "splash") })) return;
                                splashed++;
                                WorldFeedback.emit(scope, flameburstScene, 1, point,
                                    { moment: "splash", path: [[point.x(), point.y(), point.z()], String(other.ref())],
                                        target: String(other.ref()), drops: drops, scale: scale, intensity: intensity }, 22);
                                WorldFeedback.emit(scope, flameburstScene, 1, facts.position(),
                                    { moment: "drop", target: String(other.ref()), drops: drops, scale: scale, intensity: intensity }, 20);
                            });
                        if (splashed > 0)
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), flameburstDropText, [splashed], 30);
                    } else if (primary === null) {
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), flameburstMissText, [], 20);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                WorldFeedback.emit(current.world(), flameburstScene, 1, current.origin(), { moment: "fade", scale: scale }, 16);
                finish(current);
            });
            WorldFeedback.keep(world, "flameburst:flight:" + action.id(), flameburstScene, 1, action.origin(),
                { moment: "flight", projectile: flight, drops: drops, embers: embers, scale: scale, intensity: intensity }, 120);
        }
    });
}
