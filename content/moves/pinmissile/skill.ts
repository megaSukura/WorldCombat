/**
 * 飞弹针 / pinmissile 的出手方式。本族「2～5 连发硬物」的虫型。
 *
 * 核心念头：**追身针雨**——抖开一身细针，一根接一根带着追踪飞向目标；每根扎进身上留一次伤害，并且钉在那里不拔。
 *   钉得越多拖拽越重。它是本族唯一的追踪连发：单根最轻、出手最快、PP 最多，卖的是「钉满一身」。
 *
 * 三幕（提交前只播预告）：
 *   起（bristle）：针架竖起、针尖挂虫绿微光，只播预告。
 *   射（volley → stick）：提交后每 `gap` 刻射出一根带 `turn` 追踪的细针（外观是虫绿针），沿最短弧追向目标。
 *   钉（stick / done）：命中结算一次 `quill` 物理伤害，把 `world_combat:pinmissile_quills` 的振幅 +1（上限 `pins`）、
 *       并按 `stick` 刷新时长；rules.ts 按振幅给目标施加对应等级的减速。这一梭打完收势。
 *
 * 与同族分开：岩石爆击走弧线、冰锥碎在目标身上、尖刺加农炮直线穿排；只有飞弹针带追踪，并且把针留在目标身上。
 *
 * 配置 `barbed`（倒钩针）由公式改威力／针数／针速／散布／钉住时长与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: "pinmissile",
        cooldownParameter: "recharge",
        name: "Pin Missile",
        description: "抖开一身细针，一根接一根带追踪飞向目标：每根扎进去一次，并钉在身上不拔。钉得越多拖拽越重（减速）。倒钩针少而狠、钉得久；速射针多而轻、出手快。",
        uses: ["中远距离一梭带追踪的细针", "用钉刺减速目标，越钉越慢", "单根轻、出手快，适合持续压制"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 22,
        maximumTicks: 240,
        style: "quill",
        defaults: { barbed: false, ai: { maxChase: 12, stick: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("pinmissile", "reach", pokemon), geometry: "line", style: "quill", color: 0x9FD44A,
                label: config && config.barbed === true ? "倒钩针" : "速射针" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["pinmissile"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("pinmissile", "tempo", context)),
                recover: Math.round(p("pinmissile", "aftercast", context)),
                cooldown: Math.round(p("pinmissile", "recharge", context)),
                active: 0,
                range: p("pinmissile", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shots = Math.max(2, Math.min(5, Math.round(p("pinmissile", "shots", action))));
            action.present("pinmissile:bristle", pinMissileScene, 1, action.origin(),
                JSON.stringify({ moment: "bristle", shots: shots, barbed: config && config.barbed === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("pinmissile", "quill", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("pinmissile", "shots", action))));
            const gap = Math.max(1, Math.round(p("pinmissile", "gap", action)));
            const speed = Math.max(0.8, p("pinmissile", "velocity", action));
            const turn = Math.max(4, p("pinmissile", "turn", action));
            const radius = Math.max(0.08, p("pinmissile", "radius", action));
            const reach = p("pinmissile", "reach", action);
            const spread = Math.max(0.5, p("pinmissile", "spread", action));
            const pins = Math.max(2, Math.round(p("pinmissile", "pins", action)));
            const stickTicks = Math.max(40, Math.round(p("pinmissile", "stick", action)));
            const bristles = Math.max(6, Math.round(p("pinmissile", "bristles", action)));
            const barbed = !!(config && config.barbed);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.13));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            let shot = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function volley(current: CombatAction): void {
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { finish(current); return; }
                const origin = current.origin(), centre = body.position();
                let heading = centre.minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                heading = heading.unit();
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const direction = WorldCombat.point(heading.x() * cos - heading.z() * sin, heading.y(), heading.x() * sin + heading.z() * cos);
                const index = shot + 1;
                shot = index;
                sound(current, "minecraft:entity.arrow.shoot");
                WorldFeedback.emit(scope, pinMissileScene, 1, origin,
                    { moment: "volley", shot: index, shots: shots, bristles: bristles, scale: scale, intensity: intensity, barbed: barbed ? 1 : 0 }, 16);
                LivingActions.projectile(current, {
                    speed: speed, range: reach + 3, radius: radius, direction: direction,
                    lifetime: Math.max(30, Math.round((reach + 3) / Math.max(0.5, speed)) + 20),
                    appearance: {
                        sprite: "cobblemon:particle/generic/spike", tint: 0x9FD44A, glow: true,
                        scale: Math.max(0.7, Math.min(1.4, radius / 0.13)),
                        homing: { target: targetRef, turn: turn, range: reach + 3 }
                    } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const struck = hit.target();
                        const at = hit.position();
                        if (struck === null || !scope2.valid(struck) || scope2.friendly(struck)) return;
                        if (!impact(inner, hit, "pinmissile", power, { damage: damageSpec("pinmissile", "quill") })) return;
                        const existing = MobEffects.read(scope2, struck, pinMissileQuills);
                        const currentAmp = existing ? existing.amplifier() : -1;
                        const next = Math.min(pins - 1, currentAmp + 1);
                        CombatStatus.apply(scope2, struck, "quills", pinMissileQuills, stickTicks, next);
                        WorldFeedback.emit(scope2, pinMissileScene, 1, at,
                            { moment: "stick", target: String(struck.ref()), shot: index, shots: shots, count: next + 1, pins: pins,
                                bristles: bristles, scale: scale, intensity: intensity, duration: stickTicks }, 18);
                        sound(inner, "cobblemon:impact.bug");
                    }
                }, function (inner: CombatAction) {
                    inner.after(gap, function (next: CombatAction) { volley(next); });
                });
            }

            sound(action, "minecraft:entity.arrow.shoot");
            WorldFeedback.emit(world, pinMissileScene, 1, action.origin(),
                { moment: "bristle", shots: shots, bristles: bristles, scale: scale, intensity: intensity, barbed: barbed ? 1 : 0 }, 14);
            volley(action);
        }
    });
}
