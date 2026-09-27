/** A native body-box low fan catches feet inside its thin volume, regardless of the target centre height. */
namespace PokemonSkills {
    const lowsweepScene = "world_combat:move_lowsweep";
    const lowsweepHobble = "world_combat:lowsweep_hobble";
    const lowsweepHitText = "world_combat.move.lowsweep.text.hit";
    const lowsweepFastText = "world_combat.move.lowsweep.text.fast";
    const lowsweepMissText = "world_combat.move.lowsweep.text.miss";

    /** 用某个具体目标的现场事实求这一次扫踢的威力、掉速级数与别腿时长（目标此刻的实际水平速度只有这里读得到）。 */
    function lowsweepCut(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): { power: number; stages: number; rootTicks: number } {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["lowsweep"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return { power: p("lowsweep", "cut", context),
            stages: Math.max(1, Math.round(p("lowsweep", "slowStages", context))),
            rootTicks: Math.max(0, Math.round(p("lowsweep", "rootTicks", context))) };
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
            const whirl = !!(config && config.whirl);
            const scale = body === null ? 1 : (body.width() + body.height()) / 2.3;
            const feetY = origin.y() - (body === null ? 0.7 : body.height() / 2);
            const ground = feetY + 0.2;
            let hx = direction.x(), hz = direction.z();
            const flat = Math.sqrt(hx * hx + hz * hz);
            if (flat < 1e-6) { hx = 0; hz = 1; } else { hx /= flat; hz /= flat; }
            const base = Math.atan2(hz, hx), half = arc * Math.PI / 360;
            const pivot = WorldCombat.point(origin.x(), ground, origin.z());
            // 判定与表现共用同一片薄扇面的顶点：脚踝高度上的低弧尖，一格一格从一侧扫到另一侧。
            function tip(angle: number): CombatPoint {
                return WorldCombat.point(origin.x() + Math.cos(angle) * reach, ground, origin.z() + Math.sin(angle) * reach);
            }
            function blade(from: number, to: number): CombatPoint[] {
                return [pivot, tip(from), tip((from + to) / 2), tip(to)];
            }
            const scenes = WorldFeedback.actionScenes(lowsweepScene);
            const struck: { [ref: string]: boolean } = {};
            let hits = 0, settled = false;

            function finish(current: CombatAction, count: number): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                scenes.stop(current, "arc");
                if (count === 0) {
                    WorldFeedback.emit(scope, lowsweepScene, 1, origin, { moment: "miss", spark: spark, scale: scale }, 20);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.2, 0)), lowsweepMissText, [], 22);
                }
                sound(current, count > 0 ? "cobblemon:impact.fighting" : "minecraft:entity.player.attack.weak");
                done(current);
            }

            function step(current: CombatAction, index: number): void {
                if (settled) return;
                const scope = current.world();
                const from = base - half + (index / 6) * 2 * half;
                const to = base - half + ((index + 1) / 6) * 2 * half;
                const verts = blade(from, to);
                const path: number[][] = verts.map(function (point) { return [point.x(), point.y(), point.z()]; });
                scenes.show(current, "arc", verts[3],
                    { moment: "sweep", path: path, arc: arc, reach: reach, whirl: whirl ? 1 : 0, spark: spark,
                      density: Math.round(spark * 5), scale: scale,
                      progress: (index + 1) / 6, direction: [direction.x(), direction.y(), direction.z()] });
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon(verts, feetY, feetY + 0.7), function (target, facts) {
                    const ref = String(target.ref());
                    if (struck[ref] || hits >= 3 || scope.friendly(target)) return;
                    const low = facts.boundsMin(), high = facts.boundsMax();
                    const contact = WorldCombat.point(Math.max(low.x(), Math.min(high.x(), origin.x())),
                        Math.max(low.y(), ground), Math.max(low.z(), Math.min(high.z(), origin.z())));
                    if (!scope.clear(origin, contact)) return;
                    struck[ref] = true; hits++;
                    const rolled = lowsweepCut(current, scope, target, config);
                    if (!hurt(current, target, "lowsweep", rolled.power, { damage: damageSpec("lowsweep", "cut"), contact: true })) return;
                    NativeEffects.boost(scope, target, "spe", -rolled.stages);
                    MobEffects.apply(scope, target, lowsweepHobble, hobble, 0);
                    if (scope.valid(target) && rolled.stages >= 2 && rolled.rootTicks > 0) WorldEffects.apply(scope, target, "rooted", {}, rolled.rootTicks);
                    WorldFeedback.emit(scope, lowsweepScene, 1, contact,
                        { moment: "hit", target: ref, stages: rolled.stages, spark: spark,
                            intensity: Math.max(0.6, Math.min(2.2, rolled.power / 55)), scale: scale }, 24);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                        rolled.stages >= 2 ? lowsweepFastText : lowsweepHitText, [rolled.stages], 24);
                });
                if (index + 1 >= 6) { finish(current, hits); return; }
                current.after(1, function (next: CombatAction) { step(next, index + 1); });
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            step(action, 0);
        }
    });
}
