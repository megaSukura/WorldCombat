/** 逐刻加速助跑，在原生身体接触后结算伤害，再分四拍向身侧减速滑开。 */
namespace PokemonSkills {
    const tackleScene = "world_combat:move_tackle";
    const tackleHitText = "world_combat.move.tackle.text.hit";
    const tackleThroughText = "world_combat.move.tackle.text.through";
    const tackleMissText = "world_combat.move.tackle.text.miss";

    define({
        freeMovement: true,
        id: "tackle",
        name: "Tackle",
        description: "迈步助跑，用整个身体撞上去，再顺着冲势向对方身侧滑开。跑得越快、身体越重，这一下越沉；撞空就冲到助跑尽头。",
        uses: ["拉开距离时的一记短助跑冲撞", "撞开一步把对手顶离掩体", "撞后向身侧滑开，调整站位"],
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
            action.present("tackle:motion", tackleScene, 1, action.origin(), JSON.stringify({ moment: "windup", duration: prepare }));
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
            const aimed = aim(action), horizontal = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = horizontal.length() > 0.001 ? horizontal.unit() : WorldCombat.point(0, 0, 1);
            const heading = [direction.x(), direction.y(), direction.z()];
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(1.9, power / 62));
            let travelled = 0, beats = 0, settled = false, motionMoment = "run";

            action.releaseTarget();
            action.present("tackle:motion", tackleScene, 1, action.origin(),
                JSON.stringify({ moment: "run", direction: heading, scale: scale }));
            sound(action, "minecraft:entity.player.attack.weak");

            function land(current: CombatAction, moment: string, textKey: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                current.present("tackle:motion", tackleScene, 1, current.origin(),
                    JSON.stringify({ moment: motionMoment, lifecycle: { reason: "settled", tick: scope.tick() } }));
                if (body !== null) {
                    scope.motion(current.actor(), WorldCombat.point(0, body.velocity().y(), 0), false);
                    WorldFeedback.emit(scope, tackleScene, 1, body.position(),
                        { moment: moment === "miss" ? "miss" : "stop", scale: scale, direction: heading }, 10);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), textKey, [], 22);
                }
                sound(current, moment === "miss" ? "minecraft:entity.player.attack.sweep" : "minecraft:block.gravel.step");
                done(current);
            }

            /** 接触后向身侧滑开；四拍逐渐减速，原生碰撞决定实际余程。 */
            function slip(current: CombatAction, remaining: number, elapsed: number, side: CombatPoint): void {
                if (remaining <= 0.001 || elapsed >= 4) { land(current, "slip", tackleThroughText); return; }
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { land(current, "slip", tackleThroughText); return; }
                const weight = [0.4, 0.3, 0.2, 0.1][elapsed];
                const requested = Math.min(remaining, carry * weight);
                const glide = side.scale(elapsed < 2 ? 0.94 : 0.66).plus(direction.scale(elapsed < 2 ? 0.35 : 0.75)).unit();
                const moved = scope.displace(current.actor(), glide.scale(requested));
                if (moved < Math.min(p("tackle", "minimumMove", current), requested * 0.5)) { land(current, "slip", tackleThroughText); return; }
                current.after(1, function (next: CombatAction) { slip(next, remaining - moved, elapsed + 1, side); });
            }

            function startSlip(current: CombatAction, distance: number): void {
                const scope = current.world(), body = scope.observe(current.actor());
                let side = WorldCombat.point(-direction.z(), 0, direction.x());
                if (body) {
                    const end = body.position().plus(side.scale(distance * 0.8)).plus(direction.scale(distance * 0.4));
                    if (!scope.freeSpace(end.minus(WorldCombat.point(0, body.height() * 0.5, 0)), body.width(), body.height())) side = side.scale(-1);
                }
                motionMoment = "slip";
                current.present("tackle:motion", tackleScene, 1, current.origin(),
                    JSON.stringify({ moment: "slip", direction: heading, scale: scale }));
                // Keep contact and the ensuing side-step on distinct server beats.
                current.after(1, next => slip(next, distance, 0, side));
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const step = Math.min(speed * Math.min(1, 0.55 + beats++ * 0.25), Math.max(0, length - travelled));
                if (step <= 0.001) { land(current, "miss", tackleMissText); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                travelled += swept.moved;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "tackle", power, { damage: damageSpec("tackle", "power"), contact: true });
                    WorldFeedback.emit(scope, tackleScene, 1, point,
                        { moment: "impact", direction: heading, scale: scale, intensity: intensity }, 10);
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), tackleHitText, [], 22);
                        sound(current, "cobblemon:impact.normal");
                        startSlip(current, carry);
                        return;
                    }
                    startSlip(current, carry * 0.5);
                    return;
                }
                if (hit.blocked() || swept.moved < p("tackle", "minimumMove", current) || travelled >= length) {
                    land(current, "miss", tackleMissText);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
