/**
 * 骨头回力镖 / bonemerang 的出手方式。
 *
 * 核心念头：掷出手里的骨头，骨头在目标身上掠过去、绕到身后再飞回来，**去与回各打一次**，然后落回手里——
 *   同一次出手打两下，识别它的是「回旋」，不是「两段」。
 *
 * 两幕半：
 *   起（windup，提交前）：拔骨、拧身，手里聚起一圈骨白光，只播预告。
 *   掷（execute，提交后）：骨头作为一枚持久实体离手（外观是真正的 `minecraft:bone`）；它朝掷出那一刻
 *       锁定的落点飞去，掠过目标时结算一段 `out`；越过 `overshoot` 后折返，途中向侧面摆开 `bow`，
 *       回程再掠一次结算一段 `back`。两段各是一次真实结算（不是威力翻倍），目标在骨头到达前走开就会空掉。
 *   回（catch）：骨头飞回施法者手中并散去；若施法者或骨头先没了，骨头就地落成掉落物。
 *
 * 与同族分开：同是骨头，骨棒（boneclub）是**手里抡出去的一棒**（近战、骨屑走廊）；骨头回力镖是**离手的往返**，
 *   它的价值在第二次掠过。三连箭的 3 支箭是同时离弦，本招的 2 下是同一根骨头去与回。
 *
 * 配置 `arc` 由 resolve 改时序、由公式改弧线与两段威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const bonemerangScene = "world_combat:move_bonemerang";
    const bonemerangBoneEffect = "world_combat:move/bonemerang/bone";
    const bonemerangMissText = "world_combat.move.bonemerang.text.miss";
    const bonemerangCatchText = "world_combat.move.bonemerang.text.catch";
    const bonemerangBreakText = "world_combat.move.bonemerang.text.break";

    function bonemerangState(brain: CombatEffect): any { return JSON.parse(brain.state()); }
    /** 状态里存的是 JSON 数组；换算成 CombatPoint 再用它的 minus/unit。 */
    function bonemerangPoint(value: number[]): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    /** 用施法者的属性结算一段骨头伤害，并把结果放回世界（持久实体以施法者为源）。 */
    function bonemerangStrike(brain: CombatEffect, owner: CombatActor, target: CombatActor, segment: string, power: number): boolean {
        const world = brain.world();
        if (!world.valid(target)) return false;
        const template = CobblemonCombat.moveTemplate("bonemerang");
        const features = damageFeatures("bonemerang", segment);
        features.power = power;
        const result = PokemonDamage.resolve(world, owner, target, template, features, 0);
        if (!(result.amount > 0)) return false;
        world.hurt(target, result.amount, result.metadata);
        return true;
    }

    /** 骨头每刻推进一次：先判定掠过、再决定下一段的目标点。 */
    function bonemerangStep(brain: CombatEffect): void {
        const world = brain.world(), state = bonemerangState(brain);
        const self = world.observe(brain.target());
        if (self === null) { brain.end(); return; }
        const owner = world.actor(state.owner), target = world.actor(state.target);
        if (owner === null || !world.valid(owner)) { brain.end(); return; }
        const ownerBody = world.observe(owner);
        if (ownerBody === null) { brain.end(); return; }
        const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
        const at = self.position();
        state.age = (state.age || 0) + 1;

        // 掠过判定：这一趟内第一次进入骨头判定就结算一次，之后必须离开一段才允许下一趟再算。
        if (targetBody !== null) {
            const distance = at.minus(targetBody.position()).length();
            if (distance < state.phaseMin) state.phaseMin = distance;
            if (distance <= state.hitRadius && !state.phaseHit && state.hits < 2) {
                const segment = state.phase === "out" ? "out" : "back";
                const power = state.phase === "out" ? state.outPower : state.backPower;
                if (bonemerangStrike(brain, owner, target!, segment, power)) {
                    state.phaseHit = true; state.hits++;
                    WorldFeedback.emit(world, bonemerangScene, 1, at,
                        { moment: "strike", target: String(target!.ref()), segment: segment, hits: state.hits,
                            count: Math.round(state.spin * (state.phase === "out" ? 0.8 : 1.2)), scale: state.scale }, 22);
                    world.sound("minecraft:block.bone_block.break", at, 14, "{}");
                }
            }
        }

        let goal: CombatPoint;
        if (state.phase === "out") {
            // 折返：够到折返点，或飞去太久（被目标挡在身前）也掉头——骨头绝不会因为撞上谁而僵在那里。
            if (at.minus(bonemerangPoint(state.turnPoint)).length() <= state.turn || state.age >= state.outLimit) {
                // 去程走完：若这一趟擦到过目标但没进判定，也补算这一下（「掠过」）。
                if (!state.phaseHit && state.hits < 2 && targetBody !== null && state.phaseMin <= state.catchRadius) {
                    if (bonemerangStrike(brain, owner, target!, "out", state.outPower)) {
                        state.phaseHit = true; state.hits++;
                        WorldFeedback.emit(world, bonemerangScene, 1, at,
                            { moment: "strike", target: String(target!.ref()), segment: "out", hits: state.hits,
                                count: Math.round(state.spin * 0.8), scale: state.scale, graze: true }, 22);
                        world.sound("minecraft:block.bone_block.break", at, 14, "{}");
                    }
                }
                state.phase = "back"; state.phaseMin = 999; state.phaseHit = false; state.midDone = false; state.age = 0;
                goal = targetBody !== null ? targetBody.position() : ownerBody.position();
            } else goal = bonemerangPoint(state.turnPoint);
        } else {
            const distanceHome = at.minus(ownerBody.position()).length();
            if (distanceHome <= state.catch) {
                if (!state.phaseHit && state.hits < 2 && targetBody !== null && state.phaseMin <= state.catchRadius) {
                    if (bonemerangStrike(brain, owner, target!, "back", state.backPower)) {
                        state.hits++;
                        WorldFeedback.emit(world, bonemerangScene, 1, at,
                            { moment: "strike", target: String(target!.ref()), segment: "back", hits: state.hits,
                                count: Math.round(state.spin * 1.2), scale: state.scale, graze: true }, 22);
                        world.sound("minecraft:block.bone_block.break", at, 14, "{}");
                    }
                }
                WorldFeedback.emit(world, bonemerangScene, 1, at, { moment: "catch", hits: state.hits, scale: state.scale }, 24);
                world.sound("minecraft:entity.fishing_bobber.retrieve", at, 12, "{}");
                WorldFeedback.text(world, ownerBody.position().plus(WorldCombat.point(0, ownerBody.height() + 0.1, 0)),
                    state.hits > 0 ? bonemerangCatchText : bonemerangMissText, state.hits > 0 ? [state.hits] : [], 26);
                brain.end();
                return;
            }
            // 折返段：先掠回目标当前所在处（回力镖绕一圈回来正对人），再飞回施法者手里。
            const midGoal = targetBody !== null ? targetBody.position() : ownerBody.position();
            if (!state.midDone) {
                if (at.minus(midGoal).length() <= 0.9) state.midDone = true;
                goal = state.midDone ? ownerBody.position() : midGoal;
            } else goal = ownerBody.position();
        }

        const heading = goal.minus(at);
        if (heading.length() > 0.03) world.motion(brain.target(), heading.unit().scale(state.speed), false);
        brain.state(JSON.stringify(state));
        WorldFeedback.keep(world, "bonemerang:bone:" + String(brain.target().ref()), bonemerangScene, 1, at,
            { moment: state.phase, target: state.target, hits: state.hits, count: state.spin, scale: state.scale }, 20);
    }

    // 骨头本体：一枚属于它自己的持久实体，脑从起飞到落回手里都在这里。
    WorldBodies.define(bonemerangBoneEffect, {
        schema: 1,
        maxTicks: 200,
        start: function (brain) {
            const world = brain.world(), state = bonemerangState(brain), self = world.observe(brain.target());
            if (self !== null) WorldFeedback.emit(world, bonemerangScene, 1, self.position(),
                { moment: "throw", target: state.target, count: state.spin, scale: state.scale }, 20);
        },
        tick: { every: 1, handler: function (brain) { bonemerangStep(brain); } },
        end: function (brain) {
            const world = brain.world(), body = world.observe(brain.target());
            if (body === null) return;
            // 没落回手里就散：骨头掉在原地，世界里留下它本来的样子。
            if (brain.reason() === "died" || brain.reason() === "expired") {
                WorldFeedback.emit(world, bonemerangScene, 1, body.position(), { moment: "drop" }, 20);
                if (brain.reason() === "died") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.6, 0)), bonemerangBreakText, [], 24);
                try { world.dropItem(body.position(), "minecraft:bone", 1, JSON.stringify({ pickupDelay: 20 })); } catch (error) { }
            }
        }
    });

    define({
        id: "bonemerang",
        cooldownParameter: "recharge",
        name: "骨头回力镖",
        description: "掷出手里的骨头，骨头掠过对手、绕到身后再飞回来，去与回各打一次；它朝掷出时锁定的折返点飞出，回程会追向目标当前所在处，目标挪开原位能躲开第一下。",
        uses: ["中距离投出骨头，去与回各打一下", "让回旋的第二下补上第一下的空档", "在对手走位前先手掷出、逼它离开原位"],
        kind: "enemy",
        range: 7.5,
        maxRange: 14,
        prepare: 7,
        active: 40,
        recover: 6,
        cooldown: 32,
        style: "bone",
        defaults: { arc: false, ai: { maxChase: 11, minGap: 1.5 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bonemerang", "throwRange", pokemon), geometry: "line", style: "bone",
                color: 0xEAE0C8, label: config && config.arc === true ? "回旋骨头回力镖" : "骨头回力镖" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bonemerang"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bonemerang", "tempo", context)),
                recover: Math.round(p("bonemerang", "recover", context)),
                cooldown: Math.round(p("bonemerang", "recharge", context)),
                active: skills["bonemerang"].active,
                range: p("bonemerang", "throwRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bonemerang:draw", bonemerangScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", arc: config && config.arc === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const target = action.target();
            const aimPoint = target !== null && world.valid(target) ? world.observe(target)!.position() : action.targetPosition();
            const flat = WorldCombat.point(aimPoint.x() - body.position().x(), 0, aimPoint.z() - body.position().z());
            const forward = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const side = WorldCombat.point(-forward.z(), 0, forward.x());
            const overshoot = p("bonemerang", "overshoot", action);
            const bow = p("bonemerang", "bow", action);
            const hitRadius = p("bonemerang", "hitRadius", action);
            // 去程朝目标前方 `overshoot`、并向侧面摆开 `bow`（弧线配置把摆幅放大）：去程因此偏开中心，
            // 折返再穿过目标当前所在处，形成回力镖的绕行。
            const turnPoint = aimPoint.plus(forward.scale(overshoot)).plus(side.scale(bow));
            const reach = p("bonemerang", "throwRange", action);
            const speed = p("bonemerang", "flight", action);
            const outLimit = Math.max(4, Math.round((flat.length() + overshoot + 2) / Math.max(0.2, speed)) + 2);
            const hand = body.position().plus(WorldCombat.point(forward.x() * 0.4, body.height() * 0.55, forward.z() * 0.4));
            const scale = hitRadius / 0.7;

            WorldBodies.spawn(world, hand, {
                appearance: { item: "minecraft:bone", spin: true, scale: 1, glow: false },
                size: [0.4, 0.4], health: Math.max(6, Math.round(p("bonemerang", "boneHealth", action))),
                gravity: false, pushable: false, invulnerable: false, knockbackResistance: 1.0,
                silent: true, fireImmune: true, glow: false
            }, bonemerangBoneEffect, {
                owner: String(actor.ref()), target: target === null ? "" : String(target.ref()),
                outPower: p("bonemerang", "out", action), backPower: p("bonemerang", "back", action),
                speed: speed, hitRadius: hitRadius, catchRadius: p("bonemerang", "catchRadius", action),
                spin: Math.round(p("bonemerang", "spin", action)), scale: scale,
                turnPoint: [turnPoint.x(), turnPoint.y(), turnPoint.z()],
                bow: bow, turn: 0.7, catch: 1.2, outLimit: outLimit, age: 0,
                phase: "out", phaseMin: 999, phaseHit: false, midDone: false, hits: 0
            }, Math.max(60, Math.round(reach / Math.max(0.2, speed) + 60)));

            sound(action, "minecraft:entity.fishing_bobber.throw");
            WorldFeedback.emit(world, bonemerangScene, 1, hand,
                { moment: "throw", direction: [forward.x(), forward.y(), forward.z()], path: [[hand.x(), hand.y(), hand.z()], [turnPoint.x(), turnPoint.y(), turnPoint.z()]],
                    count: Math.round(p("bonemerang", "spin", action)), scale: scale }, 26);
            done(action);
        }
    });
}
