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
 *       范围内挑出主目标之外的对手，各结算一记 `splash`，并从爆点到每个人甩出一条火滴轨迹（`path`）；撞到方块或
 *       任何非活体只在受击面散出一小簇火、不出现爆圈，也不触发旁溅；飞行耗尽则只留残烟。
 *
 * 选取：`kind: "aim"`——可以朝任意方向或一个世界点抛出火球，也能空放；没有选中实体时沿所选方向/落点飞行，
 *   命中方块只散火，选敌更容易命中活体而带出旁溅。伤害权限仍由命中层按敌我关系判断。
 *
 * 与同族分开：火花是一粒点、喷射火焰是一道会变长的墙、大字爆炎是一幅字、火焰球是踢出的实心火石；只有烈焰
 *   溅射把命中能量主动往外分给旁边的人，而且原生没有灼伤概率——它不靠状态，靠「分出去的火」被认出来。
 *
 * 配置 `spread`（扇溅式）由 `resolve` 改时序与射程、由公式改爆裂／溅射与半径，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 撞点沿受击方块的外表面往外挪一点，让散火贴着墙面而不是嵌进方块里；非方块接触（非活体实体等）保持原点。 */
    function flameburstSurface(hit: CombatImpact, point: CombatPoint): CombatPoint {
        switch (hit.blockFace()) {
            case "up": return point.plus(WorldCombat.point(0, 0.25, 0));
            case "down": return point.plus(WorldCombat.point(0, -0.25, 0));
            case "north": return point.plus(WorldCombat.point(0, 0, -0.25));
            case "south": return point.plus(WorldCombat.point(0, 0, 0.25));
            case "west": return point.plus(WorldCombat.point(-0.25, 0, 0));
            case "east": return point.plus(WorldCombat.point(0.25, 0, 0));
            default: return point;
        }
    }
    define({
        id: flameburstId,
        cooldownParameter: "recharge",
        name: "Flame Burst",
        description: "射出一颗沿低弧飞行的火焰弹：命中点炸开时主目标吃主爆，爆点周围的每个其他对手各吃一记独立溅射。主爆没打中活体就不会有溅射，火只落到主目标之外的人身上。",
        uses: ["中距离点射并连带烧到主目标旁边的人", "把挤在一起的一小群对手一起削血", "用溅射收掉主目标之外的残血对手"],
        kind: "aim",
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
                    const living = primary !== null && scope.valid(primary) && !scope.friendly(primary);
                    const ref = living ? String(primary!.ref()) : "";
                    let landed = false;
                    if (living)
                        landed = impact(current, hit, flameburstId, power, { damage: damageSpec(flameburstId, "burst") });
                    if (living) {
                        // 打到活体：主爆炸开；只有主爆真正结算了，才把火分给爆点周围的人。
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
                        }
                    } else {
                        // 撞到方块或非活体：只在受击面散出一小簇火，不画爆圈，也不产生任何旁溅。
                        const surface = flameburstSurface(hit, point);
                        WorldFeedback.emit(scope, flameburstScene, 1, surface,
                            { moment: "scatter", target: "", drops: drops, scale: scale, intensity: intensity }, 22);
                        sound(current, "cobblemon:impact.fire");
                        WorldFeedback.text(scope, surface.plus(WorldCombat.point(0, 0.9, 0)), flameburstMissText, [], 20);
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
