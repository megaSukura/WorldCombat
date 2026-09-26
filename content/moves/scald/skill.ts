/**
 * 热水 / scald 的出手方式。
 *
 * 核心念头：把一壶水在掌中烧滚，兜手抛出去——水弹拖着白汽沿浅弧飞出，命中炸开成一片滚烫的水花，
 *   落点留一摊还在翻滚的水洼；踏进水洼的人被烫、可能灼伤，沸水也把目标与自己的冰冻化开。
 *   它是这一族里唯一拿水当材料的一招：烫来自水里，湿身的目标被沸水浇得更狠。
 *
 * 自由瞄准（kind: "aim"）：可指向任意阵营实体或一个世界点，敌首真弹碰伤、空放照飞。水弹命中活物、
 *   碰到方块或到程都只在**真实接触点**处理；水洼必须落在可支撑的地面上，墙上的沸水向下淌到短距内
 *   没地面就只散蒸汽，不在空中铺洼。水洼只烫真正站上那层地的脚，进出边缘不重掷灼伤。
 *
 * 三幕：
 *   起（steep，提交前）：掌中翻起白汽、水在指缝间滚开的预告，只播画面。
 *   抛（flight，提交后）：水弹带一条白汽尾沿浅弧飞出；飞行表现绑真实弹体 id。
 *   沸（burst / pool）：命中活物时结算 boil 伤害（湿身 ×1.18）并按概率灼伤，随即解冻；水弹落地摊开一摊
 *       水洼（`WorldEffects.field`，本单元规则），踏入者每 target 每洼只掷一次灼伤，站着不走按间隔挨 seethe，
 *       到 slickTicks 蒸干。同施法者的重叠水洼合并刷新成一份，不叠 tick。
 *
 * 与同族分开：热风是一道推人的热浪、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热水把「湿」与「烫」
 *   同时留在真实地面上，并解开冰冻。配置 simmer 由 resolve 改时序、由公式改威力／水洼，提交后才触碰世界。
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

    /** 从上往下找第一块撑得住的地面；水面、岩浆、基岩、屏障上不留洼，找不到返回 null。 */
    function scaldSupport(world: CombatWorld, point: CombatPoint, drop: number): CombatPoint | null {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), top = Math.floor(point.y());
        for (let dy = 1; dy >= -Math.max(0, Math.floor(drop)); dy--) {
            const block = world.block(WorldCombat.point(x, top + dy, z));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            return WorldCombat.point(x + 0.5, top + dy + 1, z + 0.5);
        }
        return null;
    }

    /** 水洼只烫站上那层地的脚：脚底高度贴近洼面才算接触，空中的身体算不到。 */
    function scaldFeet(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const feet = body.position().y() - body.height() / 2;
        return Math.abs(feet - field.position[1]) <= 0.6;
    }

    /** 一摊还在翻滚的水洼：踏上那层地的脚每 target 每洼只判一次灼伤，站着不走按间隔反复挨烫。 */
    WorldEffects.fieldRule(scaldField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            if (!scaldFeet(world, actor, field)) return;
            const body = world.observe(actor);
            if (body === null) return;
            const ref = String(actor.ref());
            WorldFeedback.emit(world, scaldScene, 1, body.position(),
                { moment: "wet", target: ref, scale: field.radius / 1.8 }, 22);
            const burned = field.data.burned || (field.data.burned = {});
            if (burned[ref]) return;
            burned[ref] = true;
            if (world.random() < (Number(field.data.burn) || 0) && CombatStatus.inflict(world, actor, "burn"))
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), scaldBurnText, [], 24);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            if (!scaldFeet(world, actor, field)) return;
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

    /**
     * 把水洼摊在真实支撑面上；同施法者附近已有本招水洼时只在原地合并刷新（保留已有的每 target 记账），
     * 不新开一份叠 tick。找到地面才铺洼，否则只散蒸汽。视觉随正式 field 生命周期结束。
     */
    function scaldPool(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, burn: number, seethe: number,
        interval: number): boolean {
        const ground = scaldSupport(world, point, 5);
        if (ground === null) return false;
        const owner = String(world.source().ref());
        const mine = WorldEffects.areas(world, scaldField, ground, radius);
        let id = 0, existing = radius;
        for (let i = 0; i < mine.length; i++) {
            if (mine[i].source !== owner) continue;
            id = mine[i].id;
            existing = Math.max(radius, mine[i].radius);
            break;
        }
        const bounded = Math.max(20, Math.round(ticks));
        if (id > 0) WorldEffects.update(world, id, { radius: existing, ticks: bounded,
            data: { burn: burn, seethe: seethe, interval: interval, radius: existing } });
        else id = WorldEffects.field(world, scaldField, ground, Math.max(0.6, existing),
            { burn: burn, seethe: seethe, interval: interval, radius: existing, next: {}, burned: {} }, bounded);
        WorldFeedback.onEffect(world, id, "scald:pool", scaldScene, 1, ground,
            { moment: "pool", radius: existing, scale: existing / 1.8, seethe: Math.round(seethe),
                bubbles: Math.round(10 + existing * 10 + seethe * 0.6) });
        return true;
    }

    define({
        id: "scald",
        cooldownParameter: "recharge",
        name: "Scald",
        description: "把一壶水在掌中烧滚、兜手抛出：沸水沿浅弧自由飞向准线，命中造成特殊伤害并可能灼伤；落点在真实支撑地面上留下一摊还在翻滚的水洼，踏上的脚被烫、站着不走会反复挨烫。沸水会把目标与自己身上的冰冻化开，浇在泡水或淋雨的目标身上更狠。空中或墙上到不了地面的沸水只散蒸汽。",
        uses: ["抛一壶沸水直接点着目标", "只在真实地面上留下一摊烫人的水洼封住一块地", "化开目标与自己身上的冰冻", "浇湿身的目标赚一份额外伤害"],
        kind: "aim",
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
            const scenes = WorldFeedback.actionScenes(scaldScene);
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
            let settled = false;

            // 原生 defrost：烧开这壶水的一刻先解掉自己身上的冰冻。
            CombatStatus.cure(world, actor, "frozen");
            sound(action, "cobblemon:move.watergun.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            /** 溅在真实接触点：先查该点脚下有没有支撑面，有才铺洼；没有只散蒸汽。 */
            function splash(current: CombatAction, point: CombatPoint, victim: CombatActor | null): boolean {
                const scope = current.world();
                const pooled = scaldPool(scope, point, radius, slickTicks, slickChance, seethe, interval);
                WorldFeedback.emit(scope, scaldScene, 1, point,
                    { moment: "burst", target: victim !== null ? String(victim.ref()) : "", drops: drops,
                        radius: radius, scale: scale, intensity: intensity }, 26);
                if (!pooled)
                    WorldFeedback.emit(scope, scaldScene, 1, point, { moment: "fizzle", scale: scale, intensity: intensity }, 18);
                sound(current, "minecraft:entity.generic.splash");
                return pooled;
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/water/waterjet_head", tint: 0xD6F0FF, glow: true, scale: Math.max(0.35, Math.min(1.1, 0.5 + scale * 0.2))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: Math.max(0.25, radius * 0.22), gravity: 0.035, lifetime: 200,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && scope.friendly(victim)) {
                        // 友方按正常解冻许可处理：化开冰冻、溅起水花，不强行造成伤害。
                        const body = scope.observe(victim);
                        const landed = body !== null ? body.position() : point;
                        if (CombatStatus.cure(scope, victim, "frozen"))
                            WorldFeedback.text(scope, landed.plus(WorldCombat.point(0, 1.2, 0)), scaldThawText, [], 24);
                        splash(current, landed, victim);
                    } else if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
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
                        // 没有活物接触：真实碰点或到程末端。墙上留下淌水，地面才铺洼。
                        if (hit.blocked()) {
                            const wall = hit.blockPosition() !== null ? hit.blockPosition()! : point;
                            WorldFeedback.emit(scope, scaldScene, 1, wall,
                                { moment: "trickle", face: hit.blockFace(), scale: scale }, 20);
                        }
                        splash(current, point, null);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!settled) {
                    WorldFeedback.emit(current.world(), scaldScene, 1, action.origin(),
                        { moment: "fizzle", scale: scale, intensity: intensity }, 18);
                }
                finish(current);
            });
            // 飞行表现绑真实弹体 id，与弹体同行。
            scenes.show(action, "flight", action.origin(),
                { moment: "flight", projectile: flight, drops: drops, scale: scale, intensity: intensity });
        }
    });
}
