/**
 * 滚动 / rollout 的出手方式。
 *
 * 核心念头：把自己缩成一颗只会越滚越重的石球——一趟一趟真实地滚进目标，每滚中一趟，下一趟就重一倍；
 * 中途撞墙、落空或换用别的招式，石头就散成一地碎石，重新从最轻的一趟开始。
 * 它的身份是「接住」：玩家要做的是别停、别换招，并在把人顶开之后重新贴上；对手的读法是拉开距离、绕墙或打断。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体蜷成石球，脚边碎石向里聚拢；层数越高聚得越密（`stage` 进载荷）。
 *   滚（execute，提交后）：逐刻沿当前瞄准滚行 `step` 格，每刻最多朝瞄准转 `turn` 度（重滚更少，惯性更大），
 *       直到真实首碰或滚满 `reach`。判定、表现与前沿使用同一个身体位置与方向：`sweepStep` 用原生身体扫过，
 *       第一处实体接触才结算一段 `roll`——真实撞中且命中率通过时把人顶开 `push` 格、从真实碰撞点弹回 `recoil` 格；
 *       撞到实墙就收束，什么都没碰到就是空滚。命中即把连滚层数抬一级（`roll` 下一趟按 2^层数 变重）并续上
 *       `window` 的窗口；撞墙/落空/擦偏则当场清空层数；接满 `chain` 趟就自然收束，余势散尽。
 *
 * 与同族分开：冰球是**一次出手内**发射、会追踪回头的冰弹；铁滚轮要吃掉脚下场地且只碾一趟；
 *   滚动是唯一**跨出手逐趟变重**、真实滚行有惯性、靠把人顶开来逼你重新贴上的石球。连斩也跨出手，但它翻的是刀数，滚动翻的是单趟威力。
 */
namespace PokemonSkills {
    /** 当刻自由瞄准：按住技能键时读控制点（逐刻可转向），AI 或未声明的输入回退到动作选点。 */
    function rolloutAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        try { return action.targetPosition(); } catch (error) { }
        return action.origin().plus(action.direction().scale(2));
    }
    /** 每刻把滚动方向朝瞄准方向转，最多 `degrees` 度；这就是石球的惯性，不能瞬间拐回。 */
    function rolloutTurn(from: CombatPoint, to: CombatPoint, degrees: number): CombatPoint {
        const a = WorldCombat.point(from.x(), 0, from.z());
        const b = WorldCombat.point(to.x(), 0, to.z());
        if (a.length() < 1e-6) return b.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : b.unit();
        if (b.length() < 1e-6) return a.unit();
        const unitA = a.unit(), unitB = b.unit();
        const dot = Math.max(-1, Math.min(1, unitA.x() * unitB.x() + unitA.z() * unitB.z()));
        const angle = Math.acos(dot) * 180 / Math.PI;
        if (angle <= 1e-3 || angle <= degrees) return unitB;
        const amount = Math.max(0, Math.min(1, degrees / angle));
        return unitA.scale(1 - amount).plus(unitB.scale(amount)).unit();
    }
    /** 起滚方向：优先当刻瞄准，其次动作选点；都没有就沿原方向。 */
    function rolloutHeading(action: CombatAction, origin: CombatPoint): CombatPoint {
        const delta = rolloutAim(action).minus(origin);
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        if (flat.length() > 0.05) return flat.unit();
        const direction = action.direction();
        const fallback = WorldCombat.point(direction.x(), 0, direction.z());
        return fallback.length() > 1e-6 ? fallback.unit() : WorldCombat.point(0, 0, 1);
    }

    define({
        freeMovement: true,
        id: rolloutId,
        cooldownParameter: "recharge",
        name: "Rollout",
        description: "一趟接一趟地缩成石球滚进目标：石球有惯性，只能缓慢朝瞄准转向；每真实撞中一趟，下一趟就更重（最多 5 趟），撞中还会把人顶开，所以想接着滚就得重新贴上。撞墙、擦偏或换用任何别的招式都会把层数清空。",
        uses: ["一趟一趟地滚进目标身上", "每真实撞中一趟，下一趟翻倍变重", "石球惯性大，只能缓慢转向；撞墙或落空就散架清层"],
        kind: "aim",
        range: 3.4,
        maxRange: 5.2,
        prepare: 6,
        active: 0,
        recover: 5,
        cooldown: 34,
        maximumTicks: 200,
        style: "charge",
        defaults: { heavy: false, ai: { maxChase: 6, pressOn: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(rolloutId, "reach", pokemon), geometry: "line", style: "charge", color: 0xB2A183,
                label: config && config.heavy === true ? "重滚" : "滚动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[rolloutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(rolloutId, "tempo", context)),
                recover: Math.round(p(rolloutId, "recover", context)),
                cooldown: Math.round(p(rolloutId, "recharge", context)),
                active: skills[rolloutId].active,
                range: p(rolloutId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const stage = rolloutStage(action.sense(), action.actor());
            action.present("world_combat:move_rollout:charge", rolloutScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", stage: stage, heavy: config && config.heavy === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const reach = p(rolloutId, "reach", action);
            const radius = p(rolloutId, "radius", action);
            const power = p(rolloutId, "roll", action);
            const push = p(rolloutId, "push", action);
            const recoil = p(rolloutId, "recoil", action);
            const accuracy = p(rolloutId, "accuracy", action);
            const step = Math.max(0.15, p(rolloutId, "step", action));
            const turn = Math.max(1, p(rolloutId, "turn", action));
            const chain = Math.max(3, Math.round(p(rolloutId, "chain", action)));
            const windowTicks = Math.max(20, Math.round(p(rolloutId, "window", action)));
            const grains = Math.max(6, Math.round(p(rolloutId, "grains", action)));
            const stage = rolloutStage(world, actor);
            const intensity = Math.max(0.6, Math.min(2.6, power / 12));
            const scale = Math.max(0.7, Math.min(2.2, (radius + stage * 0.08) / rolloutReference));
            const up = WorldCombat.point(0, 1.1, 0);
            const scenes = WorldFeedback.actionScenes(rolloutScene);
            let direction = rolloutHeading(action, self.position());
            let travelled = 0;
            let settled = false;

            function finishRoll(current: CombatAction, landed: boolean): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                scenes.stop(current, "roll");
                const body = scope.observe(actor);
                const where = body !== null ? body.position() : current.origin();
                const held = MobEffects.read(scope, actor, rolloutMomentum);
                if (landed) {
                    const next = stage + 1;
                    if (held !== null) scope.removeMobEffect(actor, held.id(), held.key());
                    if (next >= chain) {
                        WorldFeedback.emit(scope, rolloutScene, 1, where, { moment: "cap", stage: next, chain: chain, scale: 1.8, intensity: intensity }, 26);
                        WorldFeedback.text(scope, where.plus(up), rolloutCapText, [chain], 28);
                        sound(current, "minecraft:entity.generic.big_fall");
                    } else {
                        MobEffects.apply(scope, actor, rolloutMomentum, windowTicks, next);
                        WorldFeedback.emit(scope, rolloutScene, 1, where,
                            { moment: "rise", stage: next, power: Math.round(power * 10) / 10, grains: grains, scale: 0.7 + next * 0.3 }, 24);
                        WorldFeedback.text(scope, where.plus(up), rolloutRiseText, [next], 26);
                        sound(current, "minecraft:entity.player.attack.strong");
                    }
                } else if (held !== null && scope.removeMobEffect(actor, held.id(), held.key())) {
                    WorldFeedback.emit(scope, rolloutScene, 1, where, { moment: "drop" }, 22);
                }
                scenes.finish(current, done);
            }

            function stopEmpty(current: CombatAction, origin: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, rolloutScene, 1, origin.plus(direction.scale(radius + 0.4)),
                    { moment: "whiff", stage: stage, scale: scale }, 20);
                WorldFeedback.text(scope, origin.plus(up), rolloutMissText, [], 24);
                sound(current, "minecraft:block.stone.break");
                finishRoll(current, false);
            }

            function roll(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finishRoll(current, false); return; }
                direction = rolloutTurn(direction, rolloutAim(current).minus(body.position()), turn);
                const origin = body.position();
                const leg = Math.min(step, Math.max(0, reach - travelled));
                if (leg <= 0.001) { stopEmpty(current, origin); return; }
                scenes.show(current, "roll", origin, { moment: "roll", stage: stage, scale: scale, intensity: intensity,
                    grains: grains, travelled: travelled, turn: turn, rim: 0.16 + stage * 0.07,
                    direction: [direction.x(), direction.y(), direction.z()] });
                const swept = sweepStep(current, direction.scale(leg), radius), hit = swept.hit;
                let progressed = swept.moved;

                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const hostile = victim !== null && scope.valid(victim) && !scope.friendly(victim);
                    if (hostile && scope.random() < accuracy) {
                        const landed = hurt(current, victim, rolloutId, power, { damage: damageSpec(rolloutId, "roll"), contact: true });
                        if (landed) {
                            if (scope.valid(victim)) scope.hitDisplace(victim, direction.scale(push));
                            WorldFeedback.emit(scope, rolloutScene, 1, hit.position(),
                                { moment: "hit", stage: stage, power: Math.round(power * 10) / 10, grains: grains, scale: scale, intensity: intensity }, 24);
                            WorldFeedback.text(scope, hit.position().plus(up), rolloutHitText, [Math.round(power)], 26);
                            sound(current, "cobblemon:impact.rock");
                            const back = Math.min(recoil, travelled + progressed);
                            if (back > 0.05) scope.displace(actor, direction.scale(-back));
                            finishRoll(current, true);
                            return;
                        }
                    }
                    if (hostile) { finishRoll(current, false); return; }
                    // 非敌对实体只是挡了一下，滚过它继续走，不算命中也不断链。
                    if (swept.remaining.length() > 0.001) progressed += scope.displace(actor, swept.remaining);
                }
                travelled += progressed;
                if (hit.blocked()) {
                    const wall = hit.blockPosition();
                    const at = wall !== null ? wall : hit.position();
                    WorldFeedback.emit(scope, rolloutScene, 1, at,
                        { moment: "wall", stage: stage, scale: scale, face: hit.blockFace() }, 22);
                    sound(current, "minecraft:block.stone.hit");
                    finishRoll(current, false);
                    return;
                }
                if (travelled >= reach - 1e-4) { stopEmpty(current, origin.plus(direction.scale(progressed))); return; }
                if (!hit.hitEntity() && progressed <= 1e-4) { stopEmpty(current, origin); return; }
                current.after(1, roll);
            }

            sound(action, "minecraft:block.stone.hit");
            roll(action);
        }
    });

    // 玩家按住技能键持续滚动、滚行中缓慢转向瞄准；AI 提交仍带一个目标，读同一条控制输入。
    WorldCombat.preview("world_combat:rollout", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
