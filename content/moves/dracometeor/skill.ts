/**
 * 流星群 / dracometeor 的出手方式。
 *
 * 核心念头：**从高空召下一群陨石**——每颗落点在召唤时固定、独立亮起预告，陨石垂直砸下，在自己落点炸开一圈龙属性能量；
 *   屋顶会原生截住下落的弹体，就在上层撞点炸开。召唤与维系陨石耗的是同一份精神力，所以自身特攻掉 2 级，提交那一刻就付。
 *
 * 三幕（提交前只播预告）：
 *   起（summon）：施法者抬头，天光在落点聚起，只播预告，此时代价未结清。
 *   落（mark → fall → impact / burst）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付）；
 *       落点在提交时一次算定（第一颗是点选中心，其余按 `spread` 散布），逐颗按 `interval` 亮起预告并召下；
 *       每颗垂直落到自己固定落点后，在 `impactRadius` 内结算 `meteor`；撞到屋顶就在真实碰撞位置炸开。
 *   散（finish / miss）：全部落完后余烬散去；一颗也没砸到就是空放。
 *
 * 与同族分开：飞叶风暴是旋转前进并沿路旋切的叶刃、过热是身前一张扇形热浪、精神突进是隔空内爆；
 *   流星群是唯一从正上方垂直砸下、落点在召唤时固定并逐颗预告的那一记，也是唯一把伤害分给多颗陨石的。
 *
 * 选取：`kind: "aim"`——点选陨石中心，可落在空地上；辅助目标只作为第一颗落点的推荐，落点提交后不再追着它走。
 *
 * 配置 `barrage`（流星式）由公式改威力／颗数／散布，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const dracometeorScene = "world_combat:move_dracometeor";
    const dracometeorMissText = "world_combat.move.dracometeor.text.miss";

    define({
        id: "dracometeor",
        cooldownParameter: "recharge",
        name: "Draco Meteor",
        description: "从高空召下陨石垂直砸向各自固定的落点：每颗对落点半径内的每个敌人各造成一次特殊伤害，目标走出落点就会躲过；屋顶会截住下落的陨石，就在上层撞点炸开。流星式散布多颗，同一敌人可能被多颗砸中。召唤当即付出自身特攻大幅下降的代价。",
        uses: ["远距离召下陨石点杀", "流星式把落点铺成一片、罩住聚在一起的敌人", "对停留在原地的敌人或大体型 Boss 最有效"],
        kind: "aim",
        range: 13,
        maxRange: 17,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 40,
        maximumTicks: 320,
        style: "meteor",
        defaults: { barrage: false, ai: { maxChase: 17, spread: true, minRange: 5, still: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const fallback = config && config.barrage === true ? 2.0 : 1.3;
            const radius = pokemon ? Math.max(p("dracometeor", "impactRadius", pokemon), p("dracometeor", "spread", pokemon)) : fallback;
            return { radius: radius, geometry: "area", style: "meteor", color: 0x7A6AC8,
                label: config && config.barrage === true ? "流星群·流星式" : "流星群·坠星式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dracometeor"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dracometeor", "tempo", context)),
                recover: Math.round(p("dracometeor", "aftercast", context)),
                cooldown: Math.round(p("dracometeor", "recharge", context)),
                active: 0,
                range: p("dracometeor", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dracometeor:summon", dracometeorScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "summon", barrage: config && config.barrage === true ? 1 : 0,
                    shards: Math.round(p("dracometeor", "shards", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const barrage = !!(config && config.barrage);
            const power = p("dracometeor", "meteor", action);
            const count = Math.max(1, Math.round(p("dracometeor", "count", action)));
            const spread = Math.max(0, p("dracometeor", "spread", action));
            const impactRadius = p("dracometeor", "impactRadius", action);
            const fall = p("dracometeor", "fall", action);
            const velocity = Math.max(0.4, p("dracometeor", "velocity", action));
            const interval = Math.max(1, Math.round(p("dracometeor", "interval", action)));
            const shards = Math.max(16, Math.round(p("dracometeor", "shards", action)));
            const insightLoss = Math.max(0, Math.round(p("dracometeor", "insightLoss", action)));
            const base = action.targetPosition();
            const fallTicks = Math.ceil(fall / velocity);
            const markRadius = Math.max(impactRadius, spread);
            const trailScale = Math.max(0.7, Math.min(1.8, impactRadius / 1.3));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            const scenes = WorldFeedback.actionScenes(dracometeorScene);
            const points: CombatPoint[] = [];
            let launched = 0, resolved = 0, totalHits = 0, settled = false;

            // 落点在提交时一次算定，之后不再追着目标走。
            for (let i = 0; i < count; i++) {
                if (i === 0 || spread <= 0) { points.push(base); continue; }
                const angle = world.random() * Math.PI * 2, radius = Math.sqrt(world.random()) * spread;
                points.push(base.plus(WorldCombat.point(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)));
            }

            // 召唤耗的是精神力：反作用力在提交那一刻付。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, dracometeorScene, 1, base,
                { moment: "summon", barrage: barrage ? 1 : 0, shards: shards, radius: markRadius, scale: trailScale, intensity: intensity }, 26);
            sound(action, "cobblemon:move.dracometeor.actor_1");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (totalHits === 0) {
                    const scope = current.world();
                    WorldFeedback.text(scope, base.plus(WorldCombat.point(0, 1.0, 0)), dracometeorMissText, [], 20);
                }
                scenes.finish(current, done);
            }

            /** 一颗陨石落定：在真实碰撞位置结算，播一次冲击。 */
            function strike(current: CombatAction, at: CombatPoint, direct: CombatActor | null): void {
                const scope = current.world();
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, impactRadius, { below: 3, above: 3.5 }), function (enemy, facts) {
                    const isDirect = direct !== null && String(enemy.ref()) === String(direct.ref());
                    if (!hurt(current, enemy, "dracometeor", power, { damage: damageSpec("dracometeor", "meteor") })) return;
                    hits++;
                    WorldFeedback.emit(scope, dracometeorScene, 1, facts.position(),
                        { moment: "impact", target: String(enemy.ref()), direct: isDirect ? 1 : 0, shards: shards,
                            impactRadius: impactRadius, scale: trailScale, intensity: isDirect ? intensity : intensity * 0.85 }, 24);
                });
                totalHits += hits;
                WorldFeedback.emit(scope, dracometeorScene, 1, at,
                    { moment: "burst", shards: shards, impactRadius: impactRadius,
                        scale: trailScale, intensity: intensity, hits: hits }, 28);
                sound(current, "cobblemon:impact.dragon");
                sound(current, "minecraft:entity.generic.explode");
                resolved++;
                if (resolved >= launched && launched >= count) finish(current);
            }

            /** 召下一颗：落点已固定，只按顺序亮起预告并从它正上方垂直砸下。 */
            function summon(current: CombatAction, index: number): void {
                const at = points[index];
                const from = at.plus(WorldCombat.point(0, fall, 0));
                let spent = false;
                launched++;
                scenes.show(current, "mark:" + index, at,
                    { moment: "mark", radius: impactRadius, shards: shards, scale: trailScale, intensity: intensity });
                const flight = current.projectile(from, WorldCombat.point(0, -velocity, 0), 0,
                    Math.max(0.25, impactRadius * 0.5), fall + 8, fallTicks + 40,
                    function (fresh: CombatAction, hit: CombatImpact) {
                        if (spent) return;
                        spent = true;
                        scenes.stop(fresh, "fall:" + index);
                        scenes.stop(fresh, "mark:" + index);
                        strike(fresh, hit.position(), hit.target());
                    },
                    function (fresh: CombatAction) {
                        if (spent) return;
                        spent = true;
                        scenes.stop(fresh, "fall:" + index);
                        scenes.stop(fresh, "mark:" + index);
                        strike(fresh, at, null);
                    },
                    JSON.stringify({ sprite: "cobblemon:particle/moves/meteor", scale: Math.max(1.0, impactRadius * 1.5), glow: true, spin: true }));
                scenes.show(current, "fall:" + index, from,
                    { moment: "fall", projectile: flight, shards: shards, scale: trailScale, intensity: intensity });
                sound(current, "cobblemon:move.dracometeor.actor_2");
            }

            let index = 0;
            function drop(current: CombatAction): void {
                summon(current, index);
                index++;
                if (index < count) {
                    current.after(interval, function (fresh: CombatAction) { drop(fresh); });
                    return;
                }
                current.after(fallTicks + 60, function (fresh: CombatAction) { finish(fresh); });
            }
            drop(action);
        }
    });
}
