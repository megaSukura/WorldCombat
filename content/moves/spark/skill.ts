/**
 * 电光 / spark 的出手方式。
 *
 * 核心念头：贴身的一点电——电花从全身窜起，一个箭步贴上去，撞实的一刻把电流灌进对方。
 * 它是本族里射程最短、出手最快、循环最短、也最没有代价的一招；对已经残血的目标尤其狠，适合收尾。
 *
 * 两幕：
 *   起（windup，提交前）：电花从全身窜起、向内收拢，只播预告。
 *   撞（dash → zap / fizzle）：提交后逐刻沿瞄准方向突进；trace 撞上活体即按 jolt 结算接触伤害，
 *       按 numbChance 灌入麻痹（共享状态），把目标顶开 push 格；目标本来已残（生命低于三成五）时威力更高、
 *       画面也更亮。冲到底或推不动就是空（fizzle），不自伤。
 *
 * 与同族分开：疯狂伏特与伏特攻击是带电的重装冲锋并反伤、火焰轮是滚动的火；电光的辨识点是那一点蓝白电花
 * 与最高的麻痹可靠性。配置 overcharge（蓄电式）由 resolve 改时序、由公式改威力/麻痹，提交后才触碰世界。
 */
namespace PokemonSkills {
    const sparkScene = "world_combat:move_spark";
    const sparkHitText = "world_combat.move.spark.text.hit";
    const sparkNumbText = "world_combat.move.spark.text.numb";
    const sparkFinishText = "world_combat.move.spark.text.finish";
    const sparkMissText = "world_combat.move.spark.text.miss";

    define({
        freeMovement: true,
        id: "spark",
        cooldownParameter: "recharge",
        name: "Spark",
        description: "迅速撞击目标，有机会使其麻痹。对残血目标的伤害更高。",
        uses: ["贴身把还没麻痹的对手挂上麻痹", "用最短的一手收掉一个残血的目标", "在缠斗里高频骚扰、逼对手换位"],
        kind: "enemy",
        range: 3.0,
        maxRange: 3.8,
        prepare: 5,
        active: 10,
        recover: 6,
        cooldown: 16,
        style: "spark",
        defaults: { overcharge: false, ai: { maxChase: 7, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spark", "radius", pokemon) * 1.6, geometry: "line", style: "spark",
                color: 0xFFE96A, label: config && config.overcharge === true ? "蓄电式电光" : "点射式电光" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spark"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("spark", "tempo", context)),
                recover: Math.round(p("spark", "aftercast", context)),
                cooldown: Math.round(p("spark", "recharge", context)),
                active: skills["spark"].active,
                range: p("spark", "reach", context) + 0.35
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_spark:charge", sparkScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", overcharge: !!(config && config.overcharge) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(sparkScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("spark", "reach", action);
            const pace = p("spark", "lunge", action);
            const radius = p("spark", "radius", action);
            const minimumMove = p("spark", "minimumMove", action);
            const power = p("spark", "jolt", action);
            const chance = p("spark", "numbChance", action);
            const numbTicks = Math.round(p("spark", "numbTicks", action));
            const arcs = Math.round(p("spark", "arcs", action));
            const push = p("spark", "push", action);
            const overcharge = !!(config && config.overcharge);
            const direction = aim(action);
            const scale = radius / 0.45;
            const intensity = Math.max(0.6, Math.min(2.2, power / 68));
            const start = action.origin();
            const end = start.plus(direction.scale(length));
            let travelled = 0, settled = false;

            sound(action, "cobblemon:move.thundershock.actor");
            movementScenes.show(action, "dash", start, { moment: "dash", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    arcs: arcs, scale: scale, intensity: intensity, overcharge: overcharge ? 1 : 0 });

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function fizzle(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, sparkScene, 1, body.position(),
                        { moment: "fizzle", arcs: arcs, scale: scale, intensity: intensity * 0.7 }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), sparkMissText, [], 20);
                }
                sound(current, "cobblemon:impact.electric");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { fizzle(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    let finisher = false;
                    if (target !== null && scope.valid(target)) {
                        const body = scope.observe(target);
                        if (body !== null && body.maxHealth() > 0) finisher = body.health() / body.maxHealth() < 0.35;
                    }
                    const already = target !== null && scope.valid(target) && CombatStatus.has(scope, target, "paralysis");
                    const landed = impact(current, hit, "spark", power,
                        { damage: damageSpec("spark", "jolt"), contact: true,
                            status: already ? "" : "paralysis", chance: already ? 0 : chance });
                    WorldFeedback.emit(scope, sparkScene, 1, point,
                        { moment: "zap", target: target ? String(target.ref()) : "", arcs: arcs, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power / 62)), finisher: finisher ? 1 : 0 }, 26);
                    sound(current, "cobblemon:move.thundershock.target");
                    sound(current, "cobblemon:impact.electric");
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), sparkHitText, [], 24);
                        if (finisher) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.7, 0)), sparkFinishText, [], 26);
                        if (!already && CombatStatus.has(scope, target, "paralysis"))
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 2.1, 0)), sparkNumbText, [], 28);
                    }
                    finish(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { fizzle(current); return; }
                movementScenes.show(current, "wake", origin, { moment: "wake", arcs: arcs, scale: scale, intensity: intensity });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
