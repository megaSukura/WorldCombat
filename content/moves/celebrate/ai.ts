/**
 * 庆祝 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：身边至少 `ai.minAllies`（默认 2，含自己）个友方，且自己还没有在庆祝中；
 *   有威胁时要求它在 `ai.maxChase`（默认 14）以内；没有威胁时只在整备命令（驻守／自主／工作）下自己开一场。
 * 对谁出手：自己；庆祝以自身为中心，不需要走近谁，队友是顺手被感染的。
 * 候选之间怎么排：满足条件时 priority 100 起（人越多越高，最多 +30），越过共享交战次序先开一场——
 *   它便宜、只花一点 PP，值得在开团前先铺一圈。
 * 放完之后：一圈友方（含自己）带上「庆祝中」；这份欢喜还在时不再重复开。
 * 配置 vigor（慰劳）：切换「助兴（速度 +1）」与「慰劳（当场回复）」两种表达。
 */
namespace PokemonSkills {
    /** 半径内包含自己在内的友方数量。 */
    function celebrateAllies(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), radius = item.data.range, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(celebrateId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "celebrate")) return false;
            if (celebrateAllies(context, item) < CompanionBehavior.ai<number>(item, "minAllies", 2)) return false;
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!threat)
                return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(item, "maxChase", 14);
        },
        accepts: function (context, _item, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, item, target) {
            if (!target || target.ref !== CompanionBehavior.source(context).ref) return 0;
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!threat) return 0;
            return 100 + Math.min(30, (celebrateAllies(context, item) - 1) * 8);
        }
    });

    addPreferences(celebrateId, { vigor: false, ai: { maxChase: 14, minAllies: 2, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "庆祝距离", "number", { min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑开庆祝；越大越早开，也越可能被反打。" }),
        field(pathOf("ai.minAllies"), "最少同庆", "number", { min: 1, max: 6, step: 1,
            help: "身边至少这么多友方（含自己）才值得庆祝；调 1 一个人也开，调大只在人多时铺场。" }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去给队友办庆祝。" })
    ]);
}
