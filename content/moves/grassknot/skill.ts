/**
 * 打草结 / grassknot 的出手方式。
 *
 * 核心念头：把脚下这片地的草与根须叫起来，让对手被自己的分量带倒。施法者自始至终不碰对手——
 * 它做的只是「把地交给对手」。对手越重，这一跤摔得越狠。
 *
 * 输入：`kind: "aim"`——可以点地面、也可直接点实体；提交时不需要存在敌人，空放只长出草结再自己收掉。
 * 落点会吸附到所选位置下方最近的合法地表（水、岩浆、基岩不算），找不到近地就按空中点失败。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：俯身把手按进土里，草种沿地面朝落点钻去。
 *   芽（sprout）：提交后在落点脚下展开一圈**低伏**的根结，等一个延迟——延迟里走出圈、或跳离地面，都躲开这一绊。
 *   绊（snap/trip）：延迟一到根结收拢；**双脚有实际支撑且仍在圈内**的敌人吃 `snare` 伤害并被缠住。
 *       伤害先按各自体重结算（重 Boss 免控也照吃），缠结状态以真实回执为准：拿到 `tripped` 身份才在腿上收结、掉速。
 *       没有换草皮、没有留在地上的东西——本招在世界里不留装饰。
 *
 * 提交后才触碰世界；`windup` 只用 action.present 与 action.sense()。伤害按每个目标各自的体重分别求值。
 */
namespace PokemonSkills {
    const grassknotScene = "world_combat:move_grassknot";
    const grassknotSnareEffect = "world_combat:grassknot_snare";
    const grassknotTripText = "world_combat.move.grassknot.text.trip";
    const grassknotHitText = "world_combat.move.grassknot.text.hit";
    const grassknotMissText = "world_combat.move.grassknot.text.miss";
    /** 表现里的参考半径：`data.scale = 实际缠结范围 / 这个数`，让地面环与判定同半径。 */
    const grassknotReferenceRadius = 2.4;
    /** 落点吸附地表时最多向下找几格；再深就当作空中点失败。 */
    const grassknotGroundDrop = 5;

    /** 用某个具体目标的事实求这一次缠绊的威力；目标体重只有在这里才读得到。 */
    function grassknotStrike(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["grassknot"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("grassknot", "snare", context);
    }

    /** 绊住一个目标：先挂共享身份 `tripped` 的 MobEffect，拿到回执后才掉速度等级、锁步。返回控制是否真的成立。 */
    function grassknotTrip(world: CombatWorld, target: CombatActor, stages: number, rootTicks: number, tripTicks: number): boolean {
        const snare = MobEffects.apply(world, target, grassknotSnareEffect, Math.max(20, Math.round(tripTicks)), 0);
        if (snare === null) return false;
        NativeEffects.boost(world, target, "spe", -Math.max(1, stages));
        WorldEffects.apply(world, target, "rooted", {}, Math.max(6, Math.round(rootTicks)));
        return true;
    }

    define({
        id: "grassknot",
        name: "Grass Knot",
        description: "把脚下的草与根须叫起来，让对手被自己的分量带倒：对手越重摔得越狠。它在选定处展开一圈低伏的根结，稍等片刻后收拢，把还站在圈里、双脚着地的人绊住：跳起来或走出这圈就躲开。缠绞式缠得更久更广但收得更慢。",
        uses: ["让笨重的目标自己被分量带倒", "在对手脚下封住一片落脚地", "远程削弱高速或高攻的重型对手"],
        kind: "aim",
        range: 6,
        maxRange: 11,
        prepare: 8,
        active: 40,
        recover: 7,
        cooldown: 26,
        style: "plant",
        defaults: { knot: false, ai: { maxChase: 12, minMass: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["grassknot"], detail: { values: config } };
            return { radius: p("grassknot", "snareRadius", context), geometry: "area", style: "plant", color: 0x6FA34A, label: "打草结" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["grassknot"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const knot = !!(config && config.knot);
            return {
                prepare: Math.max(1, Math.round(p("grassknot", "prepare", context))),
                recover: Math.round(p("grassknot", "recover", context)) + (knot ? 2 : 0),
                cooldown: Math.round(p("grassknot", "cooldown", context)) + (knot ? 8 : 0),
                range: p("grassknot", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_grassknot:windup", grassknotScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", knot: !!(config && config.knot) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            action.releaseTarget();
            const world = action.world();
            const raw = action.targetPosition();
            const landing = WorldGeometry.ground(world, raw, grassknotGroundDrop);
            const radius = p("grassknot", "snareRadius", action);
            const delay = Math.max(4, Math.round(p("grassknot", "snareDelay", action)));
            const scale = radius / grassknotReferenceRadius;
            const scenes = WorldFeedback.actionScenes(grassknotScene);

            sound(action, "minecraft:block.rooted_dirt.place");
            // 低伏的根结在延迟里伏着；它随施放动作存在，动作一收就清理，不会在驱散后继续播放。
            scenes.show(action, "sprout", landing, { moment: "sprout", radius: radius, scale: scale, delay: delay });

            action.after(delay, function (current) {
                const scope = current.world();
                const rootTicks = Math.max(6, Math.round(p("grassknot", "rootTicks", current)));
                const tripTicks = Math.max(30, Math.round(p("grassknot", "tripTicks", current)));
                const stages = Math.max(1, Math.round(p("grassknot", "tripStages", current)));
                let caught = 0, bound = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(landing, 0, radius, { below: 1.5, above: 2.5 }),
                    function (target, facts) {
                        // 只有真正站在地上（有脚下支撑）的人才在圈内被收结；跳离地面整发躲开。
                        if (!facts.grounded()) return;
                        const power = grassknotStrike(current, scope, target, config);
                        const landed = hurt(current, target, "grassknot", power, { damage: damageSpec("grassknot", "snare") });
                        if (!landed) return;
                        caught++;
                        // 控制成立才在腿上收结；Boss 免控时主击照常结算，不假装缠住、也不强拉倒。
                        if (grassknotTrip(scope, target, stages, rootTicks, tripTicks)) {
                            bound++;
                            WorldFeedback.emit(scope, grassknotScene, 1, facts.position(),
                                { moment: "trip", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.2, power / 70)),
                                    coils: 8 + stages * 4 }, 30);
                        }
                    });
                scenes.stop(current, "sprout");
                WorldFeedback.emit(scope, grassknotScene, 1, landing,
                    { moment: caught > 0 ? "snap" : "empty", radius: radius, scale: scale, caught: caught, bound: bound }, 30);
                sound(current, caught > 0 ? "cobblemon:impact.grass" : "minecraft:block.grass.break");
                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.2, 0)),
                    caught > 0 && bound > 0 ? grassknotTripText : caught > 0 ? grassknotHitText : grassknotMissText,
                    caught > 0 ? [bound > 0 ? bound : caught] : [], 26);
                done(current);
            });
        }
    });
}
