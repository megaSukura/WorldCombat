/**
 * 抛下狠话 / partingshot 的出手方式。
 *
 * 核心念头：转身离开时甩下一句带刺的话——话像一支暗色的镖飞出去，扎进对手心里，把他的攻击与特攻各削几级，
 *   自己趁机背离他真正退开；有后备队友在待命时，直接在同一点完成换手。狠话是这招的身份：**削的是对手的输出，不是它的血**。
 *
 * 两幕：
 *   起（barb，提交前）：嘴边聚起一缕暗话的碎点，只播预告。
 *   抛（launch → drain／block／whiff，提交后）：一句狠话沿弹道朝瞄准方向飞出去，首碰为准；扎中真实非友方活体才
 *     把物攻与特攻各削 `drop` 级、挂上共享身份 `world_combat:status/parting_shot`，然后：
 *       - 有合法后备：`partySwitchOut` 在同一点换手，交接光只在真的切队成功时亮；
 *       - 无后备：沿背离对手的实际脚步逐刻后退 `withdraw`，撞墙即停。
 *     被墙挡下、擦过友方或一路落空都不削级、不退步（话没送到，自己还得站着）。
 *
 * 与同族分开：接棒递好处、瞬间移动只挪自己、临别礼物以命相换；只有抛下狠话**远远地削掉对手的输出再走**，
 *   是一支会飞的减法。提交前只观察、只 present；削级、退步、换人与粒子都在提交后写。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: partingshotId,
        cooldownParameter: "recharge",
        name: "Parting Shot",
        description: "朝瞄准方向甩下一句带刺的狠话，首碰为准：话扎中对手后把它的攻击与特攻各削几级、挂上羞辱身份，然后有后备就换手、没后备就逐刻退开。话没送到既不削也不退。",
        uses: ["把对手的输出削下去再脱身", "在自己要撤时顺手废掉追兵的手", "有队友接应时削完就换人上场"],
        kind: "aim",
        range: 8,
        maxRange: 14,
        prepare: 6,
        active: 2,
        recover: 6,
        cooldown: 70,
        style: "barb",
        defaults: { venom: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [flag("venom", "毒舌")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[partingshotId], detail: { values: config } };
            return {
                radius: p(partingshotId, "reach", context), geometry: "line", style: "barb", color: 0x6A3FA0,
                label: config && config.venom ? "抛下狠话·毒舌" : "抛下狠话"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[partingshotId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(partingshotId, "tempo", context)),
                recover: Math.round(p(partingshotId, "aftercast", context)),
                cooldown: Math.round(p(partingshotId, "recharge", context)),
                active: 2,
                range: p(partingshotId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_partingshot:barb", partingshotScene, 1, action.origin(),
                JSON.stringify({ moment: "barb", venom: config && config.venom ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const bodyHeight = body.height();
            const drop = Math.max(1, Math.min(2, Math.round(p(partingshotId, "drop", action))));
            const mark = Math.max(60, Math.round(p(partingshotId, "markTicks", action)));
            const motes = Math.max(8, Math.round(p(partingshotId, "motes", action)));
            const speed = p(partingshotId, "flight", action);
            const withdraw = p(partingshotId, "withdraw", action);
            const scale = Math.max(0.5, Math.min(1.3, 0.55 + motes / 70));
            const scenes = WorldFeedback.actionScenes(partingshotScene, 1);
            let settled = false, handled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            // 命中后的收场只发生一次：有后备就真换人，没有就沿实际脚步逐刻退，撞墙即停。
            function withdrawAfter(current: CombatAction, away: CombatPoint): void {
                const scope = current.world();
                const reserve = partyReserve(partyRoster(scope, self), partyActiveId(scope, self));
                if (reserve !== null) {
                    const stand = scope.observe(self);
                    const feet = stand === null ? null : partyFeet(stand);
                    const result = partySwitchOut(scope, self, reserve.slot, feet);
                    if (result.ok) {
                        const at = stand === null ? origin : stand.position();
                        WorldFeedback.emit(scope, partingshotScene, 1, at,
                            { moment: "switch", drop: drop, motes: motes, scale: scale }, 24);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), partingshotSwitchText, [], 26);
                    }
                    finish(current);
                    return;
                }
                const flat = WorldCombat.point(away.x(), 0, away.z());
                const direction = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                let remaining = withdraw;
                const path: number[][] = [[origin.x(), origin.y() - bodyHeight / 2, origin.z()]];
                function step(next: CombatAction): void {
                    const here = next.world().observe(self);
                    if (here === null || remaining <= 0.05) { finish(next); return; }
                    const leg = Math.min(1.2, remaining);
                    const moved = next.world().displace(self, direction.scale(leg));
                    const after = next.world().observe(self);
                    if (after !== null) path.push([after.position().x(), after.position().y() - after.height() / 2, after.position().z()]);
                    remaining -= moved;
                    scenes.show(next, "step", origin, { moment: "step", drop: drop, motes: motes, scale: scale,
                        direction: [direction.x(), 0, direction.z()], path: path.slice() });
                    if (moved < leg - 0.05 || remaining <= 0.05) { finish(next); return; }
                    next.after(1, step);
                }
                step(current);
            }

            WorldFeedback.emit(world, partingshotScene, 1, origin,
                { moment: "launch", motes: motes, drop: drop, scale: scale }, 22);
            world.sound("minecraft:entity.evoker.cast_spell", origin, 14, "{}");

            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.28,
                appearance: { sprite: "cobblemon:generic/exclamation", scale: scale, tint: 0x6A3FA0, glow: true },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    handled = true;
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 只记录实际落下的等级：被特性/免疫拒绝时不假报羞辱。
                        const atkDrop = -NativeEffects.boost(scope, victim, "atk", -drop);
                        const spaDrop = scope.valid(victim) ? -NativeEffects.boost(scope, victim, "spa", -drop) : 0;
                        const applied = Math.max(atkDrop, spaDrop);
                        const struck = scope.observe(victim);
                        const at = struck !== null ? struck.position() : point;
                        if (applied > 0) {
                            MobEffects.apply(scope, victim, partingshotEffect, mark, 0);
                            WorldFeedback.emit(scope, partingshotScene, 1, at,
                                { moment: "drain", target: String(victim.ref()), motes: motes, drop: applied, scale: scale,
                                    intensity: Math.max(0.7, Math.min(2, 0.7 + applied * 0.5)) }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), partingshotText, [applied], 28);
                        }
                        withdrawAfter(current, origin.minus(at));
                    } else {
                        // 墙挡、友方或无效首碰：话没送到，不削级也不退。
                        const block = hit.blockPosition();
                        WorldFeedback.emit(scope, partingshotScene, 1, point,
                            { moment: "whiff", motes: motes, scale: scale, blocked: hit.blocked() ? 1 : 0,
                                blockFace: hit.blockFace(),
                                block: block === null ? null : [block.x(), block.y(), block.z()] }, 18);
                        finish(current);
                    }
                    scope.sound("minecraft:entity.illusioner.cast_spell", point, 14, "{}");
                }
            }, function (current: CombatAction) {
                if (handled) return;
                handled = true;
                WorldFeedback.emit(current.world(), partingshotScene, 1, current.origin(),
                    { moment: "whiff", motes: motes, scale: scale, blocked: 0 }, 18);
                WorldFeedback.text(current.world(), current.origin().plus(WorldCombat.point(0, 1.2, 0)), partingshotMissText, [], 20);
                finish(current);
            });
        }
    });
}
