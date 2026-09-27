/**
 * 打草结 / grassknot 的出手方式。
 *
 * 核心念头：把脚下这片地的草与根须叫起来，让对手被自己的分量带倒。施法者自始至终不碰对手——
 * 它做的只是「把地交给对手」。对手越重，这一跤摔得越狠。
 *
 * 输入：`kind: "aim"`——可以点地面、也可直接点实体；提交时不需要存在敌人，空放只长出草结再自己收掉。
 * 落点必须是所选位置下方真实的合法地表（水、岩浆、基岩不算），找不到真实支撑就按空中点失败，不回退成草地。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：俯身把手按进土里，草种沿地面朝落点钻去。
 *   芽（sprout）：提交后在落点脚下展开一圈**低伏**的根结，等一个延迟——延迟里走出圈、或跳离地面，都躲开这一绊。
 *   绊（snap/trip）：延迟一到根结收拢；**双脚有实际支撑、与落点同层且无墙相隔、仍在圈内**的敌人吃 `snare` 伤害并被缠住。
 *       伤害、绊住时长、失衡时长与掉速等级都按各自目标的事实分别求值（重 Boss 免控也照吃）。
 *       缠结状态以真实回执为准：拿到 `tripped` 身份才在腿上收结、掉速。掉速是带归属的临时窗口，到期归还，
 *       不与载体自带移速相乘叠加；总失衡减速按本招自己的掉速等级公开计算（最高 3 级），对所有实体一致。
 *       没有换草皮、没有留在地上的东西——本招在世界里不留装饰。
 *
 * 提交后才触碰世界；`windup` 只用 action.present 与 action.sense()。
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

    /** 用某个具体目标的事实求这一次缠绊的完整画像：威力、绊住、失衡与掉速都读该目标。 */
    function grassknotProfile(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): { power: number; rootTicks: number; tripTicks: number; stages: number } {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["grassknot"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return {
            power: p("grassknot", "snare", context),
            rootTicks: Math.max(6, Math.round(p("grassknot", "rootTicks", context))),
            tripTicks: Math.max(20, Math.round(p("grassknot", "tripTicks", context))),
            stages: Math.max(1, Math.min(3, Math.round(p("grassknot", "tripStages", context))))
        };
    }

    /** 绊住一个目标：挂共享身份 `tripped` 的 MobEffect，再挂一个由该载体拥有的临时掉速窗口（到期自动归还），并短时 root。 */
    function grassknotTrip(world: CombatWorld, target: CombatActor, stages: number, rootTicks: number, tripTicks: number): boolean {
        const life = Math.max(20, Math.round(tripTicks));
        const snare = MobEffects.apply(world, target, grassknotSnareEffect, life, 0);
        if (snare === null) return false;
        NativeEffects.boostWindow(world, target, { spe: -Math.max(1, stages) }, life, "world_combat:grassknot", snare);
        WorldEffects.apply(world, target, "rooted", {}, Math.max(6, Math.round(rootTicks)));
        return true;
    }

    define({
        id: "grassknot",
        name: "Grass Knot",
        description: "把脚下的草与根须叫起来，让对手被自己的分量带倒：对手越重摔得越狠。它在选定处展开一圈低伏的根结，稍等片刻后收拢，把还站在圈里、双脚着地、与落点同层的人绊住：跳起来、走出这圈或隔着一堵墙都躲开。缠绞式缠得更久更广但收得更慢。",
        uses: ["让笨重的目标自己被分量带倒", "在对手脚下封住一片落脚地", "远程削弱高速或高攻的重型对手"],
        kind: "aim",
        range: 6,
        maxRange: 11,
        prepare: 8,
        active: 40,
        recover: 7,
        cooldown: 26,
        cooldownParameter: "rest",
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
                prepare: Math.max(1, Math.round(p("grassknot", "charge", context))),
                recover: Math.round(p("grassknot", "settle", context)) + (knot ? 2 : 0),
                cooldown: Math.round(p("grassknot", "rest", context)) + (knot ? 8 : 0),
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
            const landing = SurfacePaths.support(world, raw, 1, grassknotGroundDrop);
            const radius = p("grassknot", "snareRadius", action);
            const delay = Math.max(4, Math.round(p("grassknot", "snareDelay", action)));
            const scale = radius / grassknotReferenceRadius;
            const scenes = WorldFeedback.actionScenes(grassknotScene);
            if (!landing) {
                // ground() 会在找不到地表时回退成空中点；这里明确当成失败，不再长出草结。
                WorldFeedback.emit(world, grassknotScene, 1, raw, { moment: "empty", radius: radius, scale: scale, caught: 0, bound: 0 }, 22);
                WorldFeedback.text(world, raw.plus(WorldCombat.point(0, 1.2, 0)), grassknotMissText, [], 24);
                sound(action, "minecraft:block.grass.break");
                done(action);
                return;
            }
            sound(action, "minecraft:block.rooted_dirt.place");
            // 低伏的根结在延迟里伏着；它随施放动作存在，动作一收就清理，不会在驱散后继续播放。
            scenes.show(action, "sprout", landing, { moment: "sprout", radius: radius, scale: scale, delay: delay });

            action.after(delay, function (current) {
                const scope = current.world();
                let caught = 0, bound = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(landing, 0, radius, { below: 1.5, above: 2.5 }),
                    function (target, facts) {
                        // 只有真正站在地上（有脚下支撑）的人才在圈内被收结；跳离地面整发躲开。
                        if (!facts.grounded()) return;
                        const feet = facts.boundsMin();
                        const support = SurfacePaths.support(scope, WorldCombat.point(feet.x(), feet.y() + 0.1, feet.z()), 1, 3);
                        if (!support) return;
                        // 同层连通：足底支撑与落点同一层，且两者之间没有墙，隔墙或楼下都不受影响。
                        if (Math.abs(support.y() - landing.y()) > 1.0) return;
                        if (WorldGeometry.blockHit(scope, landing.plus(WorldCombat.point(0, 0.1, 0)), support.plus(WorldCombat.point(0, 0.1, 0))) !== null) return;
                        const profile = grassknotProfile(current, scope, target, config);
                        const landed = hurt(current, target, "grassknot", profile.power, { damage: damageSpec("grassknot", "snare") });
                        if (!landed) return;
                        caught++;
                        // 控制成立才在腿上收结；Boss 免控时主击照常结算，不假装缠住、也不强拉倒。
                        if (grassknotTrip(scope, target, profile.stages, profile.rootTicks, profile.tripTicks)) {
                            bound++;
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

    // 腿结跟真实载体走：tripped 期间由效果自己的 tick 维持腿上藤结，效果结束或驱散后自然收掉。
    WorldCombat.on("world_combat:move_grassknot/snare-keep", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== grassknotSnareEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_grassknot/snare/" + String(actor.ref()), grassknotScene, 1,
            body.position(), { moment: "trip", target: String(actor.ref()) }, 40);
    });
}
