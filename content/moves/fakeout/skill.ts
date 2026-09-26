/** Short entry step, then a separate clap at the actual forward contact point. */
namespace PokemonSkills {
    const fakeoutHitText = "world_combat.move.fakeout.text.hit";
    const fakeoutDazeText = "world_combat.move.fakeout.text.daze";
    const fakeoutMissText = "world_combat.move.fakeout.text.miss";

    /** 拍懵：挂共享畏缩身份并把它正在执行的一手按停。 */
    function fakeoutDaze(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (!CombatStatus.apply(world, target, "flinch", fakeoutDazeEffect, ticks, 0)) return false;
        world.interrupt(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: fakeoutId,
        cooldownParameter: "recharge",
        name: "Fake Out",
        description: "刚被放上场时闪身抢出的一记掌掴：优先度最高、几乎瞬发，未必有多疼，却能把对手拍懵并打断它正在展开的一手；一旦自己已经出过任何一手，这一记就再拍不出来了。",
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
                const intended = here.plus(direction.scale(reach)), wall = scope.clipBlocks(here, intended);
                const end = wall ? wall.position() : intended;
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
                WorldFeedback.emit(scope, fakeoutScene, 1, point, { moment: "clap", direction: [direction.x(), direction.y(), direction.z()],
                    scale: radius / 0.4, landed: landed ? 1 : 0 }, 10);
                if (landed && victim) {
                    if (scope.valid(victim) && fakeoutDaze(scope, victim, dazeTicks)) {
                        WorldFeedback.emit(scope, fakeoutScene, 1, point, { moment: "daze", target: String(victim.ref()),
                            daze: dazeTicks, stars: Math.round(5 + dazeTicks / 6) }, dazeTicks);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.5, 0)), fakeoutDazeText, [], 28);
                    }
                    scope.sound("minecraft:block.amethyst_block.hit", point, 14, "{}");
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.3, 0)), fakeoutHitText, [Math.round(power)], 24);
                } else {
                    scope.sound("minecraft:entity.player.attack.nodamage", point, 12, "{}");
                    WorldFeedback.text(scope, point, fakeoutMissText, [], 20);
                }
                done(current);
            }
            function advance(current: CombatAction): void {
                const swept = sweepStep(current, direction.scale(Math.min(step, length - travelled)), radius);
                travelled += swept.moved;
                if (swept.hit.hitEntity() || swept.hit.blocked() || swept.moved < p(fakeoutId, "minimumMove", current) || travelled >= length) {
                    current.after(1, clap); return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

}
