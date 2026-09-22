/**
 * 飞叶风暴 / leafstorm 的出手方式。
 *
 * 核心念头：**甩出一股旋转的叶刃风暴**——把尖叶卷成一根绕着前进轴打转的风柱推出去，叶刃在目标身上高速旋切，
 *   随后炸散；卷叶式让这股风在落点多盘桓一阵，持续割站在里面的人。反作用力是最直白的：叶子离手，自身特攻掉 2 级。
 *
 * 两幕（提交前只播预告）：
 *   起（gather）：脚下与身侧散落的尖叶被风拢起、绕身打转，只播预告，此时代价未结清。
 *   卷（fly → shred / burst → whirl）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付），
 *       风柱沿准线卷出；命中非友方结算一次 `storm` 特殊伤害，在落点炸散；卷叶式再在原地铺出 `whirlRadius`
 *       的叶场，按 `whirlPulse` 反复复割场内敌人，到 `whirlTicks` 散尽。落空只留一下散叶。
 *
 * 与同族分开：过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   飞叶风暴是唯一绕着一根轴旋转前进、并在落点盘桓成场的那一记。玩家凭「旋卷的绿叶片 + 原地打转的叶场」认出它。
 *
 * 配置 `maelstrom`（卷叶式）由 `resolve` 改时序、由公式改威力／半径／时长，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const leafstormScene = "world_combat:move_leafstorm";
    const leafstormWhirlText = "world_combat.move.leafstorm.text.whirl";
    const leafstormMissText = "world_combat.move.leafstorm.text.miss";

    define({
        id: "leafstorm",
        name: "Leaf Storm",
        description: "Whips a spinning storm of sharp leaves into the target; the recoil harshly lowers the user's Sp. Atk.",
        uses: ["中距离一记高威力特殊草点杀", "卷叶式在落点铺一片持续复割的叶场", "用风柱把目标与身边的敌人一起卷进叶刃里"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 38,
        maximumTicks: 360,
        style: "verdant",
        defaults: { maelstrom: false, ai: { maxChase: 15, group: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("leafstorm", "reach", pokemon) : 11, geometry: "line", style: "verdant",
                color: 0x7FC04A, label: config && config.maelstrom === true ? "飞叶风暴·卷叶式" : "飞叶风暴·穿叶式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["leafstorm"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("leafstorm", "tempo", context)),
                recover: Math.round(p("leafstorm", "aftercast", context)),
                cooldown: Math.round(p("leafstorm", "recharge", context)),
                active: 0,
                range: p("leafstorm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_leafstorm:gather", leafstormScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", maelstrom: config && config.maelstrom === true ? 1 : 0,
                    blades: Math.round(p("leafstorm", "blades", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const maelstrom = !!(config && config.maelstrom);
            const power = p("leafstorm", "storm", action);
            const gust = Math.max(0.3, p("leafstorm", "gust", action));
            const girth = p("leafstorm", "girth", action);
            const reach = p("leafstorm", "reach", action);
            const blades = Math.max(12, Math.round(p("leafstorm", "blades", action)));
            const whirlRadius = Math.max(0, p("leafstorm", "whirlRadius", action));
            const whirlShare = Math.max(0, Math.min(0.6, p("leafstorm", "whirlShare", action)));
            const whirlTicks = Math.max(0, Math.round(p("leafstorm", "whirlTicks", action)));
            const whirlPulse = Math.max(10, Math.round(p("leafstorm", "whirlPulse", action)));
            const insightLoss = Math.max(0, Math.round(p("leafstorm", "insightLoss", action)));
            const scale = Math.max(0.6, Math.min(2.4, girth / 0.42));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            let settled = false;

            // 叶子离手：反作用力在提交那一刻付。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, leafstormScene, 1, origin,
                { moment: "gather", maelstrom: maelstrom ? 1 : 0, blades: blades, scale: scale, intensity: intensity }, 20);
            sound(action, "cobblemon:move.leafstorm.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            /** 落点叶场：按 whirlPulse 反复复割场内敌人，到 whirlTicks 散尽。 */
            function whirl(current: CombatAction, at: CombatPoint, index: number): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, whirlRadius, { below: 2.5, above: 3.5 }), function (enemy, facts) {
                    if (!hurt(current, enemy, "leafstorm", power * whirlShare, { damage: damageSpec("leafstorm", "storm") })) return;
                    WorldFeedback.emit(scope, leafstormScene, 1, facts.position(),
                        { moment: "shred", target: String(enemy.ref()), blades: blades, scale: scale, intensity: intensity * 0.8 }, 18);
                });
                const next = index + 1;
                if (next * whirlPulse >= whirlTicks) { finish(current); return; }
                current.after(whirlPulse, function (fresh: CombatAction) { whirl(fresh, at, next); });
            }

            const flight = LivingActions.projectile(action, {
                speed: gust, range: reach, radius: girth,
                direction: aim(action),
                lifetime: Math.max(30, Math.round(reach / Math.max(0.2, gust) + 30)),
                appearance: { sprite: "cobblemon:generic/grass/razorleaf", tint: 0x9BD14A, glow: true,
                    scale: Math.max(0.8, Math.min(2.2, girth * 3.2)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const at = hit.position();
                    const victim = hit.target();
                    let landed = false;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim))
                        landed = impact(current, hit, "leafstorm", power, { damage: damageSpec("leafstorm", "storm") });
                    WorldFeedback.emit(scope, leafstormScene, 1, at,
                        { moment: landed ? "shred" : "burst", target: victim !== null ? String(victim.ref()) : "",
                            landed: landed ? 1 : 0, blades: blades, scale: scale, intensity: intensity }, 28);
                    sound(current, landed ? "cobblemon:move.leafstorm.target" : "cobblemon:impact.grass");
                    if (maelstrom && whirlRadius > 0) {
                        // 卷叶式的叶场先续上，再开始复割。
                        WorldFeedback.keep(scope, "leafstorm:whirl:" + current.id(), leafstormScene, 1, at,
                            { moment: "whirl", radius: whirlRadius, blades: blades, scale: scale, intensity: intensity, whirlTicks: whirlTicks }, whirlTicks + 12);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), leafstormWhirlText, [Math.round(whirlShare * 100)], 26);
                        whirl(current, at, 1);
                        return;
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                const scope = current.world();
                const at = current.targetPosition();
                WorldFeedback.emit(scope, leafstormScene, 1, at,
                    { moment: "burst", landed: 0, blades: blades, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), leafstormMissText, [], 22);
                sound(current, "minecraft:block.grass.break");
                finish(current);
            });

            WorldFeedback.keep(world, "leafstorm:fly:" + action.id(), leafstormScene, 1, origin,
                { moment: "fly", projectile: flight, blades: blades, scale: scale, intensity: intensity }, 90);
        }
    });
}
