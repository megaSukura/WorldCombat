/** clearsmog：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 一份可读的能力等级快照（宝可梦读原生等级，其他活体读公共阶梯）。 */
    export function clearsmogStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        return NativeEffects.effectiveStages(world, actor);
    }

    /**
     * 只冲掉 actor 身上正向的能力变化（含正向临时窗口），并清掉可移除的有益效果；返回真正清掉的量。
     * 不清负向等级，也不碰不可移除的 Boss 阶段身份：清除被拒绝时这里不会再回写生命/属性。
     */
    export function clearsmogErase(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        return NativeEffects.consumePositiveStages(world, actor, "clearsmog")
            + MobEffects.clear(world, actor, "beneficial");
    }

    function clearsmogVeilData(json: string): string {
        const value = JSON.parse(json);
        ["interval", "fumes", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid clear smog veil state");
        });
        if (value.interval < 1 || !MobEffects.validAnchor(value.mark)) throw new Error("Invalid clear smog veil state");
        return JSON.stringify(value);
    }

    /** 薄烟绑在这次清除效果实例上：效果在烟就在，效果被驱散/替换/到期时一起收走。 */
    function clearsmogVeilPresent(effect: CombatEffect): void {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.onEffect(world, effect.id(), "clearsmog:veil:" + String(victim.ref()), clearsmogScene, 1, body.position(),
            { moment: "veil", target: String(victim.ref()), fumes: data.fumes, scale: data.scale, intensity: data.intensity });
    }

    WorldCombat.effect(clearsmogVeil, 1, 200, "actor", clearsmogVeilData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(clearsmogVeil, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.matches(world, victim, data.mark)) { effect.end(); return; }
        // 标记由这次清除效果持有：效果结束时同步撤标；标记被外力清除/替换时，周期检查让效果收场。
        data.markLease = MobEffects.bind(world, victim, clearsmogMark);
        effect.state(JSON.stringify(data));
        clearsmogVeilPresent(effect);
        effect.schedule("scour", "scour", data.interval, "{}");
    });
    WorldCombat.effectHandler(clearsmogVeil, "scour", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        // 烟被净化/替换（牛奶、驱散、另一发覆盖）后不再继续清除。
        if (!MobEffects.matches(world, victim, data.mark)) { effect.end(); return; }
        const removed = clearsmogErase(world, victim);
        const body = world.observe(victim);
        if (body !== null && removed > 0) {
            WorldFeedback.emit(world, clearsmogScene, 1, body.position(),
                { moment: "scour", target: String(victim.ref()), erased: removed, fumes: Math.max(6, Math.min(data.fumes, 6 + removed * 3)),
                    scale: data.scale, intensity: data.intensity }, 18);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), clearsmogClearedText, [removed], 20);
        }
        clearsmogVeilPresent(effect);
        effect.schedule("scour", "scour", data.interval, "{}");
    });
    WorldCombat.effectHandler(clearsmogVeil, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, clearsmogScene, 1, body.position(), { moment: "release", target: String(victim.ref()) }, 22);
    });
    WorldCombat.effectHandler(clearsmogVeil, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 泥块炸开：命中点一圈的非友方被冲回原点、挂上黏烟。 */
    function clearsmogBurst(world: CombatWorld, action: CombatAction, at: CombatPoint): { swept: number; erased: number } {
        const radius = Math.max(1.4, p(clearsmogId, "cloudRadius", action));
        const linger = Math.max(30, Math.round(p(clearsmogId, "linger", action)));
        const interval = Math.max(8, Math.round(p(clearsmogId, "interval", action)));
        const fumes = Math.max(14, Math.round(p(clearsmogId, "fumes", action)));
        const scale = Math.max(0.6, Math.min(2.2, radius / clearsmogReference));
        const intensity = Math.max(0.6, Math.min(2.2, p(clearsmogId, "mud", action) / 42));
        let swept = 0, erased = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(at, 0, radius, { below: 2, above: 3 }), function (foe, facts) {
            // 实墙遮挡：从炸点到身体之间隔着方块就不被烟洗到，墙后的增益留得住。
            if (WorldGeometry.blockHit(world, at, facts.position()) !== null) return;
            swept++;
            const removed = clearsmogErase(world, foe);
            erased += removed;
            // 先退休同一目标身上的旧烟，旧烟持有的标记随之撤走；再挂新标记并把它交给新烟。
            const existing = world.effects(foe, clearsmogVeil);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            const mark = MobEffects.apply(world, foe, clearsmogMark, linger, 0);
            if (mark === null) return;
            const data = { interval: interval, fumes: fumes, scale: scale, intensity: intensity, mark: MobEffects.anchor(mark) };
            world.effect(clearsmogVeil, foe, JSON.stringify(data), linger);
            WorldFeedback.emit(world, clearsmogScene, 1, facts.position(),
                { moment: "caught", target: String(foe.ref()), erased: removed, fumes: fumes, scale: scale, intensity: intensity }, 24);
        });
        WorldFeedback.emit(world, clearsmogScene, 1, at,
            { moment: "burst", fumes: fumes, scale: scale, intensity: intensity, swept: swept, erased: erased }, 30);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)),
            erased > 0 ? clearsmogClearedText : clearsmogEmptyText, erased > 0 ? [erased] : [swept], 24);
        return { swept: swept, erased: erased };
    }

    define({
        id: clearsmogId,
        cooldownParameter: "recharge",
        name: "Clear Smog",
        description: "掷出泥块，命中点炸出只影响敌人的清除之烟：烟只清掉对手身上正向的能力提升与可移除的药水增益，附着期间反复清掉新获得的强化，不动已被压低的等级。可自由投点或按方向空掷，泥块会被墙挡住。",
        uses: ["把对手攒起来的能力一波冲回原点", "让一个刚刚加满级的目标短时间内留不住增益", "同时清掉一小撮抱团对手的等级"],
        kind: "aim",
        range: 8,
        maxRange: 13,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 24,
        style: "clearsmog",
        defaults: { billow: false, ai: { maxChase: 11, minStages: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(clearsmogId, "cloudRadius", pokemon), geometry: "area", style: "clearsmog", color: 0x9FB7A0,
                label: config && config.billow === true ? "漫烟式" : "聚泥式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[clearsmogId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(clearsmogId, "tempo", context)),
                recover: Math.round(p(clearsmogId, "aftercast", context)),
                cooldown: Math.round(p(clearsmogId, "recharge", context)),
                active: 0,
                range: p(clearsmogId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const fumes = Math.max(10, Math.round(p(clearsmogId, "fumes", action)));
            action.present("world_combat:clearsmog:windup", clearsmogScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", billow: config && config.billow === true ? 1 : 0, fumes: fumes }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            // 自由投点/方向：只有真实存在的非友方实体才修正泥块方向；否则沿瞄准方向直飞。
            const homing = target !== null && world.valid(target) && !world.friendly(target) ? String(target.ref()) : null;
            const power = p(clearsmogId, "mud", action);
            const speed = Math.max(0.8, p(clearsmogId, "flight", action));
            const radius = Math.max(0.16, p(clearsmogId, "clayRadius", action));
            const reach = Math.max(5, p(clearsmogId, "reach", action));
            const fumes = Math.max(14, Math.round(p(clearsmogId, "fumes", action)));
            const cloud = Math.max(1.4, p(clearsmogId, "cloudRadius", action));
            const scale = Math.max(0.6, Math.min(2.2, cloud / clearsmogReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 42));
            const direction = aim(action);
            let burst = false, settled = false;

            sound(action, "cobblemon:move.sludgebomb.actor");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/mud/mudsplash", tint: 0x8E9C7A,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.26))
            };
            // 追踪搜索圈与实际弹程都用同一 reach，和 resolve 声明的射程一致。
            if (homing !== null) appearance.homing = { target: homing, turn: 9, delay: 1, range: reach };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, gravity: 0.02, lifetime: 140, direction: direction,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    if (burst) return;
                    if (victim !== null) {
                        // 命中友方或已离场实体只是一记空撞，不结算伤害也不附烟。
                        if (!scope.valid(victim) || scope.friendly(victim)) return;
                        if (!impact(current, hit, clearsmogId, power, { damage: damageSpec(clearsmogId, "mud") })) return;
                    }
                    // 实体或方块的真实接触点都是泥团炸开处；烟只落到实际命中点范围内的非友方身上。
                    burst = true;
                    const result = clearsmogBurst(scope, current, at);
                    sound(current, "cobblemon:impact.poison");
                    if (result.erased > 0) sound(current, "minecraft:block.beacon.deactivate");
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (!burst) {
                    // 自然飞尽或被墙挡下：用弹体最后真实接触/结束点落空，不用旧瞄准点。
                    const end = scope.projectilePosition(flight) || current.targetPosition();
                    WorldFeedback.emit(scope, clearsmogScene, 1, end, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, end, clearsmogMissText, [], 20);
                }
                done(current);
            });
            WorldFeedback.keep(world, "clearsmog:fly:" + action.id(), clearsmogScene, 1, action.origin(),
                { moment: "flight", projectile: flight, fumes: fumes, scale: scale, intensity: intensity }, 90);
        }
    });
}
