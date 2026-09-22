/**
 * 充电光束 / chargebeam 的出手方式。
 *
 * 核心念头：把身体里的电压成一道细束射出去；压电的过程在体内积下一股余流——命中时余流顺着手臂回灌，
 *   把特攻抬起来，并在命中点上再咬一口。它是四式里唯一的远距离直线光束：蓄得越久越远越强、余流也越足；
 *   代价是起手最长，被打断就白蓄。
 *
 * 三幕：
 *   起（windup，提交前）：电弧向身前一点收拢、越收越亮，只播预告，可被打断。
 *   射（travel，提交后）：细束沿准线飞出（只做有限修正）；画面上拖一条剥落的电尾。
 *   击（hit → residual / fizzle）：命中第一个非友方即结算 `beam` 特殊伤害，并掷一次余流回灌——
 *       成功则特攻提升 `surgeStages` 级；`residualDelay` 刻后余流在命中点再吃一口直击的 `residualShare`。
 *       打空或撞墙只留一下散电。
 *
 * 与同族分开：火之舞是贴着自己跳、覆盖全身、扫一圈；充电光束是远远一点直线过去、命中了才回灌特攻。
 *   与十万伏特也不同：它是一条细束、蓄电驱动、命中后涨特攻而不是麻痹。
 *
 * 配置 `overcharge`（过充）由 resolve 改时序、由公式改射程／威力／几率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const chargebeamScene = "world_combat:move_chargebeam";
    const chargebeamHitText = "world_combat.move.chargebeam.text.hit";
    const chargebeamSurgeText = "world_combat.move.chargebeam.text.surge";
    const chargebeamResidualText = "world_combat.move.chargebeam.text.residual";
    const chargebeamFizzleText = "world_combat.move.chargebeam.text.fizzle";

    define({
        id: "chargebeam",
        name: "Charge Beam",
        description: "The user attacks the target with an electric charge. The residual electricity may also boost the user's Sp. Atk stat.",
        uses: ["中远距离的一发蓄电细束", "命中后回灌特攻，为下一发法术蓄势", "隔着一段距离先手压血"],
        kind: "enemy",
        range: 9,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "beam",
        defaults: { overcharge: false, ai: { maxChase: 13, chargeFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("chargebeam", "reach", pokemon), geometry: "line", style: "beam", color: 0xFFE14D,
                label: config && config.overcharge === true ? "过充光束" : "充电光束" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["chargebeam"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("chargebeam", "tempo", context)),
                recover: Math.round(p("chargebeam", "aftercast", context)),
                cooldown: Math.round(p("chargebeam", "recharge", context)),
                active: 0,
                range: p("chargebeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(5, Math.round(p("chargebeam", "arcs", action)));
            action.present("world_combat:move_chargebeam:windup", chargebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, arcs: arcs,
                    overcharge: config && config.overcharge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const power = p("chargebeam", "beam", action);
            const speed = p("chargebeam", "velocity", action);
            const radius = p("chargebeam", "radius", action);
            const chance = Math.max(0.02, Math.min(0.98, p("chargebeam", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("chargebeam", "surgeStages", action)));
            const share = Math.max(0.1, Math.min(0.9, p("chargebeam", "residualShare", action)));
            const delay = Math.max(2, Math.round(p("chargebeam", "residualDelay", action)));
            const arcs = Math.max(5, Math.round(p("chargebeam", "arcs", action)));
            const turn = p("chargebeam", "homing", action);
            const scale = Math.max(0.5, Math.min(2.2, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.4, power / 50));
            const flow = Math.round(50 + power * 0.5);
            const target = action.target();
            let victimRef = "", residual = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function surge(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                if (scope.random() >= chance) return;
                NativeEffects.boost(scope, actor, "spa", stages);
                const self = scope.observe(actor);
                const at = self === null ? point : self.position();
                WorldFeedback.emit(scope, chargebeamScene, 1, at,
                    { moment: "surge", target: String(actor.ref()), stages: stages, arcs: arcs, scale: scale }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.5 : self.height() + 0.1, 0)),
                    chargebeamSurgeText, [stages], 28);
                sound(current, "minecraft:block.respawn_anchor.charge");
            }

            function residualStrike(current: CombatAction): void {
                const scope = current.world();
                const victim = victimRef === "" ? null : scope.actor(victimRef);
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    const landed = hurt(current, victim, "chargebeam", power * share,
                        { damage: damageSpec("chargebeam", "beam") });
                    if (landed) {
                        const body = scope.observe(victim);
                        const at = body === null ? current.origin() : body.position();
                        WorldFeedback.emit(scope, chargebeamScene, 1, at,
                            { moment: "residual", target: String(victim.ref()), arcs: arcs, scale: scale,
                                intensity: Math.max(0.4, Math.min(2.0, power * share / 50)) }, 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), chargebeamResidualText, [], 22);
                        sound(current, "cobblemon:impact.electric");
                    }
                }
                finish(current);
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/smallbeam", tint: 0xFFE14D, glow: true,
                scale: Math.max(0.7, Math.min(1.8, radius / 0.24))
            };
            if (target !== null && world.valid(target))
                appearance.homing = { target: String(target.ref()), turn: turn, delay: 0, range: action.range() + 5 };

            sound(action, "cobblemon:move.thunderbolt.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                lifetime: Math.max(26, Math.round(action.range() / Math.max(0.2, speed) + 20)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "chargebeam", power,
                            { damage: damageSpec("chargebeam", "beam") });
                        WorldFeedback.emit(scope, chargebeamScene, 1, point,
                            { moment: "hit", target: String(victim.ref()), arcs: arcs, scale: scale, intensity: intensity }, 26);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), chargebeamHitText, [], 24);
                        sound(current, "cobblemon:impact.electric");
                        if (landed && scope.valid(victim)) {
                            victimRef = String(victim.ref());
                            surge(current, point);
                        }
                    } else {
                        WorldFeedback.emit(scope, chargebeamScene, 1, point, { moment: "fizzle", arcs: arcs, scale: scale }, 20);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)), chargebeamFizzleText, [], 22);
                    }
                }
            }, function (current: CombatAction) {
                if (victimRef !== "" && !residual) { residual = true; current.after(delay, function (next: CombatAction) { residualStrike(next); }); return; }
                finish(current);
            });

            WorldFeedback.keep(world, "chargebeam:travel:" + action.id(), chargebeamScene, 1, origin,
                { moment: "travel", projectile: flight, arcs: arcs, scale: scale, intensity: intensity, flow: flow }, 90);
        }
    });
}
