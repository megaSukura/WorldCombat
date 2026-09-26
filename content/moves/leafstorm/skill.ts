/**
 * 飞叶风暴 / leafstorm 的出手方式。
 *
 * 核心念头：**甩出一股沿准线卷动的叶刃风暴**——把尖叶卷成一根绕着前进轴打转的叶筒推出去，叶刃卷过谁就在谁身上
 *   高速旋切，到射程尽头一次散开。反作用力是最直白的：叶子离手，自身特攻掉 2 级。
 *
 * 两幕（提交前只播预告）：
 *   起（gather）：脚下与身侧散落的尖叶被风拢起、绕身打转，只播预告，此时代价未结清。
 *   卷（fly → shred / burst）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付），
 *       风柱沿准线真实卷出；真正卷到的非友方各结算一次 `storm`（每个目标由原生贯穿只碰一次、总伤守单发预算），
 *       到射程尽头一次 burst 散叶。穿叶式撞上第一个敌人即散；卷叶式更慢、能穿过 `carry` 个敌人。
 *
 * 与同族分开：过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   飞叶风暴是唯一绕着一根轴旋转前进、并沿实际经过的敌人连续旋切的那一记。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，执行只读 `aim(action)`，不要求提交时存在敌人；空放照付特攻下降。
 *
 * 配置 `maelstrom`（卷叶式）由公式改威力／风速／贯穿数，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const leafstormScene = "world_combat:move_leafstorm";
    const leafstormMissText = "world_combat.move.leafstorm.text.miss";

    define({
        id: "leafstorm",
        cooldownParameter: "recharge",
        name: "Leaf Storm",
        description: "把尖叶卷成一股沿准线卷动的风暴，真正卷过谁就在谁身上高速旋切，到尽头一次散开；叶子离手后自身特攻大幅下降。卷叶式卷得更慢、能穿过几个敌人，代价是单发威力更低、出手更慢。",
        uses: ["中距离一记高威力特殊草点杀", "卷叶式把成排的敌人一次卷过", "把目标与它身后的敌人一起卷进叶刃里"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 38,
        maximumTicks: 360,
        style: "verdant",
        defaults: { maelstrom: false, ai: { maxChase: 15, line: true } },
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
            const carry = maelstrom ? Math.max(1, Math.round(p("leafstorm", "carry", action))) : 0;
            const insightLoss = Math.max(0, Math.round(p("leafstorm", "insightLoss", action)));
            const scale = Math.max(0.6, Math.min(2.4, girth / 0.42));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            const scenes = WorldFeedback.actionScenes(leafstormScene);
            const direction = aim(action);
            const spent: { [ref: string]: number } = Object.create(null);
            let cuts = 0, settled = false;
            let last = origin.plus(direction.scale(reach));

            // 叶子离手：反作用力在提交那一刻付，中与不中都一样。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, leafstormScene, 1, origin,
                { moment: "gather", maelstrom: maelstrom ? 1 : 0, blades: blades, scale: scale, intensity: intensity }, 20);
            sound(action, "cobblemon:move.leafstorm.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            const flight = LivingActions.projectile(action, {
                speed: gust, range: reach, radius: girth, direction: direction,
                lifetime: Math.max(30, Math.round(reach / Math.max(0.2, gust) + 40)),
                appearance: { sprite: "cobblemon:generic/grass/razorleaf", tint: 0x9BD14A, glow: true,
                    scale: Math.max(0.8, Math.min(2.2, girth * 3.2)), pierce: carry },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const at = hit.position();
                    last = at;
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    const ref = String(victim.ref());
                    const budget = Math.max(0, power - (spent[ref] || 0));
                    if (budget <= 0) return;
                    const landed = impact(current, hit, "leafstorm", budget, { damage: damageSpec("leafstorm", "storm") });
                    if (!landed) return;
                    spent[ref] = (spent[ref] || 0) + budget;
                    cuts++;
                    WorldFeedback.emit(scope, leafstormScene, 1, at,
                        { moment: "shred", target: ref, blades: blades, scale: scale, intensity: intensity }, 22);
                    sound(current, "cobblemon:move.leafstorm.target");
                }
            }, function (current: CombatAction) {
                if (settled) return;
                const scope = current.world();
                WorldFeedback.emit(scope, leafstormScene, 1, last,
                    { moment: "burst", landed: cuts > 0 ? 1 : 0, blades: blades, radius: girth * 1.6,
                        scale: scale, intensity: intensity }, 24);
                if (cuts === 0) {
                    WorldFeedback.text(scope, last.plus(WorldCombat.point(0, 1.2, 0)), leafstormMissText, [], 22);
                    sound(current, "minecraft:block.grass.break");
                }
                finish(current);
            });

            scenes.show(action, "fly", origin,
                { moment: "fly", projectile: flight, blades: blades, scale: scale, intensity: intensity });
        }
    });
}
