/**
 * 舌舔 / lick 的出手方式。
 *
 * 念头的形状：舔一下嘴、舌尖聚起唾液（windup，提交前只播预告）→ 长舌朝瞄准方向逐刻一伸一收（lash）：
 * 舌前端每次只探出这一小段，用原生 trace 只检测**新伸出的短段**；碰到第一个身体或方块就立刻停伸，
 * 从实际接触长度开始回收。舔中敌人则轻轻咬伤并可能麻住（impact），缠绕式再把目标用 hitDisplace 拉一段
 * （沿原生抗击退/事件结算，被抗性挡住就只舔中、不搬动）；落空或撞墙只留一小撮唾液（miss）。
 *
 * 判定：`kind: "aim"`——方向、点或空甩都行，提交时不要求存在敌人。沿嘴到前端逐段做 `action.trace(..., true)`，
 * 第一个实体（含同伴）或方块就是舌头真实的接触点，所以横穿舌尖的人会在舌头扫到它的那一瞬受击，而不是等到
 * 伸满才判。前排的同伴或敌人、墙都会先挡住舌头；表现每刻画到同一个真实前端。
 * 表现用 `WorldFeedback.actionScenes` 每刻把舌头画到同一前端，接触后从实际长度回收。提交后才触碰世界。
 */
namespace PokemonSkills {
    const lickScene = "world_combat:move_lick";
    const lickHitText = "world_combat.move.lick.text.hit";
    const lickMissText = "world_combat.move.lick.text.miss";
    const lickDragText = "world_combat.move.lick.text.drag";

    define({
        id: "lick",
        name: "Lick",
        description: "用一条远超普通近战的长舌朝选定方向一伸一收地舔一下：舌头逐刻探出，碰到第一个身体或墙就停在接触点，伤害很轻，但出手非常快，目标很可能被这一下麻住；缠绕式还能把它朝身前拽一段（受原生抗击退限制）。可以空甩，前排的同伴或敌人、墙都会先挡住舌头。",
        uses: ["从近战够不到的距离舔一个目标", "给还没发麻的对手补一下麻痹", "把舔中的目标朝身前拽一段"],
        kind: "aim",
        range: 4,
        maxRange: 7,
        prepare: 5,
        active: 18,
        recover: 8,
        cooldown: 24,
        style: "lash",
        defaults: { coil: false, ai: { maxChase: 6, opening: "unparalyzed" } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["lick"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var coil = !!(config && config.coil);
            return {
                prepare: p("lick", "prepare", context) + (coil ? 3 : 0),
                recover: p("lick", "recover", context) + (coil ? 3 : 0),
                cooldown: p("lick", "cooldown", context) + (coil ? 6 : 0),
                range: p("lick", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lick:windup", lickScene, 1, action.origin(), JSON.stringify({ moment: "windup", coil: !!(config && config.coil) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const selfBody = world.observe(actor);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const mouth = origin.plus(WorldCombat.point(0, 0.55, 0));
            const mouthArr = [mouth.x(), mouth.y(), mouth.z()];
            const power = p("lick", "lick", action);
            const chance = p("lick", "numbChance", action);
            const reach = p("lick", "reach", action);
            const radius = p("lick", "radius", action);
            const pull = p("lick", "pull", action);
            const lash = Math.max(2, Math.round(p("lick", "lashTicks", action)));
            const retract = Math.max(2, Math.min(4, lash - 1));
            const direction = aim(action);
            const anchored = action.targetPosition();
            const toTarget = anchored.minus(mouth);
            // 方向固定为射向所选点/方向；选定点更近时舌头只伸到那里。
            const aiming = toTarget.length() < 0.01 ? direction : toTarget.unit();
            const span = Math.max(0.3, Math.min(reach, toTarget.length() < 0.5 ? reach : toTarget.length()));
            const tongue = WorldFeedback.actionScenes(lickScene);
            const selfRef = String(actor.ref());
            let victim: CombatActor | null = null, dragLeft = 0, dragShown = false;

            sound(action, "cobblemon:move.lick.target");

            function showFront(current: CombatAction, at: CombatPoint): void {
                tongue.show(current, "lash", mouth,
                    { moment: "lash", path: [mouthArr, [at.x(), at.y(), at.z()]] });
            }
            function missAt(current: CombatAction, at: CombatPoint, scatter: number, text: boolean): void {
                const scope = current.world();
                WorldFeedback.emit(scope, lickScene, 1, at, { moment: "miss", scale: 1, scatter: scatter }, 20);
                if (text) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), lickMissText, [], 24);
            }
            /** 首碰结算：非友方实体吃伤害与麻痹；同伴/自己或墙只截断；都按真实接触点。 */
            function firstContact(current: CombatAction, contact: CombatImpact): number {
                const scope = current.world();
                const contactPoint = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const ally = lander !== null && (String(lander.ref()) === selfRef || scope.friendly(lander));
                if (lander !== null && !ally) {
                    const at = scope.observe(lander);
                    const point = at === null ? contactPoint : at.position();
                    const landed = hurt(current, lander, "lick", power,
                        { damage: damageSpec("lick", "lick"), contact: true, status: "paralysis", chance: chance });
                    WorldFeedback.emit(scope, lickScene, 1, point,
                        { moment: "impact", target: String(lander.ref()), intensity: Math.max(0.6, Math.min(2.0, power / 30)) }, 26);
                    if (landed) {
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), lickHitText, [], 26);
                        if (pull > 0) { victim = lander; dragLeft = pull; }
                    }
                } else if (lander !== null) {
                    // 同伴或自己挡住舌头：停在身体上，不结算。
                    missAt(current, contactPoint, 8, false);
                } else if (contact.blocked()) {
                    missAt(current, contactPoint, 22, false);
                } else {
                    missAt(current, contactPoint, 16, true);
                }
                return Math.max(0.3, Math.min(span, contactPoint.minus(mouth).length()));
            }
            function reel(current: CombatAction, from: number, step: number): void {
                showFront(current, mouth.plus(aiming.scale(from * Math.max(0, 1 - (step + 1) / retract))));
                // 拽与收舌同步：每一步用 hitDisplace 拉一小段，沿原生抗击退/事件结算。
                if (victim !== null && dragLeft > 0) {
                    const scope = current.world();
                    const body = scope.valid(victim) ? scope.observe(victim) : null;
                    if (body === null) { dragLeft = 0; }
                    else {
                        const toward = origin.minus(body.position());
                        if (toward.length() < 0.05) { dragLeft = 0; }
                        else {
                            const want = Math.min(dragLeft, pull / retract);
                            const moved = scope.hitDisplace(victim, toward.unit().scale(want));
                            if (moved > 0.001) {
                                dragLeft -= moved;
                                if (!dragShown) {
                                    dragShown = true;
                                    WorldFeedback.emit(scope, lickScene, 1, body.position(),
                                        { moment: "drag", target: String(victim.ref()), path: [String(victim.ref()), "source"], scale: 1 }, 22);
                                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), lickDragText, [], 24);
                                }
                            } else { dragLeft = 0; }
                        }
                    }
                }
                if (step + 1 >= retract) { tongue.finish(current, done); return; }
                current.after(1, function (next: CombatAction) { reel(next, from, step + 1); });
            }
            /** 舌头逐刻只探出一小段：只 trace 本刻新伸出的短段，首碰立即停伸并从实际接触长度回收。 */
            function extend(current: CombatAction, step: number, previous: CombatPoint): void {
                if (current.world().observe(actor) === null) { tongue.finish(current, done); return; }
                const travelled = Math.min(span, ((step + 1) / lash) * span);
                const front = mouth.plus(aiming.scale(travelled));
                const contact = current.trace(previous, front, radius, true);
                if (contact.hitEntity() || contact.blocked()) {
                    showFront(current, contact.position());
                    reel(current, firstContact(current, contact), 0);
                    return;
                }
                showFront(current, front);
                if (step + 1 >= lash) {
                    missAt(current, front, 16, true);
                    reel(current, span, 0);
                    return;
                }
                current.after(1, function (next: CombatAction) { extend(next, step + 1, front); });
            }
            extend(action, 0, mouth);
        }
    });
}
