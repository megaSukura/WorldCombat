/**
 * 报恩 / return 的出手方式。
 *
 * 念头的形状：为训练家立下誓约——金色光环在脚下结成一圈（windup，提交前只播预告，亲密度越高越亮）→
 * 沿瞄准方向直冲（dash）→ 撞实的一刻把这一记全力送出去（impact）→ 受托式撞开后沿原方向继续余进一段（through），
 * 否则收在撞击点；冲空则一路冲到冲程尽头或实际撞墙处（miss / wall）。
 * 与迁怒分开：迁怒是多段快抓，报恩是一道直冲的金光、只结算一次。
 *
 * 选取：`kind: "aim"`——方向可空冲；首个撞到的敌人结算单次重击，余程交给原生碰撞。不要求提交时存在敌人。
 *
 * 两幕半：pledge（起誓）→ dash → impact（+ through / miss / wall）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const returnScene = "world_combat:move_return";
    const returnHitText = "world_combat.move.return.text.hit";
    const returnThroughText = "world_combat.move.return.text.through";
    const returnMissText = "world_combat.move.return.text.miss";

    function returnAim(action: CombatAction): CombatPoint {
        const wanted = action.targetPosition().minus(action.origin());
        return wanted.length() < 0.01 ? action.direction() : wanted.unit();
    }

    function returnVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        freeMovement: true,
        id: "return",
        name: "Return",
        description: "为训练家把这一记全力送出去：金色誓约在脚下结起，随后一道金光直冲，只结算一次重击；受托式撞开后沿原方向继续余进一段。亲密度越高，这一记越重；它和迁怒读同一个数、方向相反，一个单次重击、一个多段快抓。",
        uses: ["亲密度高时的一记全力重击", "贴上去把对手顶开", "受托式撞开后沿原方向继续直进"],
        kind: "aim",
        range: 3.0,
        maxRange: 5.0,
        prepare: 7,
        active: 22,
        recover: 7,
        cooldown: 18,
        style: "contact",
        defaults: { devoted: false, ai: { maxChase: 8, bond: 150, finish: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("return", "collisionRadius", pokemon), geometry: "line", style: "contact", color: 0xE8B44A, label: "报恩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["return"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const devoted = !!(config && config.devoted);
            return {
                prepare: p("return", "prepare", context) + (devoted ? 3 : 0),
                recover: p("return", "recover", context) + (devoted ? 3 : 0),
                cooldown: p("return", "cooldown", context) + (devoted ? 7 : 0),
                range: p("return", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const devoted = !!(config && config.devoted);
            action.present("world_combat:move_return:pledge", returnScene, 1, action.origin(),
                JSON.stringify({ moment: "pledge", devoted: devoted, windup: prepare, bond: p("return", "bond", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(returnScene);
            const world = action.world();
            const self = action.actor();
            const devoted = !!(config && config.devoted);
            const length = p("return", "charge", action);
            const speed = p("return", "runSpeed", action);
            const radius = p("return", "collisionRadius", action);
            const power = p("return", "power", action);
            const carry = p("return", "carry", action);
            const push = p("return", "push", action);
            const bond = p("return", "bond", action);
            const direction = returnAim(action);
            const start = world.observe(self);
            if (start === null) { movementScenes.finish(action, done); return; }
            const chargeStart = action.origin();
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2, 0.5 + bond * 1.5));
            const trail = Math.max(16, Math.round(power * 1.4));
            const sparks = Math.max(10, Math.round(power * 0.5));
            let travelled = 0, settled = false;

            /** 从起点到实际终点的一条亮线；命中印一次，余进用更淡的一版续上。 */
            function line(from: CombatPoint, to: CombatPoint): number[][] {
                return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
            }

            movementScenes.show(action, "dash", action.origin(), { moment: "dash", direction: returnVector(direction), scale: scale, intensity: intensity, trail: trail });
            sound(action, "minecraft:entity.player.attack.strong");

            /** 收势：把起点到实际终点连成同一条亮线；撞空补一行浮字。 */
            function land(current: CombatAction, moment: string, missed: boolean, from?: CombatPoint, to?: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    const payload: any = { moment: moment, scale: scale, intensity: intensity };
                    if (from !== undefined && to !== undefined) payload.path = line(from, to);
                    WorldFeedback.emit(scope, returnScene, 1, body.position(), payload, 22);
                    if (missed) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.25, 0)), returnMissText, [], 22);
                }
                sound(current, missed ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.normal");
                movementScenes.finish(current, done);
            }

            /** 受托式的余进：撞实后沿原方向继续直进，只把同一条亮线以更淡的一版续到实际终点。 */
            function through(current: CombatAction, remaining: number, left: number, from: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                if (remaining <= 0.02 || left <= 0) { land(current, "through", false, from, current.origin()); return; }
                const moved = scope.displace(current.actor(), direction.scale(Math.min(remaining, speed * 0.62)));
                if (moved < p("return", "minimumMove", current)) { land(current, "through", false, from, current.origin()); return; }
                current.after(1, function (next: CombatAction) { through(next, remaining - moved, left - 1, from); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { land(current, "miss", true, chargeStart, origin); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "return", power,
                        { damage: damageSpec("return", "power"), contact: true });
                    WorldFeedback.emit(scope, returnScene, 1, point,
                        { moment: "impact", target: target !== null ? String(target.ref()) : "", path: line(chargeStart, point),
                            scale: scale, intensity: intensity, trail: trail, sparks: sparks }, 28);
                    if (landed && target !== null && scope.valid(target)) {
                        scope.hitDisplace(target, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), returnHitText, [], 22);
                        sound(current, "cobblemon:impact.normal");
                    }
                    if (landed && devoted) { through(current, carry, 8, point); return; }
                    land(current, "impact", false);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p("return", "minimumMove", current) || travelled >= length) {
                    // 撞墙：在实际撞到的原生方块格上留一处收势亮痕，落点就是真正停下的位置。
                    if (hit.blocked()) {
                        const blockAt = hit.blockPosition();
                        const at = blockAt === null ? hit.position() : blockAt;
                        WorldFeedback.emit(scope, returnScene, 1, at,
                            { moment: "wall", path: line(chargeStart, origin), face: hit.blockFace(), scale: scale, intensity: intensity }, 22);
                    }
                    land(current, "miss", true, chargeStart, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
