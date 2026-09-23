/**
 * 滚动 / rollout 的出手方式。
 *
 * 核心念头：把自己缩成一颗只会越滚越重的石球——一趟一趟撞进去，每中一趟，下一趟就重一倍；
 * 中途落空或换用别的招式，石头就散成一地碎石，重新从最轻的一趟开始。
 * 它的身份是「接住」：玩家要做的是别停、别换招，并在把人顶开之后重新贴上；对手的读法是拉开距离或打断。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体蜷成石球，脚边碎石向里聚拢；层数越高聚得越密（`stage` 进载荷）。
 *   滚（execute，提交后）：朝目标垫前 `lunge` 格，沿身前一条与判定同顶点的短走廊滚过去——走廊里的
 *       非友方各吃一记 `roll` 接触撞击，首个目标被顶开 `push` 格，石球弹回 `recoil` 格。
 *       命中即把连滚层数抬一级（`roll` 下一趟按 2^层数 变重），并续上 `window` 的连滚窗口；
 *       落空则当场清空层数；接满 `chain` 趟就自然收束，余势散尽。
 *
 * 与同族分开：冰球是**一次出手内**发射、会追踪回头的冰弹；铁滚轮要吃掉脚下场地且只碾一趟；
 *   滚动是唯一**跨出手逐趟变重**、靠把人顶开来逼你重新贴上的石球。连斩也跨出手，但它翻的是刀数，滚动翻的是单趟威力。
 */
namespace PokemonSkills {
    /** 一趟滚击扫过的走廊四个角：origin 起、朝 direction 长 length、半宽 half；判定与表现共用。 */
    function rolloutLane(origin: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(length));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: rolloutId,
        cooldownParameter: "recharge",
        name: "Rollout",
        description: "The user continually rolls into the target over five turns. This attack becomes more powerful each time it hits.",
        uses: ["一趟一趟地滚进目标身上", "每命中一趟，下一趟翻倍变重", "落空或换招就把层数清空"],
        kind: "enemy",
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
            const target = action.target();
            if (self === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const reach = p(rolloutId, "reach", action);
            const radius = p(rolloutId, "radius", action);
            const lunge = p(rolloutId, "lunge", action);
            const power = p(rolloutId, "roll", action);
            const push = p(rolloutId, "push", action);
            const recoil = p(rolloutId, "recoil", action);
            const accuracy = p(rolloutId, "accuracy", action);
            const chain = Math.max(3, Math.round(p(rolloutId, "chain", action)));
            const windowTicks = Math.max(20, Math.round(p(rolloutId, "window", action)));
            const grains = Math.max(6, Math.round(p(rolloutId, "grains", action)));
            const stage = rolloutStage(world, actor);
            const intensity = Math.max(0.6, Math.min(2.6, power / 12));
            const scale = Math.max(0.7, Math.min(2.2, (radius + stage * 0.08) / rolloutReference));
            const up = WorldCombat.point(0, 1.1, 0);

            const victim = world.observe(target);
            const start = self.position();
            let direction = victim !== null
                ? WorldCombat.point(victim.position().x() - start.x(), 0, victim.position().z() - start.z())
                : action.direction();
            if (direction.length() < 0.05) direction = WorldCombat.point(0, 0, 1);
            direction = direction.unit();
            const distance = victim !== null ? victim.position().minus(start).length() : 0;

            // 垫前一步：最多贴到判定边缘，避免冲过头。
            const forward = Math.min(lunge, Math.max(0, distance - radius - 0.25));
            if (forward > 0.05) world.displace(actor, direction.scale(forward));
            const moved = world.observe(actor);
            const origin = moved !== null ? moved.position() : start;
            const lane = Math.max(radius + 0.35, forward + radius + 0.4);
            if (victim !== null) action.face(victim.position(), 18, 18);

            WorldFeedback.emit(world, rolloutScene, 1, origin,
                { moment: "roll", stage: stage, power: Math.round(power * 10) / 10, path: rolloutLane(origin, direction, lane, radius),
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity, grains: grains }, 20);
            sound(action, "minecraft:block.stone.hit");

            let landed = false;
            let hitPoint: any = null;
            if (world.random() < accuracy) {
                WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, lane, radius, { below: 1.2, above: 2.2 }),
                    function (victimActor, facts) {
                        if (landed) return;
                        if (hurt(action, victimActor, rolloutId, power, { damage: damageSpec(rolloutId, "roll"), contact: true })) {
                            landed = true;
                            hitPoint = facts.position();
                            if (world.valid(victimActor)) world.displace(victimActor, WorldCombat.point(direction.x(), 0, direction.z()).scale(push));
                        }
                    });
            }

            const landedAt: CombatPoint = hitPoint;
            if (landed) {
                WorldFeedback.emit(world, rolloutScene, 1, landedAt,
                    { moment: "hit", target: targetRef, stage: stage, power: Math.round(power * 10) / 10, grains: grains, scale: scale, intensity: intensity }, 24);
                WorldFeedback.text(world, landedAt.plus(up), rolloutHitText, [Math.round(power)], 26);
                sound(action, "cobblemon:impact.rock");
                if (recoil > 0.05) world.displace(actor, direction.scale(-Math.min(recoil, forward + 0.2)));
            } else {
                WorldFeedback.emit(world, rolloutScene, 1, origin.plus(direction.scale(radius + 0.5)),
                    { moment: "whiff", stage: stage, scale: scale }, 20);
                WorldFeedback.text(world, origin.plus(up), rolloutMissText, [], 24);
                sound(action, "minecraft:block.stone.break");
            }

            const settled = world.observe(actor);
            const where = settled !== null ? settled.position() : origin;
            const held = MobEffects.read(world, actor, rolloutMomentum);
            if (landed) {
                const next = stage + 1;
                if (held !== null) world.removeMobEffect(actor, held.id(), held.key());
                if (next >= chain) {
                    WorldFeedback.emit(world, rolloutScene, 1, where, { moment: "cap", stage: next, chain: chain, scale: 1.8, intensity: intensity }, 26);
                    WorldFeedback.text(world, where.plus(up), rolloutCapText, [chain], 28);
                    sound(action, "minecraft:entity.generic.big_fall");
                } else {
                    MobEffects.apply(world, actor, rolloutMomentum, windowTicks, next);
                    WorldFeedback.emit(world, rolloutScene, 1, where,
                        { moment: "rise", stage: next, power: Math.round(power * 10) / 10, grains: grains, scale: 0.7 + next * 0.3 }, 24);
                    WorldFeedback.text(world, where.plus(up), rolloutRiseText, [next], 26);
                    sound(action, "minecraft:entity.player.attack.strong");
                }
            } else if (held !== null && world.removeMobEffect(actor, held.id(), held.key())) {
                WorldFeedback.emit(world, rolloutScene, 1, where, { moment: "drop" }, 22);
            }
            done(action);
        }
    });
}
