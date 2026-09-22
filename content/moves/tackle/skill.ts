/**
 * 撞击 / tackle 的出手方式。
 *
 * 念头的形状：压低身子起一段短助跑（windup，提交前只播预告）→ 沿瞄准方向逐刻推进（run）→
 * 撞上活体的一刻用整个身体结算接触伤害、把目标轻轻顶开（impact）→ 顺着冲势从对方身侧滑过去（slip）。
 * 撞空则一路跑到助跑尽头（miss），位置留在更前面——它是一招可以拿来做走位的冲撞。
 * 命中 100 落成“不瞄偏”；两幕：run → impact + slip。提交后才触碰世界。
 */
namespace PokemonSkills {
    const tackleScene = "world_combat:move_tackle";
    const tackleHitText = "world_combat.move.tackle.text.hit";
    const tackleThroughText = "world_combat.move.tackle.text.through";
    const tackleMissText = "world_combat.move.tackle.text.miss";

    define({
        id: "tackle",
        name: "Tackle",
        description: "A physical attack in which the user charges and slams into the target with its whole body.",
        uses: ["拉开距离时的一记短助跑冲撞", "撞开一步把对手顶离掩体", "顺手从对方身侧穿过去换位"],
        kind: "enemy",
        range: 3,
        maxRange: 6,
        prepare: 4,
        active: 22,
        recover: 5,
        cooldown: 10,
        style: "contact",
        defaults: { runUp: false, ai: { maxChase: 7, finish: true, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["tackle"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const runUp = !!(config && config.runUp);
            return {
                prepare: p("tackle", "prepare", context) + (runUp ? 3 : 0),
                recover: p("tackle", "recover", context) + (runUp ? 3 : 0),
                cooldown: p("tackle", "cooldown", context) + (runUp ? 6 : 0),
                range: p("tackle", "charge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tackle:windup", tackleScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const length = p("tackle", "charge", action);
            const speed = p("tackle", "runSpeed", action);
            const radius = p("tackle", "collisionRadius", action);
            const power = p("tackle", "power", action);
            const push = p("tackle", "push", action);
            const carry = p("tackle", "carry", action);
            const direction = aim(action);
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(1.9, power / 62));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, tackleScene, 1, action.origin(),
                { moment: "run", scale: scale, stride: Math.max(3, Math.round(length / 0.8)), intensity: intensity }, 46);
            sound(action, "minecraft:entity.player.attack.weak");

            function land(current: CombatAction, moment: string, textKey: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, tackleScene, 1, body.position(),
                        { moment: moment, scale: scale, brake: Math.max(4, Math.round(carry * 6)) }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), textKey, [], 22);
                }
                sound(current, moment === "miss" ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.normal");
                done(current);
            }

            /** 穿过幕：撞实后顺势从对方身侧滑过去，撞到墙或滑完就收势。 */
            function slip(current: CombatAction, remaining: number, elapsed: number): void {
                if (remaining <= 0.02 || elapsed >= 8) { land(current, "slip", tackleThroughText); return; }
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { land(current, "slip", tackleThroughText); return; }
                const moved = scope.displace(current.actor(), direction.scale(Math.min(speed * 0.55, remaining)));
                if (moved < p("tackle", "minimumMove", current)) { land(current, "slip", tackleThroughText); return; }
                current.after(1, function (next: CombatAction) { slip(next, remaining - moved, elapsed + 1); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { land(current, "miss", tackleMissText); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(p("tackle", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "tackle", power, { damage: damageSpec("tackle", "power"), contact: true });
                    WorldFeedback.emit(scope, tackleScene, 1, point,
                        { moment: "impact", target: target !== null ? String(target.ref()) : "", scale: scale, intensity: intensity }, 26);
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), tackleHitText, [], 22);
                        sound(current, "cobblemon:impact.normal");
                        slip(current, carry, 0);
                        return;
                    }
                    slip(current, carry * 0.5, 0);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("tackle", "minimumMove", current) || travelled >= length) {
                    land(current, "miss", tackleMissText);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
