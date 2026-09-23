/** 短促的直线冲刺：原生身体抵达接触点才结算，命中后清除水平惯性并急停。 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: quickattackId,
        cooldownParameter: "recharge",
        name: "Quick Attack",
        description: "沿瞄准方向短促冲出，身体接触目标时撞实一下，随即急停。抢拍式起手更快、冲得稍远，代价是威力稍低、冷却更久。",
        uses: ["贴身抢一记先手，趁对手还没出手", "低代价地收掉残血目标", "追不上时用一记短冲把距离补上"],
        kind: "enemy",
        range: 2.7,
        maxRange: 4.8,
        prepare: 2,
        active: 0,
        recover: 5,
        cooldown: 16,
        style: "speed",
        defaults: { eager: false, ai: { maxChase: 7, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(quickattackId, "dash", pokemon) : 2.7) + 0.4, geometry: "line", style: "speed", color: 0xFFF0C8,
                label: config && config.eager === true ? "电光一闪·抢拍" : "电光一闪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[quickattackId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(quickattackId, "tempo", context)),
                recover: Math.round(p(quickattackId, "settle", context)),
                cooldown: Math.round(p(quickattackId, "recharge", context)),
                active: 0,
                range: p(quickattackId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("quickattack:motion", quickattackScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, eager: config && config.eager === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const aimed = aim(action), horizontal = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = horizontal.length() > 0.001 ? horizontal.unit() : WorldCombat.point(0, 0, 1);
            const backward = [-direction.x(), -direction.y(), -direction.z()];
            const length = p(quickattackId, "dash", action);
            const step = p(quickattackId, "pace", action);
            const radius = p(quickattackId, "collisionRadius", action);
            const power = p(quickattackId, "strike", action);
            const push = p(quickattackId, "push", action);
            const streak = Math.max(8, Math.round(p(quickattackId, "streak", action)));
            const scale = radius / 0.40;
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            let travelled = 0;

            sound(action, "cobblemon:move.quickattack.actor");
            action.releaseTarget();
            action.present("quickattack:motion", quickattackScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", lifecycle: { reason: "launched", tick: world.tick() } }));

            function finish(current: CombatAction, at: CombatPoint, moment: string, textKey: string): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body) scope.motion(current.actor(), WorldCombat.point(0, body.velocity().y(), 0), false);
                current.stopMovement();
                WorldFeedback.emit(scope, quickattackScene, 1, current.origin(),
                    { moment: "brake", scale: scale, backward: backward }, 6);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), textKey, [], 22);
                scope.sound(moment === "miss" ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.normal", at, 14, "{}");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                travelled += swept.moved;
                if (swept.moved > 0.001) {
                    const end = current.origin();
                    WorldFeedback.emit(scope, quickattackScene, 1, end, { moment: "segment", scale: scale, backward: backward,
                        count: Math.max(3, Math.round(streak * swept.moved / length)),
                        path: [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]] }, 5);
                }
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, quickattackId, power,
                            { damage: damageSpec(quickattackId, "strike"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(origin);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, quickattackScene, 1, hit.position(),
                            { moment: "strike", scale: scale, backward: backward, intensity: intensity }, 8);
                        finish(current, hit.position(), "strike", quickattackHitText);
                    } else {
                        finish(current, current.origin(), "miss", quickattackMissText);
                    }
                    return;
                }
                if (hit.blocked() || swept.moved < p(quickattackId, "minimumMove", current) || travelled >= length) {
                    finish(current, current.origin(), "miss", quickattackMissText);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
