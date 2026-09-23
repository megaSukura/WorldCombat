/**
 * 扑击 / bodypress 的出手方式。
 *
 * 念头的形状：压低重心、架住肩甲站定（windup，提交前只播预告）→ 沿瞄准方向把整副身板推出去（drive）→
 * 顶上活体的一刻结算接触伤害（impact）→ 不滑开，顶着对方沿同一方向一路碾过去（grind），推完站定（settle）。
 * 碾推式把撞击摊成一段持续顶推；硬停式几乎一下推完。命中 100 落成“不瞄偏”，顶不上则推完距离收势（miss）。
 * 两幕：drive → impact + grind。提交后才触碰世界。配置 grind 通过 resolve 改变时序与公式取值。
 */
namespace PokemonSkills {
    const bodypressScene = "world_combat:move_bodypress";
    const bodypressHitText = "world_combat.move.bodypress.text.hit";
    const bodypressGrindText = "world_combat.move.bodypress.text.grind";
    const bodypressMissText = "world_combat.move.bodypress.text.miss";

    define({
        freeMovement: true,
        id: "bodypress",
        name: "Body Press",
        description: "压低重心架住肩甲，把整副身板连同护甲一起推出去；撞上就顶住不放，把对手一路推走。防御越高，这一下越重、顶得越远。",
        uses: ["用护甲与体重顶开挡路的对手", "把目标一路推出掩体或推下高台", "在守势里反推一波"],
        kind: "enemy",
        range: 3,
        maxRange: 6,
        prepare: 10,
        active: 34,
        recover: 10,
        cooldown: 46,
        style: "contact",
        defaults: { grind: true, ai: { maxChase: 8, minHealth: 0.35 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["bodypress"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const grind = !(config && config.grind === false);
            return {
                prepare: Math.max(1, Math.round(p("bodypress", "brace", context))),
                recover: p("bodypress", "recover", context) + (grind ? 2 : 0),
                cooldown: p("bodypress", "cooldown", context) + (grind ? 6 : 0),
                range: p("bodypress", "lunge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_bodypress:windup", bodypressScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", grind: !(config && config.grind === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const grind = !(config && config.grind === false);
            const length = p("bodypress", "lunge", action);
            const speed = p("bodypress", "advanceSpeed", action);
            const radius = p("bodypress", "collisionRadius", action);
            const power = p("bodypress", "drive", action);
            const shove = p("bodypress", "shove", action);
            const grindTicks = Math.max(2, Math.round(p("bodypress", "grindTicks", action)));
            const direction = aim(action);
            const scale = radius / 0.5;
            const intensity = Math.max(0.5, Math.min(2.2, power / 100));
            const clods = Math.max(6, Math.round(shove * 8));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, bodypressScene, 1, action.origin(),
                { moment: "drive", scale: scale, intensity: intensity, clods: clods }, 60);
            sound(action, "minecraft:entity.ravager.step");

            function settle(current: CombatAction, landed: boolean): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, bodypressScene, 1, body.position(),
                        { moment: landed ? "settle" : "miss", scale: scale, intensity: intensity, clods: clods }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        landed ? bodypressHitText : bodypressMissText, [], 24);
                }
                sound(current, landed ? "cobblemon:impact.fighting" : "minecraft:entity.ravager.attack");
                done(current);
            }

            /** 碾推幕：目标与施法者一起沿推进方向移动，把对方一路顶走。 */
            function grindOver(current: CombatAction, ref: string, remaining: number, left: number): void {
                if (settled) return;
                const scope = current.world();
                const victim = scope.actor(ref);
                const body = scope.observe(current.actor());
                if (victim === null || !scope.valid(victim) || body === null || remaining <= 0.02 || left <= 0) { settle(current, true); return; }
                const step = Math.min(remaining / Math.max(1, left), 0.4);
                const moved = scope.displace(victim, direction.scale(step));
                if (moved > 0) scope.displace(current.actor(), direction.scale(moved));
                const victimBody = scope.observe(victim);
                if (victimBody !== null) WorldFeedback.keep(scope, "bodypress:grind:" + String(current.actor().ref()), bodypressScene, 1,
                    victimBody.position(), { moment: "grind", target: ref, scale: scale, intensity: intensity,
                        ratio: 1 - remaining / Math.max(0.001, shove) }, 6);
                if (moved < p("bodypress", "minimumMove", current)) { settle(current, true); return; }
                current.after(1, function (next: CombatAction) { grindOver(next, ref, remaining - moved, left - 1); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { settle(current, false); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(p("bodypress", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "bodypress", power);
                    WorldFeedback.emit(scope, bodypressScene, 1, point,
                        { moment: "impact", target: target !== null ? String(target.ref()) : "", scale: scale, intensity: intensity }, 28);
                    if (landed && target !== null && scope.valid(target)) {
                        if (grind) {
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), bodypressGrindText, [shove], 28);
                            grindOver(current, String(target.ref()), shove, grindTicks);
                        } else {
                            scope.displace(target, direction.scale(shove));
                            settle(current, true);
                        }
                        return;
                    }
                    settle(current, false);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("bodypress", "minimumMove", current) || travelled >= length) { settle(current, false); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
