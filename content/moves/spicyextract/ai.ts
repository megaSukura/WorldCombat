/**
 * 辣椒精华 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内。
 * 对谁出手：当前威胁；当目标身边挤着至少 ai.cluster 个敌人时最值得——一片辣雾能同时削掉一小簇人。
 * 够不到怎么办：reach 就是本招射程，伙伴会先走到射程内再甩瓶；accepts 不按距离硬拒。
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

    function spicyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 14);
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
            if (!target || !spicyWants(context, capability, target)) return 0;
            const needed = CompanionBehavior.ai<number>(capability, "cluster", 2);
            return spicyCluster(context, target, 2.4) >= needed ? 65 : 30;
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
