/**
 * 热水 / scald 的出手方式。本族唯一拿水当材料的一招。
 *
 * 核心念头：把一壶水在掌中烧滚，兜手抛出去——水弹拖着白汽沿浅弧飞出，命中炸开成一片滚烫的水花；
 *   命中的目标被烫伤，湿身的目标被沸水浇得更狠、可能被灼伤；沸水也把目标与自己的冰冻化开。
 *   不在地上留下任何持续水洼：它的用途是快速浇湿、解冻与直击灼伤，不是又一处封地池。
 *
 * 自由瞄准（kind: "aim"）：可指向任意阵营实体或一个世界点，敌首真弹碰伤、空放照飞。水弹命中活物、
 *   碰到方块或到程都只在真实接触点处理。弹体允许命中友方（hitAllies）：特意朝冻住的友方泼一壶，
 *   只化开它的冰冻、溅起水花，绝不造成伤害；命中敌人与友方都只在真实接触时发生。
 *
 * 三幕：
 *   起（steep，提交前）：掌中翻起白汽、水在指缝间滚开的预告，只播画面。
 *   抛（flight，提交后）：水弹带一条白汽尾沿浅弧飞出；飞行表现绑真实弹体 id。
 *   沸（burst / trickle / fizzle）：命中活物结算 boil 伤害（湿身 ×1.18）并按概率灼伤，随即解冻；
 *       撞墙只在真实接触点沿表面外法线淌一记水滴与蒸汽；到程未接触只散一团白汽。
 *
 * 与同族分开：热风是一道推人的热浪、热沙大地是一把烫沙、炼狱是一根必灼的火柱；只有热水把「湿」与「烫」
 *   同时作用在真实命中上，并解开冰冻。配置 simmer 由 resolve 改时序、由公式改威力与灼伤概率，
 *   提交后才触碰世界。
 */
namespace PokemonSkills {
    const scaldScene = "world_combat:move_scald";
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

    /** 方块表面的外法线方向；未知朝向按向上处理。 */
    function scaldNormal(face: string): CombatPoint {
        switch (face) {
            case "down": return WorldCombat.point(0, -1, 0);
            case "north": return WorldCombat.point(0, 0, -1);
            case "south": return WorldCombat.point(0, 0, 1);
            case "west": return WorldCombat.point(-1, 0, 0);
            case "east": return WorldCombat.point(1, 0, 0);
            default: return WorldCombat.point(0, 1, 0);
        }
    }

    define({
        id: "scald",
        cooldownParameter: "recharge",
        name: "Scald",
        description: "把一壶水在掌中烧滚、兜手抛出：沸水沿浅弧自由飞向准线，命中造成特殊伤害并可能灼伤；沸水会把目标与自己身上的冰冻化开，浇在泡水或淋雨的目标身上更狠。可以特意朝冻住的友方泼一壶，只化冻、不伤人；撞墙只在接触点淌一记水滴与蒸汽，不留持续水洼。",
        uses: ["抛一壶沸水直接点着目标", "化开目标与自己身上的冰冻（也可只朝冻住的友方泼一壶解冻）", "浇湿身的目标赚一份额外伤害"],
        kind: "aim",
        range: 12,
        maxRange: 16,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "scald",
        defaults: { simmer: false, ai: { maxChase: 14, soakWet: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("scald", "reach", pokemon), geometry: "line", style: "scald",
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
            const burnChance = p("scald", "burnChance", action);
            const drops = Math.max(6, Math.round(p("scald", "drops", action)));
            const globRadius = Math.max(0.25, Math.min(0.6, 0.32 + (power - 80) * 0.002));
            const scale = Math.max(0.5, Math.min(1.1, 0.6 + (power - 80) * 0.004));
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

            /** 溅在真实接触点：只溅水花与蒸汽，不留任何持续水洼。 */
            function splash(current: CombatAction, point: CombatPoint, victim: CombatActor | null): void {
                const scope = current.world();
                WorldFeedback.emit(scope, scaldScene, 1, point,
                    { moment: "burst", target: victim !== null ? String(victim.ref()) : "", drops: drops,
                        scale: scale, intensity: intensity }, 26);
                sound(current, "minecraft:entity.generic.splash");
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/water/waterjet_head", tint: 0xD6F0FF, glow: true,
                scale: Math.max(0.35, Math.min(1.1, 0.5 + scale * 0.2)),
                // 允许原生碰撞投递到友方；命中回调自己判断该解冻还是照常伤害。
                hitAllies: true
            };
            let flight = "";
            flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: globRadius, gravity: 0.035, lifetime: 200,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && scope.friendly(victim)) {
                        // 友方：只在真实接触时化开冰冻、溅起水花，绝不造成伤害。
                        const body = scope.observe(victim);
                        const landed = body !== null ? body.position() : point;
                        if (CombatStatus.cure(scope, victim, "frozen"))
                            WorldFeedback.text(scope, landed.plus(WorldCombat.point(0, 1.2, 0)), scaldThawText, [], 24);
                        splash(current, landed, victim);
                    } else if (victim !== null && scope.valid(victim)) {
                        // 敌方：先解冻，再按湿身加成结算直击伤害与灼伤概率。
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
                        // 没有活物接触：真实碰点或到程末端。撞墙在真实接触点沿外法线淌一记水滴与蒸汽。
                        if (hit.blocked()) {
                            const wall = point.plus(scaldNormal(hit.blockFace()).scale(0.05));
                            WorldFeedback.emit(scope, scaldScene, 1, wall,
                                { moment: "trickle", face: hit.blockFace(), scale: scale, intensity: intensity }, 20);
                        }
                        splash(current, point, null);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!settled) {
                    // 到程未接触：真弹末点由宿主保留到完成回调内；读不到就不补假终点。
                    const scope = current.world(), end = scope.projectilePosition(flight);
                    if (end !== null)
                        WorldFeedback.emit(scope, scaldScene, 1, end,
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
