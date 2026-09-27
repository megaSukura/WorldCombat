/** Short entry step, then a separate clap at the actual forward contact point. */
namespace PokemonSkills {
    const fakeoutHitText = "world_combat.move.fakeout.text.hit";
    const fakeoutDazeText = "world_combat.move.fakeout.text.daze";
    const fakeoutBreakText = "world_combat.move.fakeout.text.broken";
    const fakeoutMissText = "world_combat.move.fakeout.text.miss";

    /** 拍懵：挂共享畏缩身份，并投递一次普通打断，返回实际结束的动作数。 */
    function fakeoutDaze(world: CombatWorld, target: CombatActor, ticks: number): { applied: boolean; ended: number } {
        const applied = CombatStatus.apply(world, target, "flinch", fakeoutDazeEffect, ticks, 0);
        // 只有回执数大于零才算真的按停了一手；没结束就只说拍懵，不冒充打断。
        return { applied: applied, ended: applied ? LivingActions.requestInterrupt(world, target) : 0 };
    }

    define({
        freeMovement: true,
        id: fakeoutId,
        cooldownParameter: "recharge",
        name: "Fake Out",
        description: "每次遭遇的第一手可用：短踏步后迅速拍掌，命中会尝试拍懵对手，并打断其可被普通打断的本作动作。提交其他招或已记录的原生实击会用掉开场机会；脱离实际交战后才能重新开场。",
        uses: ["刚上场就抢一记把对手拍懵", "打断对手正在展开的起手", "短踏步后近身拍掌"],
        kind: "aim",
        range: 1.8,
        maxRange: 3.0,
        prepare: 2,
        active: 0,
        recover: 6,
        cooldown: 34,
        style: "contact",
        defaults: { feint: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(fakeoutId, "collisionRadius", pokemon) * 1.6, geometry: "line", style: "contact", color: 0xF6D36B,
                label: config && config.feint === true ? "击掌奇袭·佯攻" : "击掌奇袭" };
        },
        ready: function (action) {
            return fakeoutFresh(action.sense(), action.actor()) ? "" : "skill-unavailable";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[fakeoutId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(fakeoutId, "tempo", context)),
                recover: Math.round(p(fakeoutId, "settle", context)),
                cooldown: Math.round(p(fakeoutId, "recharge", context)),
                active: 0,
                range: p(fakeoutId, "blink", context) + p(fakeoutId, "palmReach", context)
            };
        },
        windup: function (action, config, prepare) {
            const fresh = fakeoutFresh(action.sense(), action.actor());
            action.present("fakeout:ready", fakeoutScene, 1, action.origin(),
                JSON.stringify({ moment: fresh ? "ready" : "whiff", feint: config && config.feint === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action), length = p(fakeoutId, "blink", action), step = p(fakeoutId, "speed", action);
            const radius = p(fakeoutId, "collisionRadius", action), power = p(fakeoutId, "swat", action);
            const reach = p(fakeoutId, "palmReach", action), dazeTicks = Math.round(p(fakeoutId, "dazeTicks", action));
            let travelled = 0;
            sound(action, "minecraft:entity.player.attack.weak");

            function clap(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const intended = here.plus(direction.scale(reach)), wall = WorldGeometry.blockHit(scope, here, intended);
                const end = wall !== null ? wall.position() : intended;
                const candidates: { actor: CombatActor; point: CombatPoint }[] = [];
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(here, end, radius), victim => {
                    if (String(victim.key()) === String(current.actor().key()) || scope.friendly(victim)) return;
                    const contact = scope.closestPoint(victim, here);
                    if (scope.clear(here, contact)) candidates.push({ actor: victim, point: contact });
                });
                candidates.sort((a, b) => a.point.minus(here).length() - b.point.minus(here).length());
                const victim = candidates.length ? candidates[0].actor : null, point = candidates.length ? candidates[0].point : end;
                const landed = victim !== null && hurt(current, victim, fakeoutId, power,
                    { damage: damageSpec(fakeoutId, "swat"), contact: true });
                // 双掌的世界起点按真实朝向的右向量算，朝哪边都在这一掌两侧相对合拢，不再固定世界 X 轴。
                const right = WorldGeometry.basis(direction).right;
                const palmA = right.scale(0), palmB = palmA.scale(-1);
                const at = LivingActions.coordinates(point);
                if (landed && victim) {
                    WorldFeedback.emit(scope, fakeoutScene, 1, point, { moment: "clap", direction: LivingActions.coordinates(direction),
                        point: at, palmA: LivingActions.coordinates(palmA), palmB: LivingActions.coordinates(palmB),
                        inA: LivingActions.coordinates(right.scale(-1)), inB: LivingActions.coordinates(right),
                        scale: radius / 0.4, landed: 1 }, 10);
                    if (scope.valid(victim)) {
                        const outcome = fakeoutDaze(scope, victim, dazeTicks);
                        if (outcome.applied) {
                            WorldFeedback.emit(scope, fakeoutScene, 1, point, { moment: "daze", target: String(victim.ref()),
                                daze: dazeTicks, stars: Math.round(5 + dazeTicks / 6) }, dazeTicks);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.5, 0)), fakeoutDazeText, [], 28);
                            // 只有确实结束了一个动作才报「打断」，并单独给一次短闪。
                            if (outcome.ended > 0) {
                                WorldFeedback.emit(scope, fakeoutScene, 1, point, { moment: "broken", target: String(victim.ref()),
                                    ended: Math.min(3, outcome.ended) }, 22);
                                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.75, 0)), fakeoutBreakText, [], 24);
                            }
                        }
                    }
                    scope.sound("minecraft:block.amethyst_block.hit", point, 14, "{}");
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.3, 0)), fakeoutHitText, [Math.round(power)], 24);
                } else {
                    WorldFeedback.emit(scope, fakeoutScene, 1, point, { moment: "miss", direction: LivingActions.coordinates(direction),
                        point: at, scale: radius / 0.4 }, 18);
                    scope.sound("minecraft:entity.player.attack.nodamage", point, 12, "{}");
                    WorldFeedback.text(scope, point, fakeoutMissText, [], 20);
                }
                done(current);
            }
            function advance(current: CombatAction): void {
                const swept = sweepStep(current, direction.scale(Math.min(step, length - travelled)), radius);
                travelled += swept.moved;
                if (swept.hit.hitEntity() || swept.hit.blocked() || swept.moved < p(fakeoutId, "minimumMove", current) || travelled >= length) {
                    const here = current.origin(), hit = current.trace(here, here.plus(direction.scale(reach)), radius);
                    const point = hit.position(), right = WorldGeometry.basis(direction).right;
                    current.present("fakeout:closing", fakeoutScene, 1, point, JSON.stringify({ moment: "closing",
                        point: LivingActions.coordinates(point), palmA: LivingActions.coordinates(right.scale(.3)),
                        palmB: LivingActions.coordinates(right.scale(-.3)), inA: LivingActions.coordinates(right.scale(-1)),
                        inB: LivingActions.coordinates(right), direction: LivingActions.coordinates(direction) }));
                    current.after(1, clap); return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

}
