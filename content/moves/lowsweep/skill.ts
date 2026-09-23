/**
 * 下盘踢 / lowsweep 的出手方式。
 *
 * 核心念头：一次原地拧腰的低扫——施法者压低重心，一条低平的弧线扫过脚踝，弧线里所有人的小腿都被削到；
 * 正在快速移动的目标重心最难收回，掉的速度也最多（掉速等级读目标当前的移动速度）。它贴身、快、便宜，
 * 没有突进、没有留在地上的东西，只有一次拧腰和一次收腿。
 *
 * 两幕（提交前只播预告）：
 *   起（pivot）：压低重心、把脚放稳，尘点向内收。
 *   扫（sweep → hit / miss）：提交后原地扫出一道低弧；`WorldGeometry.sector` 圈出弧线里的非友方，
 *       每名被扫到的目标各结算一次 `cut` 接触伤害、掉速度等级并挂 hobbled 身份；被削到重心难收的目标
 *       小腿被别住一瞬（rooted）。弧线里一个人都没有就播落空。
 *
 * 与踢倒分开：踢倒会突进、按目标体重决定威力并把目标扫倒；下盘踢不位移、按双方速度决定威力与掉速，不绊倒。
 * 掉速走 `NativeEffects.boost` 的共享速度等级，对宝可梦和其他生物同一条路。
 */
namespace PokemonSkills {
    const lowsweepScene = "world_combat:move_lowsweep";
    const lowsweepHobble = "world_combat:lowsweep_hobble";
    const lowsweepHitText = "world_combat.move.lowsweep.text.hit";
    const lowsweepFastText = "world_combat.move.lowsweep.text.fast";
    const lowsweepMissText = "world_combat.move.lowsweep.text.miss";

    /** 用某个具体目标的事实求这一次扫踢的威力与掉速级数（目标移动速度只有在这里读得到）。 */
    function lowsweepCut(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): { power: number; stages: number } {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["lowsweep"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return { power: p("lowsweep", "cut", context), stages: Math.max(1, Math.round(p("lowsweep", "slowStages", context))) };
    }

    define({
        id: "lowsweep",
        name: "Low Sweep",
        description: "The user makes a swift attack on the target's legs, which lowers the target's Speed stat.",
        uses: ["贴身削掉高速对手的速度", "一记快而便宜的点切", "拧身扫开脚边一小圈敌人"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.0,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 20,
        style: "contact",
        defaults: { whirl: false, ai: { maxChase: 5, cutRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("lowsweep", "reach", pokemon) + 0.5, geometry: "line", style: "contact",
                color: 0xE0B060, label: config && config.whirl === true ? "下盘踢·旋身扫" : "下盘踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["lowsweep"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const whirl = !!(config && config.whirl);
            return { prepare: Math.round(p("lowsweep", "pivot", context)), recover: 6 + (whirl ? 3 : 0),
                cooldown: 20 + (whirl ? 6 : 0), active: 0, range: p("lowsweep", "reach", context) + 0.4 };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lowsweep:pivot", lowsweepScene, 1, action.origin(),
                JSON.stringify({ moment: "pivot", whirl: config && config.whirl ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("lowsweep", "reach", action);
            const arc = p("lowsweep", "sweepArc", action);
            const spark = Math.max(8, Math.round(p("lowsweep", "spark", action)));
            const hobble = Math.max(30, Math.round(p("lowsweep", "hobbleTicks", action)));
            const rootTicks = Math.max(0, Math.round(p("lowsweep", "rootTicks", action)));
            const whirl = !!(config && config.whirl);
            const scale = body === null ? 1 : (body.width() + body.height()) / 2.3;
            const feetY = origin.y() - (body === null ? 0.7 : body.height() / 2);
            // 与判定同一组顶点：贴着地面的低弧，玩家一眼看出站在弧线上会被削到。
            let hx = direction.x(), hz = direction.z();
            const flat = Math.sqrt(hx * hx + hz * hz);
            if (flat < 1e-6) { hx = 0; hz = 1; } else { hx /= flat; hz /= flat; }
            const path: number[][] = [];
            const steps = 9;
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps - 0.5) * arc * Math.PI / 180;
                const dx = hx * Math.cos(a) - hz * Math.sin(a), dz = hx * Math.sin(a) + hz * Math.cos(a);
                path.push([origin.x() + dx * reach, feetY, origin.z() + dz * reach]);
            }
            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, lowsweepScene, 1, origin,
                { moment: "sweep", arc: arc, reach: reach, path: path, whirl: whirl ? 1 : 0, spark: spark, scale: scale }, 24);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, reach, arc, { below: 1.8, above: 1.2 }),
                function (target, facts) {
                    if (hits >= 3) return;
                    hits++;
                    const rolled = lowsweepCut(action, world, target, config);
                    const landed = hurt(action, target, "lowsweep", rolled.power,
                        { damage: damageSpec("lowsweep", "cut"), contact: true });
                    if (!landed) return;
                    NativeEffects.boost(world, target, "spe", -rolled.stages);
                    MobEffects.apply(world, target, lowsweepHobble, hobble, 0);
                    if (world.valid(target) && rolled.stages >= 2 && rootTicks > 0) WorldEffects.apply(world, target, "rooted", {}, rootTicks);
                    WorldFeedback.emit(world, lowsweepScene, 1, facts.position(),
                        { moment: "hit", target: String(target.ref()), stages: rolled.stages, spark: spark,
                            intensity: Math.max(0.6, Math.min(2.2, rolled.power / 55)), scale: scale }, 24);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                        rolled.stages >= 2 ? lowsweepFastText : lowsweepHitText, [rolled.stages], 24);
                });
            if (hits === 0) {
                WorldFeedback.emit(world, lowsweepScene, 1, origin, { moment: "miss", spark: spark, scale: scale }, 20);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), lowsweepMissText, [], 22);
            }
            sound(action, hits > 0 ? "cobblemon:impact.fighting" : "minecraft:entity.player.attack.weak");
            done(action);
        }
    });
}
