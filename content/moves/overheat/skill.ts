/**
 * 过热 / overheat 的出手方式。
 *
 * 核心念头：**一次排空全身的热量**——把热量逼到身前压成一张扇形热浪，沿固定准线推出去，越靠近术者的目标吃得越足
 *   （内层满额、外层打折）并可能被点燃；落点只留下一阵短热尘，不改动地面。热量排空的同时精神力也被抽走，
 *   自身特攻掉 2 级（过载式掉 3 级）。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：喉间与胸口聚起白热的光，热气从甲缝往外冒，只播预告，此时代价未结清。
 *   排（wave → blast → scorch）：提交这一刻整张扇面一瞬压出并结算，没有虚构的行进等待。
 *       本发先用 `PokemonDamage.snapshotAttack` 取付代价前的特攻/等级快照，每次 `hurt` 带 `attackSnapshot`，
 *       所以紧接真实发出所付的自身特攻 −insightLoss 不会削弱这一次（中与不中都照付）。
 *       内层吃满 `heat`、外层吃 `share`，每人各掷一次 `burnChance` 点燃；墙体挡住的目标不受扇浪；
 *       落点只留一圈 `scorch` 半径的短热尘，不改地面。
 *   散（slump / miss）：排空后身上腾起余烟、用实际降阶量浮字提示；一名也没扫到就是空放。
 *
 * 与同族分开：飞叶风暴是旋转前进并沿路旋切的叶刃、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   过热是唯一身前一瞬张开、同时罩住几人并按内外层分伤的扇形重爆。
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
            const context = pokemon ? { pokemon: pokemon, skill: skills["overheat"], detail: { values: config } } : undefined;
            return { radius: pokemon ? p("overheat", "reach", pokemon) : 8, geometry: "cone", orientation: "ground",
                spread: pokemon ? p("overheat", "cone", context) : 44, style: "inferno",
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
            // 付代价前的攻击快照：本发不被自己的特攻下降削弱。
            const snapshot = PokemonDamage.snapshotAttack(world, actor, "spa");
            const power = p("overheat", "heat", action);
            const coneAngle = p("overheat", "cone", action);
            const gust = Math.max(0.3, p("overheat", "gust", action));
            const reach = p("overheat", "reach", action);
            const inner = Math.max(0.1, Math.min(0.95, p("overheat", "inner", action)));
            const share = Math.max(0, Math.min(0.8, p("overheat", "share", action)));
            const scorch = p("overheat", "scorch", action);
            const burnChance = Math.max(0.01, Math.min(0.5, p("overheat", "burnChance", action)));
            const embers = Math.max(14, Math.round(p("overheat", "embers", action)));
            const insightLoss = Math.max(0, Math.round(p("overheat", "insightLoss", action)));
            const dir = aim(action);
            const direction = [dir.x(), dir.y(), dir.z()];
            const innerRadius = reach * inner;
            const scale = Math.max(0.6, Math.min(1.9, coneAngle / 44));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));

            // 一瞬窄爆：整张扇面在提交这一刻出现并结算，没有虚构的行进等待。
            WorldFeedback.emit(world, overheatScene, 1, origin,
                { moment: "wave", direction: direction, embers: embers, cone: coneAngle, reach: reach,
                    inner: innerRadius, gust: gust, scale: scale, intensity: intensity }, 22);
            sound(action, "cobblemon:move.fireblast.actor");

            // 排空热量：紧接真实发出付反作用力；用实际降阶量浮字（到下限时可以小于参数值）。
            const applied = NativeEffects.boost(world, actor, "spa", -insightLoss);

            const region = WorldGeometry.sector(origin, dir, reach, coneAngle, { below: 3, above: 3.5 });
            let hits = 0, sumX = 0, sumY = 0, sumZ = 0;
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                const point = facts.position();
                // 墙后的目标不受扇浪。
                if (!world.clear(origin, point)) return;
                const layered = point.minus(origin).length() <= innerRadius;
                const amount = layered ? power : power * share;
                if (!hurt(action, enemy, "overheat", amount,
                    { damage: damageSpec("overheat", "heat"), status: "burn", chance: burnChance, attackSnapshot: snapshot })) return;
                hits++;
                sumX += point.x(); sumY += point.y(); sumZ += point.z();
                WorldFeedback.emit(world, overheatScene, 1, point,
                    { moment: "blast", target: String(enemy.ref()), layered: layered ? 1 : 0, embers: embers,
                        scale: scale, intensity: layered ? intensity : intensity * 0.8 }, 24);
            });

            // 短热尘：只留表现，不换地面。
            const centre = hits > 0
                ? WorldCombat.point(sumX / hits, sumY / hits, sumZ / hits)
                : origin.plus(dir.scale(reach * 0.6));
            WorldFeedback.emit(world, overheatScene, 1, centre,
                { moment: "scorch", scorch: scorch, embers: embers, scale: scale, intensity: intensity, hits: hits }, 26);
            sound(action, "cobblemon:impact.fire");
            sound(action, "minecraft:entity.blaze.shoot");
            if (hits > 0) WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)), overheatHitText, [hits], 24);
            else WorldFeedback.text(world, origin.plus(dir.scale(reach * 0.5)).plus(WorldCombat.point(0, 1.0, 0)), overheatMissText, [], 22);
            const self = world.observe(actor);
            if (self !== null) {
                WorldFeedback.emit(world, overheatScene, 1, self.position(),
                    { moment: "slump", insightLoss: Math.abs(applied), scale: scale, intensity: intensity }, 22);
                if (applied !== 0)
                    WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.25, 0)), overheatSlumpText, [Math.abs(applied)], 26);
            }
            done(action);
        }
    });
}
