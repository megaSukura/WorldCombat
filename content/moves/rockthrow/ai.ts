/**
 * 落石 / rockthrow 的伙伴 AI 用途。
 *
 * 什么局面下出手：敌对、存活且在 ai.maxChase 内；平击要求可见，高抛可向已有攻击关系的低墙后目标投石。
 *   它是便宜、回得快的随手一记，偏好中近距离的稳定点射。
 * 对谁出手：`ai.finish`（默认关）打开时，残血目标多一档分，用这一记收尾；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近。石头不追踪，目标若在飞行中走位会被让开，这是设计的一部分。
 * 放完之后：一记就收势，交回共享交战计划，等很短的冷却再扔下一块。
 */
namespace PokemonSkills {
    function rockthrowLob(item: WorldBehavior.Capability): boolean { return item.data.config && item.data.config.lob === true; }

    /** 按本招现有原生弹道逐刻检查方块；只读预测不替代真正飞行时的碰撞。 */
    function rockthrowArcClear(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const key = "rockthrow:arc:" + item.id + ":" + target.point.join(",");
        if (context.scratch[key] !== undefined) return context.scratch[key];
        const world = CompanionBehavior.world(context), origin = CompanionBehavior.point(CompanionBehavior.source(context).point);
        const point = CompanionBehavior.point(target.point), delta = point.minus(origin);
        if (delta.length() > item.data.range) return context.scratch[key] = false;
        const facts: FactContext = { world: world, actor: world.source(), detail: { values: item.data.config } };
        const speed = Math.max(0.4, p("rockthrow", "velocity", facts)), gravity = Math.max(0, p("rockthrow", "arc", facts));
        const direction = LivingActions.ballistic(origin, point, speed, gravity);
        const horizontal = WorldCombat.point(delta.x(), 0, delta.z()), span = horizontal.length();
        if (direction === null || span < 0.01) return context.scratch[key] = false;
        const forward = horizontal.unit(), maxTicks = Math.max(24, Math.round((delta.length() + 3) / Math.max(0.3, speed)) + 24);
        const maxDistance = Math.max(item.data.range, delta.length() + 3);
        let at = origin, velocity = direction.scale(speed), travelled = 0;
        for (let tick = 0; tick < maxTicks && travelled <= maxDistance; tick++) {
            const next = at.plus(velocity), before = at.minus(origin), after = next.minus(origin);
            const start = before.x() * forward.x() + before.z() * forward.z();
            const end = after.x() * forward.x() + after.z() * forward.z();
            const arrived = end >= span, fraction = arrived ? (span - start) / Math.max(0.0001, end - start) : 1;
            const to = at.plus(velocity.scale(fraction)), clip = world.clipBlocks(at, to);
            if (clip === null || clip.blocked()) return context.scratch[key] = false;
            if (arrived) return context.scratch[key] = true;
            travelled += velocity.length(); at = next;
            velocity = velocity.scale(0.99).plus(WorldCombat.point(0, -gravity, 0));
        }
        return context.scratch[key] = false;
    }

    function rockthrowPoint(target: CompanionBehavior.Entity): CompanionBehavior.Entity {
        const choice = JSON.parse(JSON.stringify(target)); choice.ref = ""; return choice;
    }

    function rockthrowWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || target.hidden && !target.revealed || !target.visible && !rockthrowLob(capability)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    CompanionBehavior.registerUse("rockthrow", {
        protocols: ["world_combat:attack", "world_combat:ranged", "world_combat:rockthrow-lob"],
        target: function (_context, item, target) { return rockthrowLob(item) ? rockthrowPoint(target) : target; },
        approachTarget: function (context, item, target) {
            return rockthrowLob(item) ? rockthrowArcClear(context, item, target) ? CompanionBehavior.source(context) : rockthrowPoint(target) : target;
        },
        approach: function (context, item, target) {
            if (rockthrowLob(item) && target.ref !== CompanionBehavior.source(context).ref) return target.point;
        },
        execute: function (context, item, target) {
            if (rockthrowLob(item) && !rockthrowArcClear(context, item, target)) return false;
            return (context.services.behavior as WorldMethods.Host).use(item, target);
        },
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rockthrowWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return rockthrowWants(context, capability, target);
        },
        priority: function (context, capability, target) {
            if (!target || !rockthrowWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 15;
            if (distance <= capability.data.range) score += 5;
            if (distance <= 5) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.4) score += 8;
            return score;
        }
    });

    // 常规 threat 只提出可见敌人；本招另提已有攻击关系且原地弧线可达的遮挡目标。
    CompanionBehavior.registry.goal({ id: "world_combat:rockthrow/lob", propose: function (context) {
        if (!context.capabilities.some(function (item) { return item.protocols.indexOf("world_combat:rockthrow-lob") >= 0 && rockthrowLob(item); })) return [];
        const self = CompanionBehavior.source(context), nearby = ((context.facts.nearby || []) as CompanionBehavior.Entity[]).slice();
        const refs = [self.attacking || "", String(context.facts.focus || "")];
        if (self.hurtAgo < 100 && self.lastAttacker) refs.push(self.lastAttacker);
        refs.forEach(function (ref) {
            if (!ref || nearby.some(function (other) { return other.ref === ref; })) return;
            const known = WorldMethods.observeKnown(context, ref);
            if (known) nearby.push(known);
        });
        for (let i = 0; i < nearby.length; i++) {
            const target = nearby[i];
            if (target.visible || target.hidden && !target.revealed) continue;
            const known = target.ref === self.attacking || target.ref === context.facts.focus || target.attacking === self.ref
                || self.hurtAgo < 100 && self.lastAttacker === target.ref;
            if (!known) continue;
            const ready = CompanionBehavior.ready(context, "world_combat:rockthrow-lob", target);
            if (ready.some(function (item) { return rockthrowLob(item) && rockthrowWants(context, item, target) && rockthrowArcClear(context, item, target); }))
                return [{ id: "lob:" + target.ref, kind: "world_combat:rockthrow/lob", data: { ref: target.ref } }];
        }
        return [];
    } });
    CompanionBehavior.abilityMethod({ id: "world_combat:rockthrow/lob", protocol: "world_combat:rockthrow-lob", purpose: "attack",
        matches: function (_context, goal) { return goal.kind === "world_combat:rockthrow/lob"; }, target: WorldMethods.goalSubject });
    CompanionBehavior.orderGoals("world_combat:rockthrow/lob", function (_context, order) {
        const index = order.indexOf("world_combat:defend"), beforeCommand = order.indexOf("world_combat:command");
        order.splice(index >= 0 ? index : beforeCommand >= 0 ? beforeCommand : order.length, 0, "world_combat:rockthrow/lob");
    });

    addPreferences("rockthrow", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动扔石，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一记收尾；关闭则所有目标同价。"
        })
    ]);
}
