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
 * 伤害与降速/绊住参数都按每个实际受害者各自的体重分别求值：空瞄到重怪、或顺腿带倒的副目标，都用它自己的数据。提交后才触碰世界。
 */
namespace PokemonSkills {
    const lowkickScene = "world_combat:move_lowkick";
    const lowkickStaggerEffect = "world_combat:lowkick_stagger";
    const lowkickHitText = "world_combat.move.lowkick.text.hit";
    const lowkickAirText = "world_combat.move.lowkick.text.air";
    const lowkickMissText = "world_combat.move.lowkick.text.miss";

    /** 用某个具体目标的事实求这一次扫踢；威力与所有重量相关控制都读实际受害者的身体数据。 */
    function lowkickContext(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): NumberContext {
        return { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["lowkick"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
    }

    /** 扫倒一个目标：挂共享身份 tripped 的 MobEffect、掉速度等级、短时间无法迈步。返回控制是否真的成立。 */
    function lowkickTrip(world: CombatWorld, target: CombatActor, stages: number, rootTicks: number, tripTicks: number): { slow: boolean; root: boolean } {
        const stagger = MobEffects.apply(world, target, lowkickStaggerEffect, Math.max(20, Math.round(tripTicks)), 0);
        const slow = stagger !== null;
        if (slow) NativeEffects.boost(world, target, "spe", -Math.max(1, stages));
        const root = WorldEffects.apply(world, target, "rooted", {}, Math.max(5, Math.round(rootTicks))) > 0;
        return { slow: slow, root: root };
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
        cooldownParameter: "recharge",
        style: "contact",
        defaults: { reap: false, ai: { maxChase: 6, minMass: 0, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: 0.8, geometry: "line", style: "contact", color: 0xC97B4A, label: "踢倒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["lowkick"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(1, Math.round(p("lowkick", "tempo", context))),
                recover: Math.round(p("lowkick", "aftercast", context)),
                cooldown: Math.round(p("lowkick", "recharge", context)),
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

            /** 结算对一名目标的扫踢；威力与绊倒参数都读这一个实际受害者，腾空者只被擦到。返回是否命中。 */
            function strike(current: CombatAction, target: CombatActor, point: CombatPoint, chained: boolean): boolean {
                const scope = current.world();
                const facts = scope.observe(target);
                const airborne = facts !== null && !facts.grounded();
                const aimed = lowkickContext(current, scope, target, config);
                let power = p("lowkick", "sweep", aimed);
                if (airborne) power *= penalty;
                const landed = hurt(current, target, "lowkick", power,
                    { damage: damageSpec("lowkick", "sweep"), contact: true });
                if (!landed) return false;
                const stages = Math.max(1, Math.round(p("lowkick", "tripStages", aimed)));
                const rootTicks = Math.max(5, Math.round(p("lowkick", "rootTicks", aimed)));
                const tripTicks = Math.max(20, Math.round(p("lowkick", "tripTicks", aimed)));
                const coils = 6 + stages * 3;
                const moment = chained ? "follow" : airborne ? "graze" : "impact";
                WorldFeedback.emit(scope, lowkickScene, 1, point,
                    { moment: moment, target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.2, power / 70)),
                        airborne: airborne ? 1 : 0, coils: coils, arc: arcRange, direction: directionData }, 26);
                if (!airborne && scope.valid(target)) {
                    // 回执区分减速（身份）与 root：只有 root 也真的落地时才在表现里标记绊住。
                    const control = lowkickTrip(scope, target, stages, rootTicks, tripTicks);
                    if (control.slow)
                        WorldFeedback.emit(scope, lowkickScene, 1, point,
                            { moment: "trip", target: String(target.ref()), root: control.root ? 1 : 0,
                                coils: coils, arc: arcRange, direction: directionData }, 22);
                }
                if (facts !== null)
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                        airborne ? lowkickAirText : lowkickHitText, [], 22);
                return true;
            }

            /** 扫堂式：顺着这一脚的侧前方腿弧，把主目标旁一小段内、从接触点看得见的另一名敌人也带倒。 */
            function follow(current: CombatAction, primaryRef: string, point: CombatPoint): void {
                const scope = current.world();
                const arc = WorldGeometry.sector(point, direction, arcRange, arcDegrees, { below: 1.2, above: 1.6 });
                let extras = 0;
                WorldGeometry.selectEnemies(scope, arc,
                    function (other, facts) {
                        if (extras >= 1 || String(other.ref()) === primaryRef) return;
                        // 隔墙或不在同一侧的人不会被顺腿带倒。
                        if (!scope.clear(point, facts.position())) return;
                        extras++;
                        // 用副目标自己的真实位置做反馈点，不再冒充主接触点。
                        strike(current, other, facts.position(), true);
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
                        // 主目标被这一脚击杀也照常完成既定扫弧：用已记下的身份排除它自己即可。
                        if (reap) follow(current, String(target.ref()), point);
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
