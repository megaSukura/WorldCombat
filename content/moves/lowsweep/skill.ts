/** A native body-box low fan catches feet inside its thin volume, regardless of the target centre height. */
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
        description: "原地压低重心、拧腰扫出一道贴地的低弧：弧线里最多 3 名敌人的小腿被削到，正在快速移动的目标重心最难收回、掉的速度也最多；被削到重心难收的目标小腿还会被别住一瞬。旋身扫弧线更开、别腿更久，但单点更轻。",
        uses: ["贴身削掉高速对手的速度", "一记快而便宜的点切", "拧身扫开脚边一小圈敌人"],
        kind: "aim",
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
                path.push([origin.x() + dx * reach, feetY + .2, origin.z() + dz * reach]);
            }
            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, lowsweepScene, 1, origin,
                { moment: "sweep", arc: arc, reach: reach, path: path, whirl: whirl ? 1 : 0, spark: spark, scale: scale }, 24);

            let hits = 0;
            WorldGeometry.selectBodies(world, WorldGeometry.bodySector(WorldCombat.point(origin.x(), feetY + .2, origin.z()), direction, reach, arc, { below: .2, above: .5 }),
                function (target, facts) {
                    if (hits >= 3 || world.friendly(target)) return;
                    const low = facts.boundsMin(), high = facts.boundsMax();
                    const contact = WorldCombat.point(Math.max(low.x(), Math.min(high.x(), origin.x())), Math.max(low.y(), feetY + .2), Math.max(low.z(), Math.min(high.z(), origin.z())));
                    if (!world.clear(WorldCombat.point(origin.x(), feetY + .2, origin.z()), contact)) return;
                    hits++;
                    const rolled = lowsweepCut(action, world, target, config);
                    const landed = hurt(action, target, "lowsweep", rolled.power,
                        { damage: damageSpec("lowsweep", "cut"), contact: true });
                    if (!landed) return;
                    NativeEffects.boost(world, target, "spe", -rolled.stages);
                    MobEffects.apply(world, target, lowsweepHobble, hobble, 0);
                    if (world.valid(target) && rolled.stages >= 2 && rootTicks > 0) WorldEffects.apply(world, target, "rooted", {}, rootTicks);
                    WorldFeedback.emit(world, lowsweepScene, 1, contact,
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
