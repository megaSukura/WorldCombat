/**
 * 镜光射击 / mirrorshot 的出手方式。
 *
 * 核心念头：**把身体磨成一面镜子，射出一道刺目的细长闪光**。它不快在威力，而快在「笔直、细、远」：
 *   起手先把全身抛光（越磨越亮），随后一束白光直取一点；被晃到的人眼前留一片残光、此后瞄不准。
 *   散射式下光在目标身上反射开，顺着射击方向溅到它身后的旁人身上。
 *
 * 三幕：
 *   起（windup，提交前）：全身抛光亮起、光顺身体向一点收拢，只播预告（可被打断）。
 *   射（flash）：提交后一道光矛沿瞄准线高速射出；飞到落点即结算。
 *   炫（dazzle / refract / miss）：命中非友方吃 `flash`，有 `glareChance` 概率掉 `glareStages` 级命中并带上
 *       共享身份 `world_combat:status/glared`；散射式再从落点沿射击方向溅出一个扇形，圈内旁人吃 `refract`、
 *       半数概率被晃到；打空则只在墙上闪光。
 *
 * 与同族分开：闪光、魔法闪耀都是**自身整圈的爆闪**，只能近身；镜光射击是**一道又细又快的远程光矛**，
 *   点一条线、射程最长，还能按配置把光反射到旁人身上。
 * 命中下降走共享能力等级（NativeEffects.boost 的 accuracy）落到原生命中等级，同时挂真实 MobEffect
 * （身份 glared + 伞身份 aim_impaired），对其他战斗者落到攻击变弱。
 */
namespace PokemonSkills {
    /** 一道光的两个世界顶点；判定与表现读同一条线。 */
    function mirrorshotLine(from: CombatPoint, to: CombatPoint): number[][] {
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    define({
        id: mirrorshotId,
        cooldownParameter: "recharge",
        name: "Mirror Shot",
        description: "磨亮身体射出一道高速细长的镜面闪光：主目标挨一记钢属性特殊伤害，有概率被晃到眼睛、掉命中；散射式下光在目标身上反射开，顺射击方向溅到身后的旁人。聚光式单点更远更重，散射式打一簇人。",
        uses: ["远距离点掉一个对手的命中", "在开阔地用一道快光先手", "按配置把光反射开，顺手晃到目标身后的一排人"],
        kind: "enemy",
        range: 14,
        maxRange: 20,
        prepare: 11,
        active: 0,
        recover: 7,
        cooldown: 34,
        style: "mirror",
        defaults: { scatter: false, ai: { maxChase: 17, aimAttackers: true } },
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
            const from = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0));
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
                    WorldFeedback.emit(scope, mirrorshotScene, 1, point, { moment: "miss", glints: glints, scale: scale }, 18);
                    return;
                }
                struck = true;
                if (!impact(current, hit, mirrorshotId, power, { damage: damageSpec(mirrorshotId, "flash") })) return;
                let glared = false;
                if (scope.valid(victim) && scope.random() < chance) {
                    glared = true;
                    NativeEffects.boost(scope, victim, "accuracy", -stages);
                    MobEffects.apply(scope, victim, mirrorshotEffect, glare, 0);
                }
                const at = scope.observe(victim);
                if (at !== null) {
                    WorldFeedback.emit(scope, mirrorshotScene, 1, at.position(),
                        { moment: "dazzle", target: String(victim.ref()), stages: stages, glared: glared ? 1 : 0,
                            glints: glints, intensity: intensity, scale: scale }, 24);
                    if (glared)
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.15, 0)), mirrorshotGlareText, [stages], 30);
                }
                if (!scatter) return;
                // 散射：光在目标身上反射开，顺着射击方向溅到它身后的旁人。
                let heading = point.minus(from);
                if (heading.length() < 0.05) heading = direction;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(point, heading, 4.5, refractSpan, { below: 1.6, above: 2.4 }),
                    function (other, facts) {
                        if (String(other.ref()) === String(victim.ref())) return;
                        hurt(current, other, mirrorshotId, splashPower, { damage: damageSpec(mirrorshotId, "refract") });
                        let alsoGlared = false;
                        if (scope.valid(other) && scope.random() < chance * 0.5) {
                            alsoGlared = true;
                            NativeEffects.boost(scope, other, "accuracy", -stages);
                            MobEffects.apply(scope, other, mirrorshotEffect, Math.round(glare * 0.7), 0);
                        }
                        WorldFeedback.emit(scope, mirrorshotScene, 1, facts.position(),
                            { moment: "refract", target: String(other.ref()), stages: stages, glared: alsoGlared ? 1 : 0,
                                glints: Math.round(glints * 0.6), intensity: Math.max(0.4, intensity * 0.7), scale: scale }, 20);
                    });
            }

            sound(action, "minecraft:entity.illusioner.mirror_move");
            WorldFeedback.emit(world, mirrorshotScene, 1, from,
                { moment: "flash", path: mirrorshotLine(from, aimPoint), glints: glints, intensity: intensity,
                    scale: scale, scatter: scatter ? 1 : 0 }, 40);
            LivingActions.projectile(action, {
                speed: velocity, range: reach, radius: radius, direction: direction, gravity: 0, lifetime: 120,
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

    // 残光存续期间，目标眼位维持一簇没缓过来、慢慢暗下去的光点：少而稳，让出本体视线。
    WorldCombat.on("world_combat:move_mirrorshot/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mirrorshotEffect || event.world().tick() % 10 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "mirrorshot:glare:" + String(actor.ref()), mirrorshotScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), glints: 8 }, 40);
    });
}
