/**
 * 热水 / scald 的出手方式。
 *
 * 核心念头：把一壶水在掌中烧滚，兜手抛出去——水弹拖着白汽沿浅弧飞出，命中炸开成一片滚烫的水花，
 *   落点留一摊还在翻滚的水洼；踏进水洼的人被烫、可能灼伤，沸水也把目标与自己的冰冻化开。
 *   它是这一族里唯一拿水当材料的一招：烫来自水里，湿身的目标被沸水浇得更狠。
 *
 * 三幕：
 *   起（steep，提交前）：掌中翻起白汽、水在指缝间滚开的预告，只播画面。
 *   抛（flight，提交后）：水弹带一条白汽尾沿浅弧飞出。
 *   沸（burst / pool）：命中活物时结算 boil 伤害（湿身目标 ×1.18）并按概率灼伤，随即解冻；
 *       水弹落地（命中或落空）都在那里摊开一摊水洼（`WorldEffects.field`，本单元规则），
 *       踏入者按 slickChance 被烫、站着不走按 seetheInterval 反复挨 seethe，直到 slickTicks 到点蒸干。
 *
 * 与同族分开：热风是一道推人的热浪、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热水把「湿」与「烫」
 *   同时留在原地，并解开冰冻。配置 simmer 由 resolve 改时序、由公式改威力／水洼，提交后才触碰世界。
 */
namespace PokemonSkills {
    const scaldScene = "world_combat:move_scald";
    const scaldField = "world_combat:field/scald";
    const scaldBurnText = "world_combat.move.scald.text.burn";
    const scaldThawText = "world_combat.move.scald.text.thaw";

    /** 冻结的施法者仍能烧开这壶水（原生 defrost）：提交检查放行本招的冰冻限制。 */
    CombatStatus.actions.define({
        id: "world_combat:move_scald/defrost",
        applies: function (context: CombatStatus.ActionPolicy) {
            return !!context.action && String(context.action.content()) === "world_combat:scald";
        },
        apply: function (context: CombatStatus.ActionPolicy) { delete context.blocked.frozen; }
    });

    /** 一摊还在翻滚的水洼：踏入被烫一次，站着不走按间隔反复挨烫。 */
    WorldEffects.fieldRule(scaldField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, scaldScene, 1, body.position(),
                { moment: "wet", target: String(actor.ref()), scale: field.radius / 1.8 }, 22);
            if (world.random() < (Number(field.data.burn) || 0) && CombatStatus.inflict(world, actor, "burn"))
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), scaldBurnText, [], 24);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const ref = String(actor.ref()), next = field.data.next || (field.data.next = {});
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + (Number(field.data.interval) || 10);
            const body = world.observe(actor);
            if (body === null) return;
            if (!hurt(world, actor, "scald", Number(field.data.seethe) || 1, { damage: damageSpec("scald", "seethe") })) return;
            WorldFeedback.emit(world, scaldScene, 1, body.position(),
                { moment: "wet", target: ref, seethe: Math.round(Number(field.data.seethe) || 0), scale: field.radius / 1.8 }, 18);
        }
    });

    /** 把落点摊平到脚边，再租出一摊水洼；水洼自己按 slickTicks 蒸干。 */
    function scaldPool(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, burn: number, seethe: number, interval: number): void {
        const ground = WorldCombat.point(point.x(), Math.floor(point.y()) + 0.05, point.z());
        WorldEffects.field(world, scaldField, ground, Math.max(0.6, radius),
            { burn: burn, seethe: seethe, interval: interval, radius: radius, next: {} }, Math.max(20, Math.round(ticks)));
        WorldFeedback.emit(world, scaldScene, 1, ground,
            { moment: "pool", radius: radius, scale: radius / 1.8, seethe: Math.round(seethe),
                bubbles: Math.round(10 + radius * 10 + seethe * 0.6) }, Math.max(20, Math.round(ticks)));
    }

    define({
        id: "scald",
        name: "Scald",
        description: "The user attacks by shooting boiling hot water at the target. This may also leave the target with a burn.",
        uses: ["抛一壶沸水直接点着目标", "在落点留下一摊烫人的水洼封住一块地", "化开目标与自己身上的冰冻", "浇湿身的目标赚一份额外伤害"],
        kind: "enemy",
        range: 12,
        maxRange: 16,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "scald",
        defaults: { simmer: false, ai: { maxChase: 14, soakWet: true, soakCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("scald", "slickRadius", pokemon), geometry: "line", style: "scald",
                color: 0x8FD8FF, label: config && config.simmer === true ? "久沸热水" : "急沸热水" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["scald"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("scald", "steep", context)),
                recover: Math.round(p("scald", "settle", context)),
                cooldown: Math.round(p("scald", "recharge", context)),
                active: skills["scald"].active,
                range: p("scald", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("scald:steep", scaldScene, 1, action.origin(),
                JSON.stringify({ moment: "steep", simmer: config && config.simmer === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("scald", "boil", action);
            const speed = p("scald", "globSpeed", action);
            const radius = Math.max(0.6, p("scald", "slickRadius", action));
            const slickTicks = Math.max(20, Math.round(p("scald", "slickTicks", action)));
            const seethe = Math.max(1, p("scald", "seethe", action));
            const interval = Math.max(5, Math.round(p("scald", "seetheInterval", action)));
            const burnChance = Math.max(0.05, Math.min(0.6, p("scald", "burnChance", action)));
            const slickChance = Math.max(0.02, Math.min(0.4, p("scald", "slickChance", action)));
            const drops = Math.max(6, Math.round(p("scald", "drops", action)));
            const scale = radius / 1.8;
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));
            let settled = false, struck = false;

            // 原生 defrost：烧开这壶水的一刻先解掉自己身上的冰冻。
            CombatStatus.cure(world, actor, "frozen");
            sound(action, "cobblemon:move.watergun.actor");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function splash(current: CombatAction, point: CombatPoint, victim: CombatActor | null): void {
                const scope = current.world();
                scaldPool(scope, point, radius, slickTicks, slickChance, seethe, interval);
                WorldFeedback.emit(scope, scaldScene, 1, point,
                    { moment: "burst", target: victim !== null ? String(victim.ref()) : "", drops: drops,
                        radius: radius, scale: scale, intensity: intensity }, 26);
                sound(current, "minecraft:entity.generic.splash");
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/water/waterjet_head", tint: 0xD6F0FF, glow: true, scale: Math.max(0.35, Math.min(1.1, 0.5 + scale * 0.2))
            };
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: Math.max(0.25, radius * 0.22), gravity: 0.035, lifetime: 200,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        const body = scope.observe(victim);
                        const landed = body !== null ? body.position() : point;
                        if (CombatStatus.cure(scope, victim, "frozen"))
                            WorldFeedback.text(scope, landed.plus(WorldCombat.point(0, 1.2, 0)), scaldThawText, [], 24);
                        const wet = body !== null && body.wet();
                        const dealt = wet ? power * 1.18 : power;
                        const already = CombatStatus.has(scope, victim, "burn");
                        if (impact(current, hit, "scald", dealt, { damage: damageSpec("scald", "boil"), status: "burn", chance: burnChance })) {
                            const at = body !== null ? body.position() : point;
                            if (!already && CombatStatus.has(scope, victim, "burn"))
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), scaldBurnText, [], 26);
                        }
                        splash(current, landed, victim);
                    } else {
                        splash(current, point, null);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world();
                    WorldFeedback.emit(scope, scaldScene, 1, action.origin(), { moment: "fizzle", scale: scale }, 18);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "scald:flight:" + action.id(), scaldScene, 1, action.origin(),
                { moment: "flight", drops: drops, scale: scale, intensity: intensity }, 60);
        }
    });
}
