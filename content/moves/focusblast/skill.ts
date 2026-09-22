/**
 * 真气弹 / focusblast —— 注册与动作。
 *
 * 三幕：
 *   蓄（charge，提交前）：施法者沉身站定，气点从四面向身前压紧（`action.present` 预告）；可被打断，不花 PP。
 *   飞（travel，提交后）：一团不稳定真气沿准线砸出——按 `scatter` 随机偏一个角度，等级与特攻越高越听话。
 *   击（blast / fizzle）：命中活物时结算一次全校最重的特殊伤害，并把目标沿气团方向推开 `blowback`，
 *       按概率用共享 `NativeEffects.boost(..., "spd", -1)` 压低特防；打空只留一下溃散。
 *
 * 与同族分开：磨防远击四式里唯一站定蓄势、唯一把人推开、唯一用散布如实表达命中率、也唯一不留下任何东西。
 * 配置 `unleash`（全力释放）由 resolve 改时序、由公式改威力／散布。
 */
namespace PokemonSkills {
    const focusblastScene = "world_combat:move_focusblast";
    const focusblastSunderText = "world_combat.move.focusblast.text.sunder";

    define({
        id: "focusblast",
        name: "Focus Blast",
        description: "站定把气在体内压紧，再把一团不稳定的真气砸向目标：造成全族最重的特殊伤害，把目标推开，并可能压低其特防 1 级。力量太满时会明显飞偏，等级越高越稳。",
        uses: ["拉开距离对站桩目标砸出最重的一发", "把贴脸的对手或掩体后的人推出去", "用最高单发伤害先行减员"],
        kind: "enemy",
        range: 16,
        maxRange: 22,
        prepare: 26,
        active: 0,
        recover: 12,
        cooldown: 40,
        style: "focus",
        stationary: true,
        defaults: { unleash: false, ai: { maxChase: 20, minRange: 6, bulkFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("focusblast", "reach", pokemon), geometry: "line", style: "focus",
                color: 0xE8C86A, label: config && config.unleash === true ? "全力真气弹" : "真气弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["focusblast"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const unleash = !!(config && config.unleash);
            return {
                prepare: Math.round(p("focusblast", "charge", context)),
                recover: 12,
                cooldown: 40 + (unleash ? 4 : 0),
                active: 0,
                range: p("focusblast", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:focusblast:" + action.id(), focusblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", motes: Math.round(p("focusblast", "motes", action)),
                    unleash: config && config.unleash ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("focusblast", "core", action);
            const scatter = p("focusblast", "scatter", action);
            const speed = p("focusblast", "velocity", action);
            const radius = p("focusblast", "radius", action);
            const chance = p("focusblast", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("focusblast", "sunderStage", action)));
            const blowback = p("focusblast", "blowback", action);
            const motes = Math.max(16, Math.round(p("focusblast", "motes", action)));
            const scale = Math.max(0.6, Math.min(2.6, power / 116));
            const intensity = Math.max(0.6, Math.min(2.6, power / 116));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            // 散布：把准线在水平面上随机偏转 `scatter` 度以内的一个角度，这就是原生 70 命中的即时翻译。
            const base = aim(action);
            const tilt = (world.random() * 2 - 1) * scatter * Math.PI / 180;
            const side = WorldCombat.point(-base.z(), 0, base.x());
            const lateral = side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
            const heading = base.scale(Math.cos(tilt)).plus(lateral.scale(Math.sin(tilt))).unit();

            sound(action, "cobblemon:impact.fighting");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: heading,
                lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: {
                    sprite: "cobblemon:generic/orb/largefadeorb", tint: 0xE8C86A, glow: true,
                    scale: Math.max(0.9, Math.min(2.2, radius / 0.3))
                },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "focusblast", power, { damage: damageSpec("focusblast", "core") });
                        if (landed) {
                            const outward = point.minus(origin);
                            if (outward.length() > 0.1 && scope.valid(victim))
                                scope.displace(victim, WorldCombat.point(outward.x(), 0, outward.z()).unit().scale(blowback));
                            if (scope.valid(victim) && scope.random() < chance) {
                                NativeEffects.boost(scope, victim, "spd", -stages);
                                const body = scope.observe(victim);
                                if (body !== null)
                                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), focusblastSunderText, [stages], 30);
                            }
                        }
                        WorldFeedback.emit(scope, focusblastScene, 1, point,
                            { moment: "blast", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 28);
                        sound(current, "cobblemon:impact.fighting");
                    } else {
                        WorldFeedback.emit(scope, focusblastScene, 1, point,
                            { moment: "fizzle", motes: motes, scale: scale }, 22);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "focusblast:trail:" + action.id(), focusblastScene, 1, origin,
                { moment: "travel", projectile: flight, motes: motes, scale: scale, intensity: intensity }, 90);
        }
    });
}
