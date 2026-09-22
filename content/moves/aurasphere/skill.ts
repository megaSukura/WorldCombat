/**
 * 波导弹 / aurasphere —— 注册与动作。
 *
 * 核心念头：一颗会自己拐弯的波导球。球飞出去以后一路朝目标修正方向，你跑它拐，所以甩不掉——这就是必中。
 *
 * 两幕：
 *   起（windup，提交前）：波导之力从体内被逼到掌前，凝成一颗脉动的球，只播预告。
 *   放（launch → burst，提交后）：球沿瞄准线射出，按 `turn` 每刻朝目标转向、按 `lockRange` 咬住目标；
 *       命中活体即结算 `pulse` 波导伤害、炸开一圈格斗冲击。目标在飞行中跑开也甩不掉（必中）；目标消失则空转散去。
 *
 * 与同族分开：魔法叶、高速星星是散成一群、各追各的；波导弹只有一颗，密度高、射程最远、追得最死、单发最重。
 */
namespace PokemonSkills {
    define({
        id: aurasphereId,
        name: "Aura Sphere",
        description: "从体内逼出一颗波导球射向对手；球会一路拐弯追去，攻击必定会命中。远追更远也追得更死；撞波更粗更快更重、射程更近。",
        uses: ["远距离点名一个目标", "追打走位、拉距离的对手", "用一颗密度高的球压住中距离"],
        kind: "enemy",
        range: 16,
        maxRange: 22,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "aura",
        defaults: { seek: false, ai: { maxChase: 20, pursue: true, finish: true } },
        fields: [flag("seek", "远追")],
        indicator: function (config, pokemon) {
            return { radius: p(aurasphereId, "reach", pokemon), geometry: "line", style: "aura", color: 0x6FA8FF,
                label: config && config.seek === true ? "波导弹·远追" : "波导弹·撞波" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aurasphereId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aurasphereId, "tempo", context)),
                recover: Math.round(p(aurasphereId, "aftercast", context)),
                cooldown: Math.round(p(aurasphereId, "recharge", context)),
                active: 0,
                range: p(aurasphereId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("aurasphere:charge", aurasphereScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, seek: !!(config && config.seek) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(aurasphereId, "pulse", action);
            const speed = Math.max(0.5, p(aurasphereId, "velocity", action));
            const turn = Math.max(4, p(aurasphereId, "turn", action));
            const radius = Math.max(0.15, p(aurasphereId, "radius", action));
            const reach = Math.max(4, p(aurasphereId, "reach", action));
            const lock = Math.max(reach, p(aurasphereId, "lockRange", action));
            const motes = Math.max(10, Math.round(p(aurasphereId, "motes", action)));
            const scale = Math.max(0.7, Math.min(1.8, radius / 0.32));
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));
            const chase = lock + 6;
            const selected = action.target();

            sound(action, "minecraft:entity.breeze.wind_burst");

            if (selected === null || !world.valid(selected)) {
                WorldFeedback.emit(world, aurasphereScene, 1, action.origin().plus(action.direction().scale(2)),
                    { moment: "miss", motes: motes, scale: scale }, 20);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.2, 0)), aurasphereMissText, [], 22);
                done(action);
                return;
            }

            const reference = String(selected.ref());
            const flight = LivingActions.projectile(action, {
                speed: speed, range: chase, radius: radius, lifetime: 200,
                appearance: {
                    sprite: "cobblemon:generic/orb/energyorb", tint: 0x6FA8FF, glow: true, scale: scale,
                    homing: { target: reference, turn: turn, delay: 1, range: chase }
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    WorldFeedback.emit(scope, aurasphereScene, 1, point,
                        { moment: "burst", target: victim === null ? "" : String(victim.ref()),
                            motes: motes, scale: scale, intensity: intensity }, 24);
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        impact(current, hit, aurasphereId, power, { damage: damageSpec(aurasphereId, "pulse") });
                        scope.sound("cobblemon:impact.fighting", point, 16, "{}");
                    }
                }
            }, function (current: CombatAction) {
                done(current);
            });
            WorldFeedback.keep(world, "aurasphere:flight:" + action.id(), aurasphereScene, 1, action.origin(),
                { moment: "flight", projectile: flight, motes: motes, scale: scale, intensity: intensity }, 140);
        }
    });
}
