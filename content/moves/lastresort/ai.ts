/**
 * 珍藏 / lastresort 的伙伴 AI 用途。
 *
 * 什么局面下出手：只有账本攒满（当前表里其他已实装的招这一轮都出过一次）才进入候选——解锁前 `available` 直接 false。
 *   同时另挂一份"补账"目标：账本还差、且缺的那一招此刻真的可用时，主动先把它排在其他交战之前，先规划缺少的招
 *   而不是干等解锁；缺招不可用时照常交给共用交战计划。目标可见、敌对、存活且在 `ai.maxChase`（默认 9）格内。
 * 对谁出手：当前威胁；自己伤得越重，排序越靠前，因为这一记的威力随已损失生命上涨，正是翻盘的时机。
 * 长起手：本招直冲且起手全组最慢。`ai.steady`（默认开启）让伙伴对高速横移、且还没贴身的敌人先不掏，
 *   免得一头撞空；关闭则只要有目标就兑现，出手机会更多但更容易被侧身让开。
 * 够不到怎么办：射程由 `dash` 决定，共享任务把身位收进冲撞距离后再掏。
 * 放完之后：账本清空，交回共享交战计划，重新开始攒下一轮。
 */
namespace PokemonSkills {
    function lastresortActor(context: WorldBehavior.Context): CombatActor | null {
        const world = CompanionBehavior.world(context);
        return world.actor(CompanionBehavior.source(context).ref);
    }

    /** 目标垂直于「自己→目标」方向的速度分量（格/刻）；用来判断高速横移。 */
    function lastresortDrift(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), velocity = CompanionBehavior.velocity(context, target);
        if (!velocity || velocity.length < 2) return 0;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
        return Math.abs(velocity[0] * (dz / length) - velocity[2] * (dx / length));
    }

    function lastresortWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const world = CompanionBehavior.world(context), actor = lastresortActor(context);
        if (actor === null || !lastresortUnlocked(world, actor)) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
        if (distance > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        // 长起手直冲：高速横移且没贴近时先不兑现，交给共享计划用其他招。
        if (CompanionBehavior.ai<boolean>(item, "steady", true) && distance > 2.5
            && lastresortDrift(context, target) > 0.28) return false;
        return true;
    }

    CompanionBehavior.registerUse(lastresortId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const actor = lastresortActor(context);
            if (actor === null || !lastresortUnlocked(CompanionBehavior.world(context), actor)) return false;
            return !target || lastresortWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !lastresortWants(context, capability, target)) return 0;
            const ratio = Math.max(0, Math.min(1, 1 - CompanionBehavior.ratio(CompanionBehavior.source(context))));
            return Math.min(100, Math.round(82 + ratio * 16));
        }
    });

    /** 当前装备表里还没提交的第一招（已实装）；只有带着珍藏的个体才有这一轮。 */
    function lastresortFillMove(world: CombatWorld, actor: CombatActor): string {
        if (!lastresortKnown(world, actor)) return "";
        const ledger = lastresortLedger(world, actor);
        return !ledger.unlocked && ledger.total > 0 && ledger.missing.length > 0 ? ledger.missing[0] : "";
    }
    /** 缺的这招此刻真的能对该威胁用出来才去规划它，免得反复尝试失败占住决策。 */
    function lastresortFillCapability(context: WorldBehavior.Context, world: CombatWorld, actor: CombatActor): WorldBehavior.Capability | null {
        const missing = lastresortFillMove(world, actor);
        if (!missing) return null;
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"] || null;
        if (!threat) return null;
        for (let i = 0; i < context.capabilities.length; i++) {
            const item = context.capabilities[i];
            if (item.data.move !== missing) continue;
            for (let p = 0; p < item.protocols.length; p++)
                if (CompanionBehavior.ready(context, item.protocols[p], threat).some(function (entry) { return entry.id === item.id; })) return item;
            return null;
        }
        return null;
    }

    // 先规划缺少的招：账本还差且那一招此刻可用时，把它排在其他交战之前，主动走完整轮而不是干等解锁。
    CompanionBehavior.registry.goal({ id: "world_combat:move_lastresort/fill", propose: function (context) {
        const world = CompanionBehavior.world(context), actor = lastresortActor(context);
        if (actor === null) return [];
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"] || null;
        if (!threat) return [];
        const item = lastresortFillCapability(context, world, actor);
        if (!item) return [];
        return [{ id: "fill:" + item.data.move, kind: "world_combat:move_lastresort_fill", data: { ref: threat.ref, move: item.data.move } }];
    } });
    CompanionBehavior.registry.method({ id: "world_combat:move_lastresort/fill", propose: function (context, goal) {
        if (goal.kind !== "world_combat:move_lastresort_fill") return [];
        const world = CompanionBehavior.world(context), actor = lastresortActor(context);
        if (actor === null) return [];
        const item = lastresortFillCapability(context, world, actor);
        if (!item || item.data.move !== goal.data.move) return [];
        return [{ id: item.id, data: {}, capabilities: [item] }];
    }, create: function (_context, choice) {
        const item = choice.offer.capabilities![0];
        const purpose = item.protocols && item.protocols.length ? item.protocols[0] : "world_combat:attack";
        return CompanionBehavior.castNode(item.id, purpose, CompanionBehavior.goalEntity);
    } });
    CompanionBehavior.orderGoals("world_combat:move_lastresort/priority", function (context, order) {
        const world = CompanionBehavior.world(context), actor = lastresortActor(context);
        if (actor === null || !lastresortFillMove(world, actor)) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_lastresort_fill");
    });

    addPreferences(lastresortId, {}, [
        field(pathOf("desperation"), "背水式", "boolean", {
            help: "开启：压上全部身家（威力 ×1.12、冲得更远 ×1.1），但起手慢 3 刻、收招多 3 刻、冷却多 8 刻，掏得越狠破绽越大。关闭：收势利落，冷却更短，适合稳妥地兑现。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才掏珍藏；本招冲撞距离中等，调大愿意更早兑现，调小则只在贴身决胜时掏。"
        }),
        field(pathOf("ai.steady"), "避开横移", "boolean", {
            help: "开启：目标高速横移又没贴到 2.5 格内时先不掏，改由其他招应付——长起手直冲容易被侧身让开。关闭：只要在出手距离内就兑现，机会更多但也更容易撞空。"
        })
    ]);
}
