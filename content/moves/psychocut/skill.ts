/**
 * 精神利刃 / psychocut 的出手方式。
 *
 * 核心念头：在身前凝出一把实体化的心之利刃——一轮偏紫的月牙——掷出去；刃脱手后自己修正方向追向目标，
 * 命中处沿**实际入射的竖平面**切出一个十字，把目标钉在交点上，只有真正落在两道亮笔上的近旁敌人才各挨一记。
 * 它是本族里唯一「刃离开施法者、还会拐弯追人」的一击。
 *
 * 三幕：
 *   起（windup，提交前）：心意在身前收拢，只播预告，可被打断。
 *   掷（blade，提交后）：月牙脱手沿目标方向飞出，追着目标拐弯；飞行中拖着刃尾。空点直射可用，不挂空 homing。
 *   裂（cleave → echo）：命中时用弹体的真实入射方向在竖直面切出两条交叉短段，主目标吃满 `blade`；
 *       刃风只沿这两条短段做 `action.trace`，实墙把短段裁剪，落在段厚内、排除主目标、每个敌人只吃一次 `echo` 比例。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的十字闪。
 *
 * 与同族分开：水波刀是一道笔直、极快、细窄的水线，能贯穿成排的目标；精神利刃是一轮更宽、会拐弯追人的
 * 月牙，命中切出一个面（十字）而不是一条线，伤害只落在十字的两道亮笔上。
 */
namespace PokemonSkills {
    /** 沿实际入射方向，在落点的竖直面上张开两条交叉短段；判定与表现共用同一组端点。 */
    function psychocutArms(point: CombatPoint, incoming: CombatPoint, half: number, vertical: number): CombatPoint[][] {
        const heading = WorldGeometry.flatUnit(incoming, WorldCombat.point(0, 0, 1));
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const up = WorldCombat.point(0, 1, 0);
        const a = point.plus(side.scale(-half)).plus(up.scale(-vertical));
        const b = point.plus(side.scale(half)).plus(up.scale(vertical));
        const c = point.plus(side.scale(-half)).plus(up.scale(vertical));
        const d = point.plus(side.scale(half)).plus(up.scale(-vertical));
        return [[a, b], [c, d]];
    }

    /**
     * 沿一条十字短段做权威刃风判定：撞到实墙就把短段裁到墙面，落在段厚内的非友方各吃一次 `echo`，
     * 排除主目标、每个敌人只记一次。返回这条短段真实到达的末端，供表现裁出同样的长度。
     */
    function psychocutCleave(current: CombatAction, start: CombatPoint, end: CombatPoint, thickness: number,
        mainRef: string, hitRefs: { [ref: string]: boolean }, budget: number, power: number, echo: number,
        scale: number, intensity: number, counter: { count: number }): CombatPoint {
        const scope = current.world();
        let from = start, reached = end, guard = 0;
        while (guard++ < 8 && counter.count < budget) {
            const probe = current.trace(from, end, thickness, true);
            if (probe.hitEntity()) {
                const victim = probe.target();
                const ref = victim === null ? "" : String(victim.ref());
                const facts = victim === null ? null : scope.observe(victim);
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && ref !== mainRef && !hitRefs[ref]) {
                    if (hurt(current, victim, psychocutId, power * echo,
                        { damage: damageSpec(psychocutId, "blade"), slice: true })) {
                        hitRefs[ref] = true;
                        counter.count++;
                        const at = facts === null ? probe.position() : facts.position();
                        WorldFeedback.emit(scope, psychocutScene, 1, at,
                            { moment: "echo", target: ref,
                                path: [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]],
                                scale: scale, intensity: intensity * 0.8 }, 18);
                    }
                }
                const past = facts === null ? probe.position() : facts.position();
                const forward = end.minus(past);
                if (forward.length() < 0.05) break;
                from = past.plus(forward.unit().scale(0.3));
            } else if (probe.blocked()) {
                reached = probe.position();
                break;
            } else break;
        }
        return reached;
    }

    define({
        id: psychocutId,
        cooldownParameter: "recharge",
        name: "Psycho Cut",
        description: "在身前凝出一把实体化的心之刃，掷出去后它自己拐弯追向目标：命中处沿实际入射方向切出一个十字，把目标钉在交点上，只有真正落在十字两道亮笔上的近旁敌人才各挨一记刃风。可以朝方向或地点空掷，墙会把弹与刃风都挡下。它是一记会追人的远程斩击，暴击率比同族高一档。",
        uses: ["把实体化的心之刃掷出去", "刃会拐弯追向目标", "命中处切出一个十字，只有落在亮笔上的敌人被波及"],
        kind: "aim",
        range: 9,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 28,
        style: "psychic",
        defaults: { keen: false, ai: { maxChase: 13, finishLow: true, cross: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(psychocutId, "arc", pokemon), geometry: "area", style: "psychic", color: 0xB57BE8,
                label: config && config.keen === true ? "凝刃" : "精神利刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[psychocutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(psychocutId, "tempo", context)),
                recover: Math.round(p(psychocutId, "aftercast", context)),
                cooldown: Math.round(p(psychocutId, "recharge", context)),
                active: 0,
                range: p(psychocutId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychocut:windup", psychocutScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", keen: config && config.keen === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const direction = aim(action);
            const power = p(psychocutId, "blade", action);
            const speed = p(psychocutId, "flight", action);
            const reach = p(psychocutId, "reach", action);
            const arc = p(psychocutId, "arc", action);
            const guide = Math.round(p(psychocutId, "guide", action));
            const echo = p(psychocutId, "echo", action);
            const radius = p(psychocutId, "radius", action);
            const shards = Math.max(8, Math.round(p(psychocutId, "shards", action)));
            const cap = Math.max(1, Math.round(p(psychocutId, "maxTargets", action)));
            const scale = Math.max(0.6, Math.min(2.0, arc / psychocutReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const self = world.observe(actor);
            const from = self === null ? action.origin() : self.position();
            let settled = false;

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/cut", tint: 0xB57BE8, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.35))
            };
            // 只有瞄准了一个有效的非友方实体才挂有限追踪；空点直射不挂空 homing。
            if (target !== null && world.valid(target) && !world.friendly(target))
                appearance.homing = { target: String(target.ref()), turn: guide, delay: 2, range: reach };

            sound(action, "minecraft:item.trident.throw");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 220,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim) || settled) return;
                    settled = true;
                    // 实际入射方向：优先读弹体原生速度，读不到再用来源到接触方向；十字沿它张开。
                    let incoming: CombatPoint | null = null;
                    const projectileRef = hit.projectile();
                    if (projectileRef) {
                        const projectileActor = scope.actor(projectileRef);
                        const native = projectileActor === null ? null : scope.nativeEntity(projectileActor);
                        if (native && typeof native.getDeltaMovement === "function") {
                            const motion = native.getDeltaMovement();
                            if (motion) {
                                const velocity = WorldCombat.point(motion.x, motion.y, motion.z);
                                if (velocity.length() > 0.001) incoming = velocity.unit();
                            }
                        }
                    }
                    if (incoming === null) {
                        const source = hit.source();
                        const sourceBody = source === null ? null : scope.observe(source);
                        const sourcePoint = sourceBody === null ? from : sourceBody.position();
                        const delta = point.minus(sourcePoint);
                        incoming = delta.length() < 0.01 ? direction : delta.unit();
                    }
                    const landed = impact(current, hit, psychocutId, power,
                        { damage: damageSpec(psychocutId, "blade"), slice: true });
                    sound(current, "cobblemon:impact.psychic");
                    const arms = psychocutArms(point, incoming, arc, arc * 0.95);
                    let extra = 0;
                    if (landed) {
                        const hitRefs: { [ref: string]: boolean } = Object.create(null);
                        const counter = { count: 0 };
                        for (let index = 0; index < arms.length; index++) {
                            const start = arms[index][0], end = arms[index][1];
                            const reached = psychocutCleave(current, start, end, radius, String(victim.ref()),
                                hitRefs, cap - 1, power, echo, scale, intensity, counter);
                            // 两条亮笔按实墙裁剪；只在真实到过的段上展开。
                            WorldFeedback.emit(scope, psychocutScene, 1, point,
                                { moment: "cleave", target: String(victim.ref()),
                                    path: [[start.x(), start.y(), start.z()], [reached.x(), reached.y(), reached.z()]],
                                    shards: shards, scale: scale, intensity: intensity }, 24);
                        }
                        extra = counter.count;
                    } else {
                        // 主击失败：只散刃，不展开任何伤害副刃。
                        WorldFeedback.emit(scope, psychocutScene, 1, point,
                            { moment: "scatter", target: String(victim.ref()), scale: scale, intensity: intensity }, 20);
                    }
                    if (landed) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), psychocutCutText, [extra], 26);
                    done(current);
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                WorldFeedback.emit(scope, psychocutScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), psychocutMissText, [], 20);
                done(current);
            });
            WorldFeedback.keep(world, "psychocut:flight:" + action.id(), psychocutScene, 1, action.origin(),
                { moment: "blade", projectile: flight, scale: scale, intensity: intensity }, 120);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的十字闪与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_psychocut/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== psychocutId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, psychocutScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: Math.max(10, Math.min(46, Math.round(ratio * 3))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), psychocutVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
