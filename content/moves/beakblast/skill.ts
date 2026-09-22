/**
 * 鸟嘴加农炮 / beakblast 的出手方式。
 *
 * 核心念头：**先把自己烧热、再当炮管射出一发**——提交后把鸟嘴烧到赤热、站定 `heat` 刻，这段时间里任何用身体
 *   碰到它的敌人都会被烫伤；窗口走完，喙弹直线射出去。它是一记愿意用「站定挨打」换「更重一炮」的招：
 *   窗口越长炮越重，对手要么躲开不碰、要么硬贴上来吃一次烫。
 *
 * 三幕：
 *   起（windup，提交前）：抬起鸟嘴、把它对准目标，只播预告，此时代价未结清。
 *   热（heat）：提交后挂上 `world_combat:beak_heat`（共享身份 `world_combat:status/beakblast`）与机读记号
 *       （guard／burnTicks／sparks），站定烧 `heat` 刻；窗口里被敌对接触就由 parameters.ts 的监听把攻击者点着。
 *   射（fire → burst / miss）：窗口走完取掉记号，喙弹沿瞄准方向直线飞出（bullet、不接触），命中结算 `shot`。
 *
 * 与同族分开：神圣之火裹着自己俯冲、火焰球是踢出的实心火石、大字爆炎是一幅字；只有鸟嘴加农炮先把鸟嘴烧热
 *   再射，且加热窗口对贴身的人是陷阱。
 *
 * 配置 `forge`（赤热式）由 `resolve` 改时序与射程、由公式改加热／威力／弹速，提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: "beakblast",
        name: "Beak Blast",
        description: "The user first heats up its beak, and then it attacks the target. Making direct contact with the user while it is heating up its beak results in a burn.",
        uses: ["站定烧热鸟嘴，再用一发喙弹打穿目标", "用加热窗口惩罚贴上来的人", "用更长的加热换更重的一炮"],
        kind: "enemy",
        range: 14,
        maxRange: 19,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 38,
        maximumTicks: 320,
        style: "cannon",
        defaults: { forge: false, ai: { maxChase: 16, punish: true, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("beakblast", "reach", pokemon) : 14, geometry: "line", style: "cannon",
                color: 0xFF7A2E, label: config && config.forge === true ? "赤热式鸟嘴加农炮" : "速射式鸟嘴加农炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["beakblast"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("beakblast", "tempo", context)),
                recover: Math.round(p("beakblast", "aftercast", context)),
                cooldown: Math.round(p("beakblast", "recharge", context)),
                active: 0,
                range: p("beakblast", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_beakblast:raise", beakblastScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", forge: config && config.forge === true ? 1 : 0,
                    flames: Math.round(p("beakblast", "flames", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const heat = Math.max(10, Math.round(p("beakblast", "heat", action)));
            const power = p("beakblast", "shot", action);
            const velocity = p("beakblast", "velocity", action);
            const gravity = p("beakblast", "gravity", action);
            const radius = p("beakblast", "radius", action);
            const guard = p("beakblast", "guard", action);
            const burnTicks = Math.max(40, Math.round(p("beakblast", "burnTicks", action)));
            const sparks = Math.max(10, Math.round(p("beakblast", "sparks", action)));
            const flames = Math.max(12, Math.round(p("beakblast", "flames", action)));
            const forge = !!(config && config.forge);
            const scale = Math.max(0.6, Math.min(2.0, guard / 1.6));
            const intensity = Math.max(0.6, Math.min(2.4, power / 100));
            const direction = aim(action);
            let elapsed = 0, fired = false, settled = false;

            function release(current: CombatAction): void {
                try {
                    const scope = current.world();
                    MobEffects.consume(scope, actor, beakblastEffect);
                    const marks = scope.effects(actor, beakblastMark);
                    for (let index = 0; index < marks.length; index++) scope.operation(marks[index].id(), "world_combat:dispel", "{}");
                } catch (error) { /* action already released its world handle */ }
            }

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            MobEffects.apply(world, actor, beakblastEffect, heat, 0);
            world.effect(beakblastMark, actor, JSON.stringify({ guard: guard, burnTicks: burnTicks, sparks: sparks }), heat);
            sound(action, "minecraft:item.firecharge.use");
            WorldFeedback.emit(world, beakblastScene, 1, body.position(),
                { moment: "heat", guard: guard, heat: heat, flames: flames, sparks: sparks, scale: scale,
                    intensity: intensity, progress: 0 }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), beakblastHeatText, [Math.round(heat / 20)], 24);

            /** 加热窗口：站定烧热。窗口里被接触由 parameters.ts 的监听处理，这里只维持表现与计时。 */
            function heatStep(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null || !scope.valid(actor)) { release(current); finish(current); return; }
                current.stopMovement();
                elapsed += 6;
                const progress = Math.min(1, elapsed / Math.max(1, heat));
                WorldFeedback.keep(scope, "beakblast:heat:" + current.id(), beakblastScene, 1, self.position(),
                    { moment: "heat", guard: guard, heat: heat, flames: flames, sparks: sparks, scale: scale,
                        intensity: intensity, progress: progress }, 12);
                if (elapsed >= heat) { fire(current); return; }
                current.after(6, function (next: CombatAction) { heatStep(next); });
            }

            /** 窗口走完，取掉记号，喙弹直线射出。 */
            function fire(current: CombatAction): void {
                if (fired) return;
                fired = true;
                const scope = current.world();
                release(current);
                WorldFeedback.emit(scope, beakblastScene, 1, current.origin(),
                    { moment: "fire", velocity: velocity, reach: current.range(), sparks: sparks, scale: scale,
                        intensity: intensity }, 20);
                sound(current, "minecraft:entity.blaze.shoot");
                LivingActions.projectile(current, {
                    speed: velocity, range: current.range(), radius: radius, gravity: gravity, lifetime: 200,
                    direction: direction,
                    appearance: { sprite: "cobblemon:generic/spike", tint: 0xFFB347, glow: true,
                        scale: Math.max(0.8, Math.min(1.8, radius / 0.22)) },
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        const innerScope = inner.world();
                        const target = hit.target();
                        const point = hit.position();
                        if (target !== null && innerScope.valid(target) && !innerScope.friendly(target)) {
                            const landed = impact(inner, hit, "beakblast", power, { damage: damageSpec("beakblast", "shot") });
                            WorldFeedback.emit(innerScope, beakblastScene, 1, point,
                                { moment: "burst", target: String(target.ref()), sparks: sparks, scale: scale,
                                    intensity: intensity, landed: landed ? 1 : 0 }, 26);
                            sound(inner, "cobblemon:impact.flying");
                        } else if (target === null) {
                            WorldFeedback.emit(innerScope, beakblastScene, 1, point,
                                { moment: "miss", sparks: sparks, scale: scale }, 18);
                            WorldFeedback.text(innerScope, point.plus(WorldCombat.point(0, 1.0, 0)), beakblastMissText, [], 20);
                        }
                        finish(inner);
                    }
                }, function (inner: CombatAction) {
                    WorldFeedback.emit(inner.world(), beakblastScene, 1, inner.origin(), { moment: "fade", scale: scale }, 14);
                    finish(inner);
                });
            }

            action.on("world_combat:interrupt", function (current: CombatAction) {
                if (settled) return;
                release(current);
            });

            heatStep(action);
        }
    });
}
