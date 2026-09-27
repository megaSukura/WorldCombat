/** A hostile first contact lowers Attack/Sp. Atk by the accepted deltas, then switches or retreats on supported ground. A refused drop still permits retreat. */
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
            const drop = Math.max(1, Math.min(2, Math.round(p(partingshotId, "drop", action))));
            const mark = Math.max(60, Math.round(p(partingshotId, "markTicks", action)));
            const motes = Math.max(8, Math.round(p(partingshotId, "motes", action)));
            const speed = p(partingshotId, "flight", action);
            const withdraw = p(partingshotId, "withdraw", action);
            const scale = Math.max(0.5, Math.min(1.3, 0.55 + motes / 70));
            const scenes = WorldFeedback.actionScenes(partingshotScene, 1);
            let settled = false, handled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            // 命中后的收场只发生一次：有后备就真换人（失败的退回退步），没有就沿实际脚步逐刻退。
            function withdrawAfter(current: CombatAction, victim: CombatActor): void {
                const scope = current.world();
                const stand = scope.observe(self);
                const reserve = partyReserve(partyRoster(scope, self), partyActiveId(scope, self));
                if (reserve !== null) {
                    const feet = stand === null ? null : partyFeet(stand);
                    const at = stand === null ? origin : stand.position();
                    scenes.stop(current);
                    const result = partySwitchOut(scope, self, reserve.slot, feet);
                    if (result.ok) {
                        // 原生收放与队伍面板就是成功回执；旧施法者离场后停止使用其作用域。
                        settled = true;
                        return;
                    }
                    // A reserve existed but the native switch refused: say so, then fall back to the real step-away.
                    WorldFeedback.emit(scope, partingshotScene, 1, at,
                        { moment: "whiff", motes: motes, scale: scale, blocked: 0 }, 18);
                    WorldFeedback.text(scope, at, "world_combat.move.partingshot.text.switch_failed", [], 24);
                }
                let remaining = withdraw, anchor = stand === null ? origin : stand.position();
                function step(next: CombatAction): void {
                    const here = next.world().observe(self);
                    if (here === null || remaining <= 0.05) { finish(next); return; }
                    const foe = next.world().observe(victim);
                    if (foe !== null) anchor = foe.position();
                    const flat = WorldCombat.point(here.position().x() - anchor.x(), 0, here.position().z() - anchor.z());
                    const direction = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                    const leg = Math.min(1.2, remaining), feet = partyFeet(here);
                    const route = SurfacePaths.advance(next.world(), feet, direction, leg, { up: .1, down: .35, spacing: .2, samples: 6 });
                    if (route.travelled < .02) { finish(next); return; }
                    const moved = next.world().displace(self, route.point.minus(feet));
                    const after = next.world().observe(self);
                    if (after !== null) {
                        const now = after.position();
                        scenes.show(next, "step", now, { moment: "step", drop: drop, motes: motes, scale: scale,
                            direction: [direction.x(), 0, direction.z()],
                            path: [[feet.x(), feet.y(), feet.z()], [now.x(), now.y() - after.height() / 2, now.z()]] });
                    }
                    remaining -= moved;
                    if (moved < leg - 0.05 || remaining <= 0.05) { finish(next); return; }
                    next.after(1, step);
                }
                step(current);
            }

            WorldFeedback.emit(world, partingshotScene, 1, origin,
                { moment: "launch", motes: motes, drop: drop, scale: scale }, 22);
            world.sound("minecraft:entity.evoker.cast_spell", origin, 14, "{}");

            let flightId = "";
            flightId = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.28,
                appearance: { sprite: "cobblemon:generic/exclamation", scale: scale, tint: 0x6A3FA0, glow: true },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    handled = true;
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    scope.sound("minecraft:entity.illusioner.cast_spell", point, 14, "{}");
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 只记录实际落下的等级：被特性/免疫拒绝时不假报羞辱；两端各自报自己的 delta。
                        const atkDrop = -NativeEffects.boost(scope, victim, "atk", -drop);
                        const spaDrop = scope.valid(victim) ? -NativeEffects.boost(scope, victim, "spa", -drop) : 0;
                        const applied = atkDrop + spaDrop;
                        const struck = scope.observe(victim);
                        const at = struck !== null ? struck.position() : point;
                        if (applied > 0) {
                            MobEffects.apply(scope, victim, partingshotEffect, mark, 0);
                            WorldFeedback.emit(scope, partingshotScene, 1, at,
                                { moment: "drain", target: String(victim.ref()), motes: motes, drop: drop, atk: atkDrop, spa: spaDrop, scale: scale,
                                    intensity: Math.max(0.7, Math.min(2, 0.7 + applied * 0.5)) }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), partingshotText, [atkDrop, spaDrop], 28);
                        }
                        // A real hostile contact lets the user disengage even when both drops are refused.
                        withdrawAfter(current, victim);
                    } else {
                        // 墙挡、友方或无效首碰：话没送到，不削级也不退。
                        const block = hit.blockPosition();
                        WorldFeedback.emit(scope, partingshotScene, 1, point,
                            { moment: "whiff", motes: motes, scale: scale, blocked: hit.blocked() ? 1 : 0,
                                blockFace: hit.blockFace(),
                                block: block === null ? null : [block.x(), block.y(), block.z()] }, 18);
                        finish(current);
                    }
                }
            }, function (current: CombatAction) {
                if (handled) return;
                handled = true;
                const scope = current.world();
                // 超程落空的真实末点由弹体回执给出，不用旧瞄准点或发射原点假造。
                const end = scope.projectilePosition(flightId);
                if (end !== null) {
                    WorldFeedback.emit(scope, partingshotScene, 1, end,
                        { moment: "whiff", motes: motes, scale: scale, blocked: 0 }, 18);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.2, 0)), partingshotMissText, [], 20);
                }
                finish(current);
            });
        }
    });
}
