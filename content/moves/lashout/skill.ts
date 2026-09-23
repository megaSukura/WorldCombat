/** lashout：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    const lashoutVentText = "world_combat.move.lashout.text.vent";
    const lashoutHitText = "world_combat.move.lashout.text.hit";
    const lashoutRageText = "world_combat.move.lashout.text.rage";

    define({
        freeMovement: true,
        id: lashoutId,
        cooldownParameter: "recharge",
        name: "Lash Out",
        description: "受到削弱时发起更重的冲撞。负面能力等级和有害药水都会激起怒气；命中后先消减负面等级，再减轻有害药水。",
        uses: ["被降能力后立刻重击", "把积压的负等级一次泄掉", "用怒气换一段攻击提升"],
        kind: "enemy",
        range: 3.0,
        maxRange: 5.5,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "dark",
        defaults: { vent: false, ai: { maxChase: 8, enraged: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(lashoutId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "dark", color: 0xB23A4A,
                label: config && config.vent === true ? "泄愤·宣泄" : "泄愤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lashoutId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(lashoutId, "tempo", context)),
                recover: Math.round(p(lashoutId, "settle", context)),
                cooldown: Math.round(p(lashoutId, "recharge", context)),
                active: 0,
                range: p(lashoutId, "dash", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const down = world.valid(actor) ? lashoutDown(world, actor) : 0;
            action.present("lashout:fume", lashoutScene, 1, action.origin(),
                JSON.stringify({ moment: "fume", down: down, fumes: Math.round(16 + down * 10),
                    vent: config && config.vent === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(lashoutId, "dash", action);
            const step = p(lashoutId, "speed", action);
            const radius = p(lashoutId, "collisionRadius", action);
            const push = p(lashoutId, "push", action);
            const vent = !!(config && config.vent === true);
            const scale = radius / 0.45;
            let travelled = 0;

            sound(action, "minecraft:entity.vex.charge");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(lashoutId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const power = p(lashoutId, "lashout", current);
                        const down = lashoutDown(scope, current.actor());
                        const doubled = down > 0;
                        const budget = Math.round(p(lashoutId, "ventLevels", current));
                        const boostStages = Math.round(p(lashoutId, "rageStages", current));
                        const boostTicks = Math.round(p(lashoutId, "rageTicks", current));
                        const count = Math.round(16 + power / 3);
                        const landed = impact(current, hit, lashoutId, power, { damage: damageSpec(lashoutId, "lashout"), contact: true });
                        let removed = 0, boosted = 0;
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                            removed = lashoutVent(scope, current.actor(), budget);
                            if (vent && scope.valid(current.actor())) {
                                NativeEffects.boostWindow(scope, current.actor(), { atk: boostStages }, boostTicks, "world_combat:move/lashout");
                                boosted = boostStages;
                                const self = scope.observe(current.actor());
                                if (self !== null) WorldFeedback.emit(scope, lashoutScene, 1, self.position(),
                                    { moment: "rage", boosted: boostStages, count: Math.round(10 + boostStages * 8) }, Math.min(120, boostTicks));
                                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.25, 0)), lashoutRageText, [boostStages], Math.min(80, boostTicks));
                            }
                        }
                        WorldFeedback.emit(scope, lashoutScene, 1, hit.position(),
                            { moment: doubled ? "vent" : "strike", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                                down: down, power: Math.round(power * 10) / 10, count: count, removed: removed, boosted: boosted, scale: scale }, 30);
                        scope.sound(doubled ? "minecraft:entity.warden.sonic_boom" : "cobblemon:impact.dark", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                            doubled ? lashoutVentText : lashoutHitText, [], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(lashoutId, "minimumMove", current) || travelled >= length) { done(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
