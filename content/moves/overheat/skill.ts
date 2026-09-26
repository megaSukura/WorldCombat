/**
 * 过热 / overheat 的出手方式。
 *
 * 核心念头：**一次排空全身的热量**——把热量逼到身前压成一张扇形热浪，沿固定准线推出去，越靠近术者的目标吃得越足
 *   （内层满额、外层打折）并可能被点燃；落点只留下一阵短热尘，不改动地面。热量排空的同时精神力也被抽走，
 *   自身特攻掉 2 级（过载式掉 3 级）。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：喉间与胸口聚起白热的光，热气从甲缝往外冒，只播预告，此时代价未结清。
 *   排（wave → blast → scorch）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付），
 *       热浪沿固定准线推出；到 `travel` 刻按扇形结算：内层吃满 `heat`、外层吃 `share`，每人各掷一次 `burnChance` 点燃；
 *       墙体挡住的目标不受扇浪；落点只留下一圈 `scorch` 半径、`scorchTicks` 时长的短热尘。
 *   散（slump / miss）：排空后身上腾起余烟、浮字提示降级；一名也没扫到就是空放。
 *
 * 与同族分开：飞叶风暴是旋转前进并沿路旋切的叶刃、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   过热是唯一身前一张同时罩住几人、并按内外层分伤的扇形热浪。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，执行只读 `aim(action)`，方向固定、不追着目标结算；空喷照付特攻下降。
 *
 * 配置 `vent`（过载式）由公式改威力与降级，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const overheatScene = "world_combat:move_overheat";
    const overheatHitText = "world_combat.move.overheat.text.hit";
    const overheatSlumpText = "world_combat.move.overheat.text.slump";
    const overheatMissText = "world_combat.move.overheat.text.miss";

    define({
        id: "overheat",
        cooldownParameter: "recharge",
        name: "Overheat",
        description: "一次排空全身热量，在身前推出一张扇形热浪：越靠近术者的敌人吃得越足——内层吃满、外层打折，并可能被点燃；墙体挡住的不受影响。热量排空后自身特攻大幅下降。过载式单发更重，但自身特攻多掉一级、出手更慢。",
        uses: ["中近距离用一张扇形热浪同时烧到几个人", "对靠近的目标造成最高伤害并有机会点燃", "过载式用更重的单发与更大的自身消耗换一记爆发"],
        kind: "aim",
        range: 8,
        maxRange: 12,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 36,
        maximumTicks: 240,
        style: "inferno",
        defaults: { vent: false, ai: { maxChase: 13, finish: true, regain: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("overheat", "reach", pokemon) : 8, geometry: "area", style: "inferno",
                color: 0xFF7A2A, label: config && config.vent === true ? "过热·过载式" : "过热·收束式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["overheat"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("overheat", "tempo", context)),
                recover: Math.round(p("overheat", "aftercast", context)),
                cooldown: Math.round(p("overheat", "recharge", context)),
                active: 0,
                range: p("overheat", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_overheat:gather", overheatScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", vent: config && config.vent === true ? 1 : 0,
                    embers: Math.round(p("overheat", "embers", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const scenes = WorldFeedback.actionScenes(overheatScene);
            const power = p("overheat", "heat", action);
            const coneAngle = p("overheat", "cone", action);
            const gust = Math.max(0.3, p("overheat", "gust", action));
            const reach = p("overheat", "reach", action);
            const inner = Math.max(0.1, Math.min(0.95, p("overheat", "inner", action)));
            const share = Math.max(0, Math.min(0.8, p("overheat", "share", action)));
            const scorch = p("overheat", "scorch", action);
            const scorchTicks = Math.max(20, Math.round(p("overheat", "scorchTicks", action)));
            const burnChance = Math.max(0.01, Math.min(0.5, p("overheat", "burnChance", action)));
            const embers = Math.max(14, Math.round(p("overheat", "embers", action)));
            const insightLoss = Math.max(0, Math.round(p("overheat", "insightLoss", action)));
            const dir = aim(action);
            const direction = [dir.x(), dir.y(), dir.z()];
            const travel = Math.max(2, Math.round(reach / gust));
            const innerRadius = reach * inner;
            const scale = Math.max(0.6, Math.min(1.9, coneAngle / 44));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            let settled = false;

            // 排空热量：反作用力在提交那一刻付。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, overheatScene, 1, origin,
                { moment: "gather", direction: direction, embers: embers, cone: coneAngle, scale: scale, intensity: intensity }, 20);
            sound(action, "cobblemon:move.fireblast.actor");
            scenes.show(action, "wave", origin,
                { moment: "wave", direction: direction, embers: embers, cone: coneAngle, reach: reach,
                    inner: innerRadius, scale: scale, intensity: intensity });

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            action.after(travel, function (current: CombatAction) {
                const scope = current.world();
                const region = WorldGeometry.sector(origin, dir, reach, coneAngle, { below: 3, above: 3.5 });
                let hits = 0, sumX = 0, sumY = 0, sumZ = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const point = facts.position();
                    // 墙后的目标不受扇浪。
                    if (!scope.clear(origin, point)) return;
                    const layered = point.minus(origin).length() <= innerRadius;
                    const amount = layered ? power : power * share;
                    if (!hurt(current, enemy, "overheat", amount,
                        { damage: damageSpec("overheat", "heat"), status: "burn", chance: burnChance })) return;
                    hits++;
                    sumX += point.x(); sumY += point.y(); sumZ += point.z();
                    WorldFeedback.emit(scope, overheatScene, 1, point,
                        { moment: "blast", target: String(enemy.ref()), layered: layered ? 1 : 0, embers: embers,
                            scale: scale, intensity: layered ? intensity : intensity * 0.8 }, 24);
                });
                scenes.stop(current, "wave");
                // 短热尘：只留表现，不换地面。
                const centre = hits > 0
                    ? WorldCombat.point(sumX / hits, sumY / hits, sumZ / hits)
                    : origin.plus(dir.scale(reach * 0.6));
                WorldFeedback.emit(scope, overheatScene, 1, centre,
                    { moment: "scorch", scorch: scorch, scorchTicks: scorchTicks, embers: embers,
                        scale: scale, intensity: intensity, hits: hits }, 30);
                sound(current, "cobblemon:impact.fire");
                sound(current, "minecraft:entity.blaze.shoot");
                if (hits > 0) WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)), overheatHitText, [hits], 24);
                else WorldFeedback.text(scope, origin.plus(dir.scale(reach * 0.5)).plus(WorldCombat.point(0, 1.0, 0)), overheatMissText, [], 22);
                const self = scope.observe(actor);
                if (self !== null) {
                    WorldFeedback.emit(scope, overheatScene, 1, self.position(),
                        { moment: "slump", insightLoss: insightLoss, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.25, 0)), overheatSlumpText, [insightLoss], 26);
                }
                finish(current);
            });
        }
    });
}
