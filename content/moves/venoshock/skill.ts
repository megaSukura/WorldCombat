/**
 * 毒液冲击 / venoshock 的出手方式。
 *
 * 念头的形状：口边凝起一泼腐蚀性毒液（gather）→ 沿一条下坠的弧线甩向瞄点（flight，本体是原生投射物，客户端尾迹绑它的 ref）→
 * 命中活体炸开（splash）；若目标体内已在中毒，毒液与它发生反应，那一下翻倍，并把这口的毒升格为剧毒、延长持续时间（react）。
 * 瞄点/空放、碰到方块都只溅开一摊装饰（fizzle），首碰即结束。两幕：hurl → splash / react。
 * 配置 corrode 改变威力与毒性持续，走 resolve 把更长的收招与冷却算进去。
 */
namespace PokemonSkills {
    const venoshockScene = "world_combat:move_venoshock";
    const venoshockSplashText = "world_combat.move.venoshock.text.splash";
    const venoshockReactText = "world_combat.move.venoshock.text.react";
    const venoshockFizzleText = "world_combat.move.venoshock.text.fizzle";

    define({
        id: "venoshock",
        name: "Venoshock",
        description: "泼出一团腐蚀性毒液，沿弧线砸向目标。命中已中毒／剧毒的目标时威力翻倍，并把那份毒升格为剧毒、延长持续时间；打空只落下一摊毒水。",
        uses: ["远程消耗", "对中毒者补刀", "把中毒升格为剧毒"],
        kind: "aim",
        range: 14,
        prepare: 6,
        active: 40,
        recover: 8,
        cooldown: 30,
        style: "special",
        defaults: { corrode: false, ai: { maxChase: 12, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["venoshock"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var corrode = !!(config && config.corrode);
            return {
                prepare: p("venoshock", "prepare", context),
                recover: p("venoshock", "recover", context) + (corrode ? 2 : 0),
                cooldown: p("venoshock", "cooldown", context) + (corrode ? 4 : 0)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_venoshock:gather", venoshockScene, 1, action.origin(), JSON.stringify({ moment: "gather" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const globScenes = WorldFeedback.actionScenes(venoshockScene);
            const origin = action.origin();
            const speed = p("venoshock", "globSpeed", action);
            const radius = p("venoshock", "globRadius", action);
            const gravity = p("venoshock", "arcGravity", action);
            const range = action.range();
            let settled = false;
            sound(action, "minecraft:entity.witch.throw");
            let glob = "";
            glob = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, gravity: gravity,
                appearance: { sprite: "cobblemon:particle/generic/goo/chemicalball", tint: 0xA855F7, glow: true },
                impact: function (current, hit) {
                    settled = true;
                    globScenes.stop(current, "glob:" + glob);
                    const body = current.world();
                    const target = hit.target();
                    const point = hit.position();
                    if (target === null || !body.valid(target)) {
                        WorldFeedback.emit(body, venoshockScene, 1, point, { moment: "fizzle" }, 20);
                        WorldFeedback.text(body, point, venoshockFizzleText, [], 22);
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    const ref = String(target.ref());
                    const poisoned = CombatStatus.has(body, target, "poison");
                    const power = p("venoshock", "glob", current);
                    const landed = impact(current, hit, "venoshock", power, { damage: damageSpec("venoshock", "glob"), knockback: false });
                    const force = Math.max(0.6, Math.min(2.2, power / 65));
                    // Real contact always splashes venom; only a settled hit shoves and reports success.
                    WorldFeedback.emit(body, venoshockScene, 1, point,
                        { moment: "splash", target: ref, intensity: force, splashCount: Math.round(34 * force) }, 26);
                    if (!landed) {
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    const delta = point.minus(origin);
                    const direction = delta.length() < 0.01 ? aim(current) : delta.unit();
                    if (body.valid(target)) body.hitDisplace(target, direction.scale(p("venoshock", "push", current)));
                    if (poisoned && body.valid(target)) {
                        const existing = MobEffects.read(body, target, "minecraft:poison");
                        const remaining = existing === null ? 0 : existing.duration();
                        const deepen = Math.max(p("venoshock", "toxinTicks", current), remaining + 20);
                        if (CombatStatus.inflict(body, target, "toxic", deepen, undefined, { secondary: true })) {
                            WorldFeedback.emit(body, venoshockScene, 1, point,
                                { moment: "react", target: ref, intensity: Math.min(2.4, force * 1.6), reactCount: Math.round(46 * force) }, 30);
                            WorldFeedback.text(body, point, venoshockReactText, [], 28);
                        } else {
                            WorldFeedback.text(body, point, venoshockSplashText, [], 24);
                        }
                    } else {
                        WorldFeedback.text(body, point, venoshockSplashText, [], 24);
                    }
                    sound(current, "cobblemon:impact.poison");
                }
            }, function (current) {
                settled = true;
                globScenes.finish(current, done);
            });
            if (!settled) globScenes.show(action, "glob:" + glob, origin,
                { moment: "flight", projectile: glob, tint: 0xA855F7, scale: radius / 0.3, intensity: Math.max(0.5, Math.min(2, p("venoshock", "glob", action) / 65)) });
        }
    });
}
