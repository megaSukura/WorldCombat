/**
 * 报恩 / return 的出手方式。
 *
 * 念头的形状：为训练家立下誓约——金色光环在脚下结成一圈（windup，提交前只播预告，亲密度越高越亮）→
 * 沿瞄准方向直冲对手（dash）→ 撞实的一刻把这一记全力送出去（impact）→ 受托式顺势从对手身侧越过换位（through），
 * 否则收在撞击点；冲空则一路冲到冲程尽头（miss）。
 * 与迁怒分开：迁怒是多段快抓，报恩是一道直冲的金光、只结算一次。
 *
 * 两幕半：pledge（起誓）→ dash → impact（+ through / miss）。提交后才触碰世界。
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
        description: "为训练家把这一记全力送出去：金色誓约在脚下结起，随后一道金光直冲对手，只结算一次重击。亲密度越高，这一记越重；它和迁怒读同一个数、方向相反，一个单次重击、一个多段快抓。",
        uses: ["亲密度高时的一记全力重击", "贴上去把对手顶开", "受托式冲过对手换位"],
        kind: "enemy",
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
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2, 0.5 + bond * 1.5));
            const trail = Math.max(16, Math.round(power * 1.4));
            const sparks = Math.max(10, Math.round(power * 0.5));
            let travelled = 0, settled = false;

            movementScenes.show(action, "dash", action.origin(), { moment: "dash", direction: returnVector(direction), scale: scale, intensity: intensity, trail: trail });
            sound(action, "minecraft:entity.player.attack.strong");

            /** 收势：撞空补一行浮字；撞实的浮字已在 impact 里写出。 */
            function land(current: CombatAction, moment: string, missed: boolean): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, returnScene, 1, body.position(), { moment: moment, scale: scale, intensity: intensity }, 22);
                    if (missed) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.25, 0)), returnMissText, [], 22);
                }
                sound(current, missed ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.normal");
                movementScenes.finish(current, done);
            }

            function through(current: CombatAction, remaining: number, left: number): void {
                if (settled) return;
                const scope = current.world();
                if (remaining <= 0.02 || left <= 0) { land(current, "through", false); return; }
                const moved = scope.displace(current.actor(), direction.scale(Math.min(remaining, speed * 0.62)));
                if (moved < p("return", "minimumMove", current)) { land(current, "through", false); return; }
                current.after(1, function (next: CombatAction) { through(next, remaining - moved, left - 1); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { land(current, "miss", true); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "return", power,
                        { damage: damageSpec("return", "power"), contact: true });
                    WorldFeedback.emit(scope, returnScene, 1, point,
                        { moment: "impact", target: target !== null ? String(target.ref()) : "", scale: scale, intensity: intensity, trail: trail, sparks: sparks }, 28);
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), returnHitText, [], 22);
                        sound(current, "cobblemon:impact.normal");
                    }
                    if (landed && devoted) { through(current, carry, 8); return; }
                    land(current, "impact", false);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p("return", "minimumMove", current) || travelled >= length) {
                    land(current, "miss", true);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
