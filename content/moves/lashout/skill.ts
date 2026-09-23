/**
 * 泄愤 / lashout 的出手方式。
 *
 * 核心念头：被削弱的怒气一直憋着，挑一个目标把这一口全喷出去——身上还带着负等级时威力翻倍。
 *
 * 三幕：
 *   蓄（windup，提交前）：脚下腾起暗红怒气，身上每一条负等级都缠成一缕黑气（present fume）。
 *   喷（execute）：欺身撞上目标，按受挫等级与物攻结算 lashout；自身仍有负等级时翻倍，画面换成暗红爆。
 *   泄（vent）：命中后从最负的一项起消掉负等级；开启宣泄时一次清空，并把怒气转成一段物攻提升。
 *
 * 与同族分开：以牙还牙记的是「自己被打过」，泄愤憋的是「自己被削弱」；泄愤命中后还会把怒气泄出去。
 */
namespace PokemonSkills {
    const lashoutVentText = "world_combat.move.lashout.text.vent";
    const lashoutHitText = "world_combat.move.lashout.text.hit";
    const lashoutRageText = "world_combat.move.lashout.text.rage";

    define({
        id: lashoutId,
        cooldownParameter: "recharge",
        name: "Lash Out",
        description: "把被削弱的怒气朝目标一次喷出：自身任一项能力等级为负时威力翻倍；命中后消掉负等级，开启宣泄时把怒气化作攻击提升。",
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
