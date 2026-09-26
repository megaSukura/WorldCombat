/**
 * 珍藏 / lastresort 的伙伴 AI 用途。
 *
 * 什么局面下出手：只有账本攒满（其他已实装的招都出过一次）才进入候选——解锁前 `available` 直接 false，
 *   伙伴会照常去打别的招，把招式表走一遍，而不是为凑账乱刷同一招。目标可见、敌对、存活且在
 *   `ai.maxChase`（默认 9）格内。
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
