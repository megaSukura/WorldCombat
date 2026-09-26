/**
 * 踢倒 / lowkick 的出手方式。
 *
 * 核心念头：一记专扫支撑腿的下段快踢。目标越重，重心越难拉回，这一跤越狠——分量不在施法者身上，而在对手身上。
 * 它贴身、快、便宜：没有草、没有延迟、没有留在地上的东西，只有一次贴近和一次收腿。
 *
 * 两幕（提交前只播预告）：
 *   起（windup）：压低重心、把脚放稳。
 *   踢（dash → strike）：提交后沿瞄准方向短促突进；trace 碰到活体的一刻结算 `sweep` 接触伤害。
 *       目标**双脚离地**时扫不到腿：只有半伤、不绊倒（airbornePenalty），画面改用擦过而非扬尘。
 *       命中后目标被扫倒：挂 MobEffect 身份 tripped、掉速度等级、短时间无法迈步。
 *       扫堂式（reap）顺着这一脚的方向，把主目标侧前方一小段腿弧内、且从接触点看得见的另一名敌人也带倒；
 *       不在背后、隔墙的人不会被自动扫到。冲到底或撞墙算落空，收腿扬尘。
 *
 * 输入：`kind: "aim"`——方向、点或实体都行；提交时不要求存在敌人，空踢只扬尘。
 * 伤害按每个目标各自的体重分别求值。提交后才触碰世界。
 */
namespace PokemonSkills {
    const lowkickScene = "world_combat:move_lowkick";
    const lowkickStaggerEffect = "world_combat:lowkick_stagger";
    const lowkickHitText = "world_combat.move.lowkick.text.hit";
    const lowkickAirText = "world_combat.move.lowkick.text.air";
    const lowkickMissText = "world_combat.move.lowkick.text.miss";

    /** 用某个具体目标的事实求这一次扫踢的威力；目标体重只有在这里才读得到。 */
    function lowkickStrike(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["lowkick"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("lowkick", "sweep", context);
    }

    /** 扫倒一个目标：挂共享身份 tripped 的 MobEffect、掉速度等级、短时间无法迈步。返回控制是否真的成立。 */
    function lowkickTrip(world: CombatWorld, target: CombatActor, stages: number, rootTicks: number, tripTicks: number): boolean {
        const stagger = MobEffects.apply(world, target, lowkickStaggerEffect, Math.max(20, Math.round(tripTicks)), 0);
        if (stagger === null) return false;
        NativeEffects.boost(world, target, "spe", -Math.max(1, stages));
        WorldEffects.apply(world, target, "rooted", {}, Math.max(5, Math.round(rootTicks)));
        return true;
    }

    define({
        freeMovement: true,
        id: "lowkick",
        name: "Low Kick",
        description: "一记专扫支撑腿的下段快踢：对手越重，重心越难拉回，摔得越狠。它贴身、快、便宜，没有留在地上的东西；对双脚离地的人扫不到腿，只有半伤。扫堂式顺着这一脚的侧前方腿弧，把从接触点看得见的另一名敌人也带倒，但背后或隔墙的人扫不到。",
        uses: ["贴身扫倒笨重的目标", "打断靠腿脚起势的冲锋", "对高攻重型对手做一记便宜的快踢"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.6,
        prepare: 6,
        active: 20,
        recover: 6,
        cooldown: 18,
        style: "contact",
        defaults: { reap: false, ai: { maxChase: 6, minMass: 0, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: 0.8, geometry: "line", style: "contact", color: 0xC97B4A, label: "踢倒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["lowkick"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const reap = !!(config && config.reap);
            return {
                prepare: Math.max(1, Math.round(p("lowkick", "prepare", context))),
                recover: Math.round(p("lowkick", "recover", context)) + (reap ? 2 : 0),
                cooldown: Math.round(p("lowkick", "cooldown", context)) + (reap ? 6 : 0),
                range: p("lowkick", "lunge", context) + 0.35
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lowkick:windup", lowkickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", reap: !!(config && config.reap) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            action.releaseTarget();
            const movementScenes = WorldFeedback.actionScenes(lowkickScene);
            const world = action.world();
            const length = p("lowkick", "lunge", action);
            const speed = p("lowkick", "speed", action);
            const radius = p("lowkick", "collisionRadius", action);
            const stages = Math.max(1, Math.round(p("lowkick", "tripStages", action)));
            const rootTicks = Math.max(5, Math.round(p("lowkick", "rootTicks", action)));
            const tripTicks = Math.max(20, Math.round(p("lowkick", "tripTicks", action)));
            const penalty = Math.max(0.1, Math.min(1, p("lowkick", "airbornePenalty", action)));
            const arcRange = p("lowkick", "followRange", action);
            const arcDegrees = p("lowkick", "followArc", action);
            const reap = !!(config && config.reap);
            const direction = aim(action);
            const directionData = [direction.x(), direction.y(), direction.z()];
            const scale = radius / 0.4;
            let travelled = 0, settled = false;

            movementScenes.show(action, "dash", action.origin(), { moment: "dash", scale: scale, stride: Math.max(3, Math.round(length / 0.7)), direction: directionData });
            sound(action, "minecraft:entity.player.attack.sweep");

            function settle(current: CombatAction, moment: string, textKey: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, lowkickScene, 1, body.position(),
                        { moment: moment, scale: scale, brake: 6 }, 22);
                    if (textKey) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), textKey, [], 22);
                }
                sound(current, moment === "miss" ? "minecraft:entity.player.attack.weak" : "cobblemon:impact.fighting");
                movementScenes.finish(current, done);
            }

            /** 结算对一名目标的扫踢；腾空者只被擦到，画面用擦过而非扬尘。返回是否命中。 */
            function strike(current: CombatAction, target: CombatActor, point: CombatPoint, chained: boolean): boolean {
                const scope = current.world();
                const facts = scope.observe(target);
                const airborne = facts !== null && !facts.grounded();
                let power = lowkickStrike(current, scope, target, config);
                if (airborne) power *= penalty;
                const landed = hurt(current, target, "lowkick", power,
                    { damage: damageSpec("lowkick", "sweep"), contact: true });
                const moment = chained ? "follow" : airborne ? "graze" : "impact";
                WorldFeedback.emit(scope, lowkickScene, 1, point,
                    { moment: moment, target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.2, power / 70)),
                        airborne: airborne ? 1 : 0, coils: 6 + stages * 3, direction: directionData }, 26);
                if (landed && !airborne && scope.valid(target) && lowkickTrip(scope, target, stages, rootTicks, tripTicks))
                    WorldFeedback.emit(scope, lowkickScene, 1, point,
                        { moment: "trip", target: String(target.ref()), coils: 6 + stages * 3, direction: directionData }, 22);
                if (facts !== null)
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                        airborne ? lowkickAirText : lowkickHitText, [], 22);
                return landed;
            }

            /** 扫堂式：顺着这一脚的侧前方腿弧，把主目标旁一小段内、从接触点看得见的另一名敌人也带倒。 */
            function follow(current: CombatAction, primary: CombatActor, point: CombatPoint): void {
                const scope = current.world();
                if (scope.friendly(primary)) return;
                const arc = WorldGeometry.sector(point, direction, arcRange, arcDegrees, { below: 1.2, above: 1.6 });
                let extras = 0;
                WorldGeometry.selectEnemies(scope, arc,
                    function (other, facts) {
                        if (extras >= 1 || String(other.ref()) === String(primary.ref())) return;
                        // 隔墙或不在同一侧的人不会被顺腿带倒。
                        if (!scope.clear(point, facts.position())) return;
                        extras++;
                        strike(current, other, point, true);
                    });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { settle(current, "miss", lowkickMissText); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    if (target !== null && !scope.friendly(target)) {
                        strike(current, target, point, false);
                        if (reap && scope.valid(target)) follow(current, target, point);
                        settle(current, "impact", "");
                        return;
                    }
                    settle(current, "miss", lowkickMissText);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) { settle(current, "miss", lowkickMissText); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
