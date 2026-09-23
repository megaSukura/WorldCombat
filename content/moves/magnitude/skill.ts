/**
 * 震级 / magnitude 的出手方式。
 *
 * 核心念头：沉身压地，地面在原地横颤——抖得多大当场掷定，震级越大尘跳得越高、圈里被颠得越狠，
 *   震级够大时正在出手的人会被抖断动作。它不像地震那样把整块地掀起来，只是原地颤。
 *
 * 与同族分开：地震一次掀地、把人向上抛、留放射状深缝；重踏的地裂贴地向外推、削速度；
 *   震级是原地横颤、威力当场随机、够大就打断动作、什么都不留。
 *
 * 三幕（+ 可选的断招）：
 *   起（windup，提交前）：沉身、脚边起屑的预告，只播表现。
 *   震（shake → hit）：提交后当场掷震级，圈里每个站在地上的非友方各挨 `quake × 震级系数`，
 *       被上颠 `jolt`、沿离中心方向踉跄 `stagger` 格。
 *   断（stagger）：震级 ≥ `fracture` 时，被震到的人正在进行的动作被中断（world_combat:interrupt）。
 *   收（settle / miss）：尘落定；圈里没人站在地上就播空震。
 *
 * 震级掷定（原生 100 面骰的比例，深源式整体 +1）：
 *   4 → 5% / 5 → 10% / 6 → 20% / 7 → 30% / 8 → 20% / 9 → 10% / 10 → 5%；
 *   威力按原生比例相对震级 7 缩放（×0.14/0.43/0.71/1/1.29/1.57/2.14）。
 */
namespace PokemonSkills {
    const magnitudeScene = "world_combat:move_magnitude";
    const magnitudeHitText = "world_combat.move.magnitude.text.hit";
    const magnitudeMissText = "world_combat.move.magnitude.text.miss";
    const magnitudeBreakText = "world_combat.move.magnitude.text.break";

    /** 原生 `onModifyMove` 的 100 面骰；深源式整体 +1（下限抬高、期望更高）。 */
    function magnitudeRoll(world: CombatWorld, fault: boolean): number {
        const r = world.random() * 100;
        const roll = r < 5 ? 4 : r < 15 ? 5 : r < 35 ? 6 : r < 65 ? 7 : r < 85 ? 8 : r < 95 ? 9 : 10;
        return fault ? Math.min(10, roll + 1) : roll;
    }

    /** 原生的震级 → 威力比例，相对震级 7（威力 70）缩放。 */
    function magnitudeFactor(magnitude: number): number {
        switch (magnitude) {
            case 4: return 10 / 70;
            case 5: return 30 / 70;
            case 6: return 50 / 70;
            case 8: return 90 / 70;
            case 9: return 110 / 70;
            case 10: return 150 / 70;
            default: return 1;
        }
    }

    define({
        id: "magnitude",
        cooldownParameter: "recharge",
        name: "Magnitude",
        description: "沉身压地，地面在原地横颤：圈内站在地上的敌人各挨一记，震级当场掷定（4..10），越大越重；震级够大时正在出手的人会被抖断动作。深源式震级更高、震幅更广、更容易打断，但更慢。",
        uses: ["一次震到身周一圈站在地上的敌人", "抖断正在蓄招/出手的对手", "跳过空中的目标，专打站桩的对手", "在低冷却里反复骚扰"],
        kind: "self",
        range: 3.8,
        maxRange: 6.2,
        prepare: 13,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "quake",
        defaults: { fault: false, ai: { maxChase: 7, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("magnitude", "shudder", pokemon), geometry: "area", style: "quake",
                color: 0x8A7A62, label: config && config.fault === true ? "深源式" : "浅源式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["magnitude"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(5, Math.round(p("magnitude", "tempo", context))),
                recover: Math.max(3, Math.round(p("magnitude", "aftercast", context))),
                cooldown: Math.max(10, Math.round(p("magnitude", "recharge", context))),
                active: skills["magnitude"].active,
                range: p("magnitude", "shudder", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("magnitude:brace", magnitudeScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", fault: config && config.fault === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.2, p("magnitude", "shudder", action));
            const base = p("magnitude", "quake", action);
            const jolt = p("magnitude", "jolt", action);
            const stagger = p("magnitude", "stagger", action);
            const fracture = Math.max(4, Math.round(p("magnitude", "fracture", action)));
            const crests = Math.max(2, Math.round(p("magnitude", "crests", action)));
            const dust = Math.max(10, Math.round(p("magnitude", "dust", action)));
            const cap = Math.max(1, Math.round(p("magnitude", "maxTargets", action)));
            const fault = !!(config && config.fault);
            const magnitude = magnitudeRoll(world, fault);
            const power = base * magnitudeFactor(magnitude);
            const scale = radius / 3.8;
            let hits = 0, broken = 0;

            sound(action, "cobblemon:impact.ground");
            WorldFeedback.emit(world, magnitudeScene, 1, centre,
                { moment: "shake", radius: radius, magnitude: magnitude, crests: crests, dust: dust, scale: scale,
                    intensity: Math.max(0.4, Math.min(2.4, power / 70)) }, 30);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 2, above: 1.5 }),
                function (enemy, facts) {
                    if (hits >= cap) return;
                    if (!facts.grounded()) return;
                    if (!hurt(action, enemy, "magnitude", power, { damage: damageSpec("magnitude", "quake") })) return;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (world.valid(enemy)) {
                        if (away.length() > 0.2) world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(stagger));
                        if (jolt > 0) world.motion(enemy, WorldCombat.point(0, jolt, 0), true);
                        if (magnitude >= fracture) {
                            world.deliver(enemy, "world_combat:interrupt");
                            broken++;
                            WorldFeedback.emit(world, magnitudeScene, 1, facts.position(),
                                { moment: "stagger", target: String(enemy.ref()), magnitude: magnitude, scale: scale }, 24);
                        }
                    }
                    WorldFeedback.emit(world, magnitudeScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), magnitude: magnitude, scale: scale,
                            intensity: Math.max(0.4, Math.min(2.4, power / 70)), dust: dust }, 22);
                });

            WorldFeedback.emit(world, magnitudeScene, 1, centre,
                { moment: hits > 0 ? "settle" : "miss", radius: radius, magnitude: magnitude, crests: crests, dust: dust,
                    scale: scale, hits: hits, broken: broken }, 26);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? magnitudeHitText : magnitudeMissText, hits > 0 ? [magnitude, hits] : [magnitude], 26);
            if (broken > 0)
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.6, 0)), magnitudeBreakText, [broken], 26);
            done(action);
        }
    });
}
