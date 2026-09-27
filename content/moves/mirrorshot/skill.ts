/**
 * 镜光射击 / mirrorshot 的出手方式。
 *
 * 核心念头：**把身体磨成一面镜子，射出一道刺目的细长闪光**。它不快在威力，而快在「笔直、细、远」：
 *   起手先把全身抛光（越磨越亮），随后一束白光直取一点；被晃到的人眼前留一片残光、此后瞄不准。
 *   散射式下光在目标身上反射开，顺着入射方向溅到它身后的旁人身上；掩体会逐对象挡住这层折射。
 *
 * 三幕：
 *   起（windup，提交前）：全身抛光亮起、光顺身体向一点收拢，只播预告（可被打断）。
 *   射（flash）：提交后从身体内一点的实际发射口射出光矛，沿瞄准线高速飞行；命中即结算。
 *   炫（dazzle / refract / miss）：命中非友方吃 `flash`，真伤获准后才有 `glareChance` 概率掉 `glareStages` 级命中
 *       并带上共享身份 `world_combat:status/glared`；散射式再从**实际主命中点**沿入射方向溅出一个扇形，圈内旁人必须
 *       与命中点通视才吃 `refract`、半数概率被晃到，主目标不吃第二伤；打空只在墙上闪光。
 *
 * 选取是 `kind: "aim"`——自由方向射光，方块拦下就没有实体折射，空放散光；目标为 null 时沿当前朝向照常射。
 * 命中下降用 `NativeEffects.boostWindow(..., "accuracy", -n)` 绑在 `mirrorshot_dazzle` 载体上，
 * 对其他战斗者落到共享命中阶梯；载体结束或清除即收回，不留下永久命中损失。不额外挂攻击属性修饰。
 */
namespace PokemonSkills {
    /** 一道光的两个世界顶点；判定与表现读同一条线。 */
    function mirrorshotLine(from: CombatPoint, to: CombatPoint): number[][] {
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    /**
     * 残光存续的托管载体：把「目标眼位持续暗下去的光点」绑在真实状态效果的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停，不靠固定时长的 keep。
     */
    const mirrorshotLingerMark = "world_combat:move_mirrorshot/linger_mark";

    function mirrorshotLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, mirrorshotEffect);
        if (carrier === null) { effect.end(); return; }
        const state = JSON.parse(effect.state() || "{}");
        const glints = typeof state.glints === "number" && state.glints > 0 ? Math.round(state.glints) : 8;
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "glare", mirrorshotScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), glints: glints });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(mirrorshotLingerMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid mirrorshot linger mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mirrorshotLingerMark, "start", mirrorshotLingerWatch);
    WorldCombat.effectHandler(mirrorshotLingerMark, "watch", mirrorshotLingerWatch);
    WorldCombat.effectHandler(mirrorshotLingerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_mirrorshot/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mirrorshotEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, mirrorshotLingerMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: mirrorshotId,
        cooldownParameter: "recharge",
        name: "Mirror Shot",
        description: "磨亮身体射出一道高速细长的镜面闪光：主目标挨一记钢属性特殊伤害，有概率被晃到眼睛、掉命中；散射式下光在实际命中点沿入射方向反射开，溅到身后与命中点通视的旁人，主目标不吃第二伤。聚光式单点更远更重，散射式打一簇人。",
        uses: ["远距离点掉一个对手的命中", "在开阔地用一道快光先手", "按配置把光反射开，顺手晃到目标身后的一排人"],
        kind: "aim",
        range: 14,
        maxRange: 20,
        prepare: 11,
        active: 0,
        recover: 7,
        cooldown: 34,
        style: "mirror",
        defaults: { scatter: false, ai: { maxChase: 17 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(mirrorshotId, "reach", pokemon), geometry: "line", style: "mirror",
                color: 0xE8F4FF, label: config && config.scatter === true ? "镜光射击·散射" : "镜光射击·聚光" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mirrorshotId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(mirrorshotId, "tempo", context)),
                recover: Math.round(p(mirrorshotId, "aftercast", context)),
                cooldown: Math.round(p(mirrorshotId, "recharge", context)),
                active: 0,
                range: p(mirrorshotId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("mirrorshot:polish", mirrorshotScene, 1, action.origin(),
                JSON.stringify({ moment: "polish", glints: Math.round(p(mirrorshotId, "glints", action)),
                    scatter: config && config.scatter === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            // 从身体内一点的实际发射口射光；判定与表现共用同一个 from。
            const from = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.3, 0));
            const aimPoint = action.targetPosition();
            const raw = aimPoint.minus(from);
            const direction = raw.length() < 0.05 ? action.direction() : raw.unit();
            const power = p(mirrorshotId, "flash", action);
            const reach = Math.max(6, p(mirrorshotId, "reach", action));
            const velocity = Math.max(1, p(mirrorshotId, "velocity", action));
            const radius = Math.max(0.05, p(mirrorshotId, "beamRadius", action));
            const chance = Math.max(0.05, Math.min(0.9, p(mirrorshotId, "glareChance", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p(mirrorshotId, "glareStages", action))));
            const glare = Math.max(40, Math.round(p(mirrorshotId, "glareTicks", action)));
            const splashPower = p(mirrorshotId, "refract", action);
            const refractSpan = Math.max(30, p(mirrorshotId, "refractSpan", action));
            const glints = Math.max(10, Math.round(p(mirrorshotId, "glints", action)));
            const scatter = !!(config && config.scatter);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.1));
            const intensity = Math.max(0.5, Math.min(2.2, power / 65));
            let struck = false, settled = false;

            /** 承载成功后才开一份属于这次晃眼的命中窗口；已是满负命中时不留载体、不播成功。 */
            function glareApply(scope: CombatWorld, victim: CombatActor, probability: number, ticks: number, secondary: boolean): boolean {
                if (!scope.valid(victim) || scope.random() >= probability) return false;
                const before = NativeEffects.effectiveStages(scope, victim);
                const previous = MobEffects.read(scope, victim, mirrorshotEffect);
                const carrier = MobEffects.apply(scope, victim, mirrorshotEffect, ticks, 0);
                if (carrier === null) return false;
                const owned = NativeEffects.boostWindow(scope, victim, { accuracy: -stages }, ticks,
                    "world_combat:move/mirrorshot", carrier, previous);
                if (!owned) { scope.removeMobEffect(victim, carrier.id(), carrier.key()); return false; }
                const after = NativeEffects.effectiveStages(scope, victim);
                if ((before.accuracy || 0) - (after.accuracy || 0) <= 0) { scope.removeMobEffect(victim, carrier.id(), carrier.key()); return false; }
                if (scope.effects(victim, mirrorshotLingerMark).length === 0)
                    scope.effect(mirrorshotLingerMark, victim,
                        JSON.stringify({ glints: Math.max(4, Math.min(16, Math.round(glints * (secondary ? 0.6 : 1)))) }),
                        Math.max(1, Math.min(2400, glare)));
                return true;
            }

            /** 只在光真正到达时才画这一段线，端点用真实接触点，不再预涂到原瞄点。 */
            function flashLine(scope: CombatWorld, to: CombatPoint): void {
                WorldFeedback.emit(scope, mirrorshotScene, 1, from,
                    { moment: "flash", path: mirrorshotLine(from, to), glints: glints, intensity: intensity, scale: scale }, 14);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (!struck)
                    WorldFeedback.text(current.world(), aimPoint.plus(WorldCombat.point(0, 0.9, 0)), mirrorshotMissText, [], 22);
                done(current);
            }

            function onHit(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const point = hit.position();
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                    // 撞墙或碰到友方：光停在这里，用真实接触点收一记空。
                    flashLine(scope, point);
                    WorldFeedback.emit(scope, mirrorshotScene, 1, point, { moment: "miss", glints: glints, scale: scale }, 18);
                    return;
                }
                // 真伤获准才算打中；被原生拒绝时不播命中与晃眼。
                if (!impact(current, hit, mirrorshotId, power, { damage: damageSpec(mirrorshotId, "flash") })) return;
                struck = true;
                flashLine(scope, point);
                const glared = glareApply(scope, victim, chance, Math.max(20, Math.round(glare)), false);
                const at = scope.observe(victim);
                if (at !== null) {
                    WorldFeedback.emit(scope, mirrorshotScene, 1, at.position(),
                        { moment: "dazzle", target: String(victim.ref()), stages: stages, glared: glared ? 1 : 0,
                            glints: glints, intensity: intensity, scale: scale }, 24);
                    if (glared)
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.15, 0)), mirrorshotGlareText, [stages], 30);
                }
                if (!scatter) return;
                // 散射：光在**实际主命中点**沿入射方向反射开，逐对象检查掩体后再溅到身后旁人；主目标不吃第二伤。
                let heading = point.minus(from);
                if (heading.length() < 0.05) heading = direction;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(point, heading, 4.5, refractSpan, { below: 1.6, above: 2.4 }),
                    function (other, facts) {
                        if (String(other.ref()) === String(victim.ref())) return;
                        if (!scope.clear(point, facts.position())) return;
                        if (!hurt(current, other, mirrorshotId, splashPower, { damage: damageSpec(mirrorshotId, "refract") })) return;
                        const alsoGlared = glareApply(scope, other, chance * 0.5, Math.max(20, Math.round(glare * 0.7)), true);
                        // 从真实命中点到这个获准旁体描一条瞬时分叉，而不是只在它身上闪星。
                        WorldFeedback.emit(scope, mirrorshotScene, 1, point,
                            { moment: "refract", target: String(other.ref()), path: mirrorshotLine(point, facts.position()),
                                stages: stages, glared: alsoGlared ? 1 : 0, glints: Math.round(glints * 0.6),
                                intensity: Math.max(0.4, intensity * 0.7), scale: scale }, 20);
                    });
            }

            sound(action, "minecraft:entity.illusioner.mirror_move");
            // 光矛本身是高速投射物；flash 线只在真实接触点出现。
            LivingActions.projectile(action, {
                speed: velocity, range: reach, radius: radius, direction: direction, gravity: 0, origin: from, lifetime: 120,
                appearance: { sprite: "cobblemon:generic/lightbeam", tint: 0xFFFFFF, glow: true,
                    scale: Math.max(0.8, radius / 0.1) },
                impact: onHit
            }, finish);
        }
    });

    // 残光散去（或被外力清掉）：在目标身上补一下「眨眼」，让晃眼有明确的结束。
    WorldCombat.on("world_combat:move_mirrorshot/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mirrorshotEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, mirrorshotScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });
}
