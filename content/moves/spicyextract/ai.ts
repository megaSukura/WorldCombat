/**
 * 辣椒精华 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内。point 自由落点，够不到就先走近再甩。
 * 对谁出手：当前威胁；目标身边挤着至少 ai.cluster 个敌人时最值得——一片辣雾能同时削掉一小簇人。
 *            有己方队友正围着目标（能立刻吃这口降防、集火）时再加一档。
 * 什么时候收手：己方血量已经很低、而目标是一个高攻 Boss（一拳可能带走我们、体量远大于自己）时降低优先，
 *            不把全队的防线交给它去反打。
 * 放完之后：被辣到的敌人攻高防低，伙伴交回共享顺序，让队友（或其他招）去收这个窗口。
 */
namespace PokemonSkills {
    function spicyCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    /** 已经有队友围着目标：这口降防马上有人能兑现。 */
    function spicyFocus(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function spicyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    function spicyPriority(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const needed = CompanionBehavior.ai<number>(capability, "cluster", 2);
        let score = spicyCluster(context, target, 2.4) >= needed ? 65 : 30;
        if (spicyFocus(context, target, 8) > 0) score += 10;
        const self = CompanionBehavior.source(context);
        const facts = CompanionBehavior.combatStats(context, target), stats = facts && facts.stats;
        const attack = stats && isFinite(Number(stats.atk)) ? Number(stats.atk) : 0;
        if (attack > self.health && target.maximum > self.maximum * 1.5) score -= 25;
        return Math.max(0, score);
    }

    CompanionBehavior.registerUse("spicyextract", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (!target) return true;
            return spicyWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            return target && spicyWants(context, capability, target) ? spicyPriority(context, capability, target) : 0;
        }
    });

    addPreferences("spicyextract", {}, [
        field(pathOf("mix"), "喷雾浓度", "choice", {
            options: [
                { value: 0, label: "原液浓缩：射程 6 格，半径小，攻 +3／防 −3" },
                { value: 1, label: "稀释喷洒：射程 12 格，半径大，攻 +1／防 −1" }
            ],
            help: "浓缩贴脸把一只目标砸成玻璃炮，窗口最深但自己也更危险；稀释站远一点、一次铺开一小簇，但每一口都更淡。"
        }),
        field(pathOf("ai.maxChase"), "甩瓶距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑甩瓶；越大越早出手。"
        }),
        field(pathOf("ai.cluster"), "簇优先人数", "number", {
            min: 1, max: 4, step: 1,
            help: "目标身边至少挤着这么多敌人时，优先把这一瓶甩出去；调 1 表示看得见就扔。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去甩瓶。"
        })
    ]);
}
