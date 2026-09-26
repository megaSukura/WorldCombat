/**
 * 飞弹针 / pinmissile 的出手方式。本族「2～5 连发硬物」的虫型。
 *
 * 核心念头：**追身针雨**——抖开一身细针，一根接一根带着追踪飞向目标；每根扎进身上留一次伤害，并且钉在那里不拔。
 *   钉得越多拖拽越重。它是本族唯一的追踪连发：单根最轻、出手最快、PP 最多，卖的是「钉满一身」。
 *
 * 三幕（提交前只播预告）：
 *   起（bristle）：针架竖起、针尖挂虫绿微光，只播预告。
 *   射（volley → stick / stuck）：提交后每 `gap` 刻射出一根真投递的细针（外观是虫绿针），
 *       目标还活着时带 `turn` 追踪飞向它；目标为 null（自由方向）或中途离场时，这根就按当刻准线直飞。
 *   钉（stick / stuck / done）：命中非友方结算一次 `quill` 物理伤害，把 `world_combat:pinmissile_quills`
 *       的振幅 +1（上限 `pins`）并按 `stick` 刷新时长；rules.ts 按振幅给目标施加对应等级的减速，
 *       并在状态存续期续上「身上钉着几根」的可见表现。撞到方块的那根只扎在原生方块格与表面上，不伤不钉。
 *
 * 与同族分开：岩石爆击走弧线、冰锥齐排平行、尖刺加农炮直线穿排；只有飞弹针带追踪，并且把针留在目标身上。
 * 选取 `kind: "aim"`：有敌人就追踪敌人，方向可空发；墙由原生投射物真实截断未附着的针。
 *
 * 配置 `barbed`（倒钩针）由公式改威力／针数／针速／散布／钉住时长与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: "pinmissile",
        cooldownParameter: "recharge",
        name: "Pin Missile",
        description: "抖开一身细针，一根接一根带追踪飞向目标：每根真正扎进去才结算一次，并钉在身上不拔。钉得越多拖拽越重（减速）。倒钩针少而狠、钉得久；速射针多而轻、出手快。没有目标时朝准线空发，墙上只扎住、不附着。",
        uses: ["中远距离一梭带追踪的细针", "用钉刺减速目标，越钉越慢", "单根轻、出手快，适合持续压制"],
        kind: "aim",
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
            const actor = action.actor();
            const aliveTarget = action.target();
            const targetRef = aliveTarget !== null && world.valid(aliveTarget) ? String(aliveTarget.ref()) : "";
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
            const scenes = WorldFeedback.actionScenes(pinMissileScene);
            let shot = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const body = current.world().observe(actor);
                if (body !== null)
                    WorldFeedback.emit(current.world(), pinMissileScene, 1, body.position(),
                        { moment: "done", shots: shots, bristles: bristles, scale: scale, intensity: intensity, barbed: barbed ? 1 : 0 }, 14);
                scenes.finish(current, done);
            }

            /** 当刻朝向：有合法敌人就取其身体为锚（追踪）；否则按当刻准线或朝向自由发射。 */
            function heading(current: CombatAction): { direction: CombatPoint; homing: boolean } {
                const scope = current.world();
                const victim = targetRef === "" ? null : scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) && !scope.friendly(victim) ? scope.observe(victim) : null;
                if (body !== null) {
                    const delta = body.position().minus(current.origin());
                    if (delta.length() >= 0.05) return { direction: delta.unit(), homing: true };
                }
                let point: CombatPoint | null = null;
                try { point = current.targetPosition(); } catch (error) { point = null; }
                if (point !== null && point.minus(current.origin()).length() >= 0.05)
                    return { direction: point.minus(current.origin()).unit(), homing: false };
                return { direction: current.direction(), homing: false };
            }

            function volley(current: CombatAction): void {
                if (settled) return;
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const aimState = heading(current);
                let direction = aimState.direction;
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                direction = WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
                const index = shot + 1;
                shot = index;
                const key = "quill:" + index;
                let resolved = false;
                sound(current, "minecraft:entity.arrow.shoot");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: reach + 3, radius: radius, direction: direction,
                    lifetime: Math.max(30, Math.round((reach + 3) / Math.max(0.5, speed)) + 20),
                    appearance: {
                        sprite: "cobblemon:particle/generic/spike", tint: 0x9FD44A, glow: true,
                        scale: Math.max(0.7, Math.min(1.4, radius / 0.13)),
                        homing: aimState.homing ? { target: targetRef, turn: turn, range: reach + 3 } : undefined
                    } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        resolved = true;
                        scenes.stop(inner, key);
                        const stage = inner.world();
                        const struck = hit.target();
                        const at = hit.position();
                        if (struck === null || !stage.valid(struck) || stage.friendly(struck)) {
                            // 撞墙：只按原生方块格与表面扎住一根，不伤不钉。
                            const cell = hit.blockPosition();
                            WorldFeedback.emit(stage, pinMissileScene, 1, cell === null ? at : cell,
                                { moment: "stuck", shot: index, shots: shots, scale: scale, intensity: Math.max(0.4, intensity * 0.7),
                                    face: hit.blockFace(), blocked: hit.blocked() ? 1 : 0 }, 16);
                            return;
                        }
                        const landed = impact(inner, hit, "pinmissile", power, { damage: damageSpec("pinmissile", "quill") });
                        if (!landed) {
                            WorldFeedback.emit(stage, pinMissileScene, 1, at,
                                { moment: "blocked", target: String(struck.ref()), shot: index, shots: shots, scale: scale,
                                    intensity: Math.max(0.4, intensity * 0.7) }, 16);
                            return;
                        }
                        const existing = MobEffects.read(stage, struck, pinMissileQuills);
                        const currentAmp = existing ? existing.amplifier() : -1;
                        const next = Math.min(pins - 1, currentAmp + 1);
                        CombatStatus.apply(stage, struck, "quills", pinMissileQuills, stickTicks, next);
                        WorldFeedback.emit(stage, pinMissileScene, 1, at,
                            { moment: "stick", target: String(struck.ref()), shot: index, shots: shots, count: next + 1, pins: pins,
                                bristles: bristles, scale: scale, intensity: intensity, duration: stickTicks }, 18);
                        sound(inner, "cobblemon:impact.bug");
                    }
                }, function (inner: CombatAction) {
                    if (!resolved) scenes.stop(inner, key);
                    if (shot < shots) inner.after(gap, function (next: CombatAction) { volley(next); });
                    else finish(inner);
                });
                if (!settled) scenes.show(current, key, current.origin(),
                    { moment: "volley", projectile: flight, shot: index, shots: shots, bristles: bristles,
                        scale: scale, intensity: intensity, barbed: barbed ? 1 : 0, homing: aimState.homing ? 1 : 0 });
            }

            sound(action, "minecraft:entity.arrow.shoot");
            WorldFeedback.emit(world, pinMissileScene, 1, action.origin(),
                { moment: "bristle", shots: shots, bristles: bristles, scale: scale, intensity: intensity, barbed: barbed ? 1 : 0 }, 14);
            volley(action);
        }
    });
}
