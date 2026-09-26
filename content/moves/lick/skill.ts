/**
 * 舌舔 / lick 的出手方式。
 *
 * 念头的形状：舔一下嘴、舌尖聚起唾液（windup，提交前只播预告）→ 长舌朝锁定方向一伸一收（lash）：
 * 舌前端逐刻向外探到实际前端，撞上第一个身体或方块就停在那里。舔中敌人则轻轻咬伤并可能麻住（impact），
 * 缠绕式再把目标往身前拽一段（drag）；落空或撞墙只留一小撮唾液（miss）。
 *
 * 判定：`kind: "aim"`——方向、点或空甩都行，提交时不要求存在敌人。沿嘴到射线端点做 `action.trace(..., true)`，
 * 第一个实体（含同伴）或方块就是舌头真实的接触点：前排的同伴或敌人会先挡住舌头，因此不会隔墙/隔前排锁后排。
 * 表现用 `WorldFeedback.actionScenes` 每刻把舌头画到同一前端，接触后转段收回。位移用 `displace` 的实际结果：
 * 免位移的目标只舔中、不被舌头画面搬动。提交后才触碰世界。
 */
namespace PokemonSkills {
    const lickScene = "world_combat:move_lick";
    const lickHitText = "world_combat.move.lick.text.hit";
    const lickMissText = "world_combat.move.lick.text.miss";
    const lickDragText = "world_combat.move.lick.text.drag";

    define({
        id: "lick",
        name: "Lick",
        description: "用一条远超普通近战的长舌朝选定方向一伸一收地舔一下：伤害很轻，但出手非常快，目标很可能被这一下麻住；缠绕式还能把它朝身前拽一段。可以空甩，前排的同伴或敌人、墙都会先挡住舌头。",
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
            const end = mouth.plus(aiming.scale(span));
            const tongue = WorldFeedback.actionScenes(lickScene);
            const selfRef = String(actor.ref());

            sound(action, "cobblemon:move.lick.target");

            function showFront(current: CombatAction, at: CombatPoint): void {
                tongue.show(current, "lash", mouth,
                    { moment: "lash", path: [mouthArr, [at.x(), at.y(), at.z()]] });
            }
            function reel(current: CombatAction, step: number): void {
                showFront(current, mouth.plus(aiming.scale(span * Math.max(0, 1 - (step + 1) / retract))));
                if (step + 1 >= retract) { tongue.finish(current, done); return; }
                current.after(1, function (next: CombatAction) { reel(next, step + 1); });
            }
            function resolve(current: CombatAction): void {
                const scope = current.world();
                // 权威判定：舌头的真实首碰点。
                const contact = current.trace(mouth, end, radius, true);
                const contactPoint = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const ally = lander !== null && (String(lander.ref()) === selfRef || scope.friendly(lander));
                tongue.stop(current, "lash");
                if (lander !== null && !ally) {
                    const at = scope.observe(lander);
                    const point = at === null ? contactPoint : at.position();
                    const landed = hurt(current, lander, "lick", power,
                        { damage: damageSpec("lick", "lick"), contact: true, status: "paralysis", chance: chance });
                    WorldFeedback.emit(scope, lickScene, 1, point,
                        { moment: "impact", target: String(lander.ref()), intensity: Math.max(0.6, Math.min(2.0, power / 30)) }, 26);
                    if (landed) {
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), lickHitText, [], 26);
                        if (pull > 0 && scope.valid(lander)) {
                            const stuck = scope.observe(lander);
                            if (stuck !== null) {
                                const toward = origin.minus(stuck.position());
                                if (toward.length() >= 0.05) {
                                    const moved = scope.displace(lander, toward.unit().scale(pull));
                                    // 免位移目标只舔中，不被舌头画面搬动。
                                    if (moved > 0.05) {
                                        WorldFeedback.emit(scope, lickScene, 1, stuck.position(),
                                            { moment: "drag", target: String(lander.ref()), path: [String(lander.ref()), "source"], scale: 1 }, 22);
                                        WorldFeedback.text(scope, stuck.position().plus(WorldCombat.point(0, 1.3, 0)), lickDragText, [], 24);
                                    }
                                }
                            }
                        }
                    }
                } else if (lander !== null) {
                    // 同伴或自己挡住舌头：停在身体上，不结算。
                    WorldFeedback.emit(scope, lickScene, 1, contactPoint, { moment: "miss", scale: 1, scatter: 8 }, 20);
                } else if (contact.blocked()) {
                    const blockPoint = contact.blockPosition();
                    WorldFeedback.emit(scope, lickScene, 1, blockPoint === null ? contactPoint : blockPoint,
                        { moment: "miss", scale: 1, scatter: 22 }, 20);
                } else {
                    WorldFeedback.emit(scope, lickScene, 1, contactPoint, { moment: "miss", scale: 1, scatter: 16 }, 20);
                    WorldFeedback.text(scope, contactPoint.plus(WorldCombat.point(0, 1.1, 0)), lickMissText, [], 24);
                }
                reel(current, 0);
            }
            function extend(current: CombatAction, step: number): void {
                const self = current.world().observe(actor);
                if (self === null) { tongue.finish(current, done); return; }
                const travelled = Math.min(span, ((step + 1) / lash) * span);
                showFront(current, mouth.plus(aiming.scale(travelled)));
                if (step + 1 >= lash) { resolve(current); return; }
                current.after(1, function (next: CombatAction) { extend(next, step + 1); });
            }
            extend(action, 0);
        }
    });
}
