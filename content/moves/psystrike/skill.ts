/**
 * 精神击破 / psystrike —— 注册与动作。
 *
 * 核心念头：把念波**在目标头顶堆成一整块重物砸下来**——一次精神的下压。头顶的重量落下，落地压出冲击面，
 *   并震裂目标的精神防线（特防 −1）。它是念波家族里最慢、最贵、唯一带碎裂的一发，身份是「头顶的重压」。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：施法者周身念力上涌、目标头顶压出下压的印记，只播预告。
 *   落 + 砸（execute）：重物从目标上方 `height` 格处凝成、追着目标砸落；落点结算 `crush`，压场式再向
 *       `splash` 半径内的其他非友方铺一层 `shock` 并顶开；重物碎成屑。
 *   裂（sunder）：目标特防下降 `sunderStages` 级。
 *
 * 与同描述的精神冲击分开：同一份「念波实体化」，但精神冲击是手里小棱的直线投掷（快、便宜、无碎裂），
 * 精神击破是头顶重物的下砸（慢、贵、带冲击面与削特防）。配置 `wide` 由 resolve 改时序、由公式改威力。
 */
namespace PokemonSkills {
    define({
        id: psystrikeId,
        cooldownParameter: "recharge",
        name: "Psystrike",
        description: "把念波在目标头顶堆成一整块重物砸下来：落下时按物理防御结算特殊伤害，压场式还会把冲击面铺向周围；落地震裂目标的精神防线，使其特防下降 1 级。",
        uses: ["对单个重目标打一记按物理防御结算的重压", "砸裂特防，为随后的特殊攻击开路", "在人群里压一块场，顺带扫到旁边的人"],
        kind: "enemy",
        range: 14,
        maxRange: 22,
        prepare: 16,
        active: 0,
        recover: 11,
        cooldown: 42,
        style: "psychic",
        defaults: { wide: false, ai: { maxChase: 18, focusThreat: true } },
        fields: [flag("wide", "压场")],
        indicator: function (config, pokemon) {
            return { radius: p(psystrikeId, "mass", pokemon) * 4, geometry: "area", style: "psychic", color: 0x6A3FD0,
                label: config && config.wide === true ? "精神击破·压场" : "精神击破·点压" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psystrikeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psystrikeId, "tempo", context)),
                recover: Math.round(p(psystrikeId, "aftercast", context)),
                cooldown: Math.round(p(psystrikeId, "recharge", context)),
                active: 0,
                range: p(psystrikeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const wide = config && config.wide === true;
            action.present("world_combat:psystrike:conjure", psystrikeScene, 1, action.origin(),
                JSON.stringify({ moment: "conjure", wide: wide }));
            action.present("world_combat:psystrike:mark", psystrikeScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark", wide: wide,
                    target: action.target() === null ? "" : String(action.target()!.ref()),
                    cracks: Math.round(p(psystrikeId, "cracks", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const wide = config && config.wide === true;
            const power = p(psystrikeId, "crush", action);
            const shockPower = p(psystrikeId, "shock", action);
            const height = Math.max(2, p(psystrikeId, "height", action));
            const descend = Math.max(0.4, p(psystrikeId, "descend", action));
            const radius = Math.max(0.2, p(psystrikeId, "mass", action));
            const splash = Math.max(1.5, p(psystrikeId, "splash", action));
            const cracks = Math.max(10, Math.round(p(psystrikeId, "cracks", action)));
            const stages = Math.max(1, Math.round(p(psystrikeId, "sunderStages", action)));
            const scale = Math.max(0.5, Math.min(2.4, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            let impacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            if (target === null || !world.valid(target)) { finish(action); return; }
            const body = world.observe(target);
            if (body === null) { finish(action); return; }
            const at = body.position();
            const from = at.plus(WorldCombat.point(0, height, 0));
            const ref = String(target.ref());

            sound(action, "cobblemon:move.psychic.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/largefadeorb", tint: 0x6A3FD0, glow: true,
                scale: Math.max(0.9, Math.min(1.8, radius / 0.45)),
                homing: { target: ref, turn: 16, delay: 1, range: height + 8 }
            };
            const flight = action.projectile(from, WorldCombat.point(0, -descend, 0), 0, radius, height + 8, 120,
                function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const victim = hit.target();
                    const point = hit.position();
                    if (impacted || victim === null || String(victim.ref()) !== ref) return;
                    impacted = true;
                    const landed = scope.valid(target) && !scope.friendly(target)
                        ? impact(current, hit, psystrikeId, power, { segment: "crush" }) : false;
                    WorldFeedback.emit(scope, psystrikeScene, 1, point,
                        { moment: landed ? "crush" : "miss", target: ref, cracks: cracks, scale: scale, intensity: intensity }, 30);
                    if (!landed) return;
                    sound(current, "cobblemon:impact.psychic");
                    // 裂：重压震裂精神防线，特防下降。
                    if (scope.valid(target)) {
                        NativeEffects.boost(scope, target, "spd", -stages);
                        const held = scope.observe(target);
                        if (held !== null) {
                            WorldFeedback.emit(scope, psystrikeScene, 1, held.position(),
                                { moment: "sunder", target: ref, stages: stages, cracks: Math.round(cracks * 0.5) }, 24);
                            WorldFeedback.text(scope, held.position().plus(WorldCombat.point(0, 1.5, 0)), psystrikeSunderText, [stages], 28);
                        }
                    }
                    // 压场：冲击面扫向落点周围的其他非友方。
                    if (wide) {
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, splash, { below: 3, above: 4 }), function (other, facts) {
                            if (String(other.ref()) === ref) return;
                            const pushed = hurt(current, other, psystrikeId, shockPower, { segment: "shock" });
                            if (pushed) {
                                const away = facts.position().minus(point);
                                const flat = WorldCombat.point(away.x(), 0, away.z());
                                if (scope.valid(other) && flat.length() > 0.05) scope.displace(other, flat.unit().scale(0.6));
                                WorldFeedback.emit(scope, psystrikeScene, 1, facts.position(),
                                    { moment: "shock", target: String(other.ref()), cracks: Math.round(cracks * 0.6), scale: scale, intensity: intensity }, 24);
                            }
                        });
                    }
                    const hitBody = scope.observe(target);
                    if (hitBody !== null)
                        WorldFeedback.text(scope, hitBody.position().plus(WorldCombat.point(0, 1.4, 0)), psystrikeHitText, [], 24);
                },
                function (current: CombatAction) {
                    const scope = current.world();
                    if (!impacted) {
                        WorldFeedback.emit(scope, psystrikeScene, 1, current.targetPosition(), { moment: "miss", scale: scale }, 22);
                        WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.0, 0)), psystrikeMissText, [], 22);
                    }
                    finish(current);
                }, JSON.stringify(appearance));

            WorldFeedback.keep(world, "psystrike:descend:" + action.id(), psystrikeScene, 1, at,
                { moment: "descend", projectile: flight, cracks: cracks, scale: scale, intensity: intensity, from: height }, 80);
        }
    });

    // 原生 `overrideDefensiveStat: def`：与精神冲击同一套还原方式（伤害段 spec 的 defenceStat），只对本招生效。
}
