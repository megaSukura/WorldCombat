/** powertrip：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: powertripId,
        cooldownParameter: "recharge",
        name: "Power Trip",
        description: "借身上的强化冲撞敌人。强化越多，冲得越远越快、伤害和推力越大；命中后保留强化。",
        uses: ["叠高能力等级后冲上去重击", "把一个人顶出很远", "猛进时一次撞穿两个人"],
        kind: "enemy",
        range: 3.2,
        maxRange: 5.8,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "dark",
        defaults: { drive: false, ai: { maxChase: 10, boostFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(powertripId, "collisionRadius", pokemon) * 1.6, geometry: "line", style: "dark",
                color: 0x7A4BC8, label: config && config.drive === true ? "嚣张·猛进" : "嚣张" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[powertripId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(powertripId, "tempo", context)),
                recover: Math.round(p(powertripId, "settle", context)),
                cooldown: Math.round(p(powertripId, "recharge", context)),
                active: 0,
                range: p(powertripId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const boost = world.valid(actor) ? powertripBoosts(world, actor) : 0;
            const raised = world.valid(actor) ? powertripRaised(world, actor) : 0;
            action.present("powertrip:boast", powertripScene, 1, action.origin(),
                JSON.stringify({ moment: "boast", boost: boost, raised: raised,
                    plumes: Math.max(6, 8 + raised * 4 + boost * 2), drive: config && config.drive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(powertripId, "dash", action);
            const step = p(powertripId, "speed", action);
            const radius = p(powertripId, "collisionRadius", action);
            const power = p(powertripId, "swagger", action);
            const push = p(powertripId, "push", action);
            const boosts = powertripBoosts(action.world(), action.actor());
            const raised = powertripRaised(action.world(), action.actor());
            const wanted = Math.max(1, Math.round(p(powertripId, "targets", action)));
            const plumes = Math.max(8, Math.round(p(powertripId, "plumes", action)));
            const scale = Math.max(0.7, Math.min(1.9, radius / 0.45));
            const intensity = Math.max(0.6, Math.min(2.6, power / 60));
            const seens: { [ref: string]: boolean } = Object.create(null);
            let travelled = 0, hits = 0;

            sound(action, "cobblemon:move.pursuit.target");

            function finish(current: CombatAction, landed: boolean, at: CombatPoint): void {
                if (landed) {
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.2, 0)), powertripHitText,
                        [Math.round(power * 10) / 10], 24);
                } else {
                    WorldFeedback.emit(current.world(), powertripScene, 1, at, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.0, 0)), powertripMissText, [], 20);
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { finish(current, hits > 0, hit.position()); return; }
                    const ref = String(victim.ref());
                    if (!seens[ref]) {
                        seens[ref] = true;
                        if (impact(current, hit, powertripId, power, { damage: damageSpec(powertripId, "swagger"), contact: true })) {
                            hits++;
                            if (scope.valid(victim)) {
                                const away = hit.position().minus(here);
                                if (away.length() > 0.2) scope.displace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                            }
                            WorldFeedback.emit(scope, powertripScene, 1, hit.position(),
                                { moment: "hit", target: ref, boost: boosts, raised: raised, plumes: plumes, scale: scale, intensity: intensity }, 22);
                        }
                        if (hits >= wanted) { finish(current, true, hit.position()); return; }
                        WorldFeedback.emit(scope, powertripScene, 1, hit.position(),
                            { moment: "through", target: ref, boost: boosts, plumes: plumes, scale: scale }, 18);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), powertripThroughText, [hits], 20);
                    }
                    // 穿过已撞过的目标继续冲，去找下一个。
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) { finish(current, hits > 0, current.origin()); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
