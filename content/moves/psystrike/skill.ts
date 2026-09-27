/**
 * 精神击破 / psystrike —— 注册与动作。
 *
 * 核心念头：把念波**在目标头顶堆成一整块重物砸下来**——一次精神的下压。头顶的重量落下，落地压出冲击面，
 *   并震裂目标的精神防线（特防 −1）。它是念波家族里最慢、最贵、唯一带碎裂的一发，身份是「头顶的重压」。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：施法者周身念力上涌、目标头顶压出下压的印记，只播预告。
 *   落 + 砸（execute）：提交时把落点固定下来——以重物实际包围体验证标记点上方 `height` 格处的净空，
 *       不足时向上找最近的可容身点，再从那里只沿竖直方向砸下、不横向追踪；顶盖挡住时重物从顶盖之上砸在顶面，
 *       完全没有净空就只结算真实障碍接触。命中结算 `crush`，压场式再以**实际撞点**为中心向 `splash` 半径内的
 *       其他非友方铺一层 `shock` 并顶开（被墙挡住的个体不吃）；没有实体时重物照样落在标记点。
 *   裂（sunder）：只有真的被重物砸伤的目标才特防下降 `sunderStages` 级；隔顶的目标不会被隔着屋顶结算。
 *
 * 选取：`kind: "aim"`——自由点或实体位置都能标记；空地照样落重块，不跟踪目标平移。
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
        kind: "aim",
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
            const wide = config && config.wide === true;
            return { radius: wide ? p(psystrikeId, "splash", pokemon) : p(psystrikeId, "mass", pokemon), geometry: "area",
                style: "psychic", color: 0x6A3FD0, label: wide ? "精神击破·压场" : "精神击破·点压" };
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
            const mass = Math.max(0.35, p(psystrikeId, "mass", action));
            const splash = Math.max(1.5, p(psystrikeId, "splash", action));
            const cracks = Math.max(10, Math.round(p(psystrikeId, "cracks", action)));
            action.present("world_combat:psystrike:conjure", psystrikeScene, 1, action.origin(),
                JSON.stringify({ moment: "conjure", wide: wide }));
            // 准备期印记每刻重铺、跟着当前瞄点走；提交时 execute 锁住落点并停掉这枚印记，另起独立的下落预告。
            function frame(current: CombatAction): void {
                if (current.data("world_combat:psystrike_locked") !== null) return;
                const aim = current.targetPosition();
                current.present("world_combat:psystrike:aim", psystrikeScene, 1, aim,
                    JSON.stringify({ moment: wide ? "mark_wide" : "mark", wide: wide, point: [aim.x(), aim.y(), aim.z()],
                        mass: mass, splash: wide ? splash : 0, cracks: cracks }));
                current.after(1, frame);
            }
            frame(action);
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(psystrikeScene);
            const scope = action.world();
            const wide = config && config.wide === true;
            const power = p(psystrikeId, "crush", action);
            const shockPower = p(psystrikeId, "shock", action);
            const height = Math.max(2, p(psystrikeId, "height", action));
            const descend = Math.max(0.4, p(psystrikeId, "descend", action));
            const mass = Math.max(0.2, p(psystrikeId, "mass", action));
            const splash = Math.max(1.5, p(psystrikeId, "splash", action));
            const cracks = Math.max(10, Math.round(p(psystrikeId, "cracks", action)));
            const stages = Math.max(1, Math.round(p(psystrikeId, "sunderStages", action)));
            const scale = Math.max(0.5, Math.min(2.4, mass / 0.5));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            let impacted = false, settled = false, flightId = "";

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            // 落点在提交时固定：重物从这里正上方竖直落下，之后不再横向追踪。
            const at = action.targetPosition();
            const mark: number[] = [at.x(), at.y(), at.z()];
            action.data("world_combat:psystrike_locked", "{}");

            sound(action, "cobblemon:move.psychic.actor");
            // 停掉准备期跟随印记（防旧位残影），提交后的地面印记改由下面的独立场景 key 承担，随命中立即停。
            action.present("world_combat:psystrike:aim", psystrikeScene, 1, at,
                JSON.stringify({ moment: wide ? "mark_wide" : "mark", wide: wide, point: mark,
                    mass: mass, splash: wide ? splash : 0, cracks: cracks,
                    lifecycle: { reason: "settled", tick: scope.tick() } }));
            scenes.show(action, wide ? "mark_wide" : "mark", at,
                { moment: wide ? "mark_wide" : "mark", wide: wide, point: mark,
                    mass: mass, splash: wide ? splash : 0, cracks: cracks });

            // 从合法净空生成：以重物的实际包围体（以 from 为中心、直径 2*mass）验证真实空间，而不是只看中心线；
            // freeSpace 按脚点判定，故把中心换算成脚点。被顶盖或侧墙挡住时向上找最近的可容身点；
            // 完全没有净空就只结算真实障碍接触，不在实心里造弹。
            const requested = at.plus(WorldCombat.point(0, height, 0));
            const diameter = mass * 2;
            const ceiling = WorldGeometry.blockHit(scope, at.plus(WorldCombat.point(0, 0.1, 0)), requested);
            let from: CombatPoint | null = null;
            for (let up = 0; up <= 6 && from === null; up++) {
                const candidate = requested.plus(WorldCombat.point(0, up, 0));
                if (scope.freeSpace(candidate.minus(WorldCombat.point(0, mass, 0)), diameter, diameter)) from = candidate;
            }
            if (from === null) {
                // 无合法净空：只做实际障碍接触结果。优先顶盖，其次标点上方的实际阻挡，最后标点本身。
                const over = WorldGeometry.blockHit(scope, at, requested.plus(WorldCombat.point(0, mass, 0)));
                const contact = ceiling !== null ? ceiling.position() : over !== null ? over.position() : at;
                WorldFeedback.emit(scope, psystrikeScene, 1, contact,
                    { moment: "crush", point: [contact.x(), contact.y(), contact.z()], cracks: cracks, scale: scale, intensity: intensity }, 30);
                sound(action, "minecraft:block.deepslate.break");
                WorldFeedback.text(scope, contact.plus(WorldCombat.point(0, 0.6, 0)), psystrikeMissText, [], 22);
                finish(action);
                return;
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/largefadeorb", tint: 0x6A3FD0, glow: true,
                scale: Math.max(0.9, Math.min(1.8, mass / 0.45))
            };
            const flight = action.projectile(from, WorldCombat.point(0, -descend, 0), 0, mass, height + 8, 120,
                function (current: CombatAction, hit: CombatImpact) {
                    if (impacted) return;
                    impacted = true;
                    scenes.stop(current);
                    const world = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    const struck = victim !== null && hit.hitEntity() && world.valid(victim) && !world.friendly(victim) ? victim : null;
                    const ref = struck === null ? "" : String(struck.ref());
                    const landed = struck !== null ? impact(current, hit, psystrikeId, power, { segment: "crush" }) : false;
                    // 砸在实体或方块上都在真实撞点碎开：crush 的碎块与贴地环只铺在这里。
                    WorldFeedback.emit(world, psystrikeScene, 1, point,
                        { moment: "crush", target: ref, point: [point.x(), point.y(), point.z()],
                            cracks: cracks, scale: scale, intensity: intensity }, 30);
                    sound(current, landed ? "cobblemon:impact.psychic" : "minecraft:block.deepslate.break");
                    // 裂：伤害真的落下才尝试削特防；只有 boost 实际返回负值（真的降了级）才播削防回执，伤害成功与削防失败分开。
                    if (landed && world.valid(struck!)) {
                        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.4, 0)), psystrikeHitText, [], 24);
                        const dropped = NativeEffects.boost(world, struck!, "spd", -stages);
                        const held = dropped < 0 ? world.observe(struck!) : null;
                        if (held !== null) {
                            WorldFeedback.emit(world, psystrikeScene, 1, held.position(),
                                { moment: "sunder", target: ref, stages: Math.abs(dropped), cracks: Math.round(cracks * 0.5) }, 24);
                            WorldFeedback.text(world, held.position().plus(WorldCombat.point(0, 1.5, 0)), psystrikeSunderText, [Math.abs(dropped)], 28);
                        }
                    }
                    // 压场：冲击面只以实际撞点为中心，且只在没有顶盖时铺开；真实视线被挡的个体不吃这一记。
                    if (wide && ceiling === null) {
                        WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, splash, { below: 3, above: 4 }), function (other, facts) {
                            if (String(other.ref()) === ref) return;
                            if (!world.clear(point, facts.position())) return;
                            const pushed = hurt(current, other, psystrikeId, shockPower, { segment: "shock" });
                            if (pushed) {
                                const away = facts.position().minus(point);
                                const flat = WorldCombat.point(away.x(), 0, away.z());
                                if (world.valid(other) && flat.length() > 0.05) world.hitDisplace(other, flat.unit().scale(0.6));
                                WorldFeedback.emit(world, psystrikeScene, 1, facts.position(),
                                    { moment: "shock", target: String(other.ref()), cracks: Math.round(cracks * 0.6), scale: scale, intensity: intensity }, 24);
                            }
                        });
                    }
                    finish(current);
                },
                function (current: CombatAction) {
                    // 未撞上任何东西：用弹体最后一个真实位置（完成回调内仍可读），不用瞄准点假造落点。
                    if (!impacted) {
                        const end = current.world().projectilePosition(flightId);
                        const spot = end === null ? at : end;
                        WorldFeedback.emit(current.world(), psystrikeScene, 1, spot, { moment: "miss", scale: scale }, 22);
                        WorldFeedback.text(current.world(), spot.plus(WorldCombat.point(0, 1.0, 0)), psystrikeMissText, [], 22);
                    }
                    finish(current);
                }, JSON.stringify(appearance));
            flightId = flight;

            scenes.show(action, "descend", from,
                { moment: "descend", projectile: flight, cracks: cracks, scale: scale, intensity: intensity, from: height });
        }
    });

    // 原生 `overrideDefensiveStat: def`：与精神冲击同一套还原方式（伤害段 spec 的 defenceStat），只对本招生效。
}
