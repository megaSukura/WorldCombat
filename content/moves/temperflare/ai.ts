/**
 * 豁出去 / temperflare 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活、在 `ai.maxChase`（默认 8）格内、且中间有通视线时列入候选；
 *   隔着墙先交给共享接近逻辑找回射界，不会连续撞上同一面墙。够不到交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见；谁当前被盯上就撞给谁。
 * 排序：`ai.punishWhiff`（默认开）打开时，施法者上一次出手打空的那一刻 priority 抬到 54——那正是翻倍窗口，
 *   值得插在普通攻击前；否则按普通近战 15 排序。撞中后炸开一片火，因此身边挤着敌人时也不再额外加分。
 * 够不到怎么办：射程交给 `dash`，共享任务把身位收进冲锋距离后再撞。
 * 放完接什么：交回共享交战计划；撞空也照炸。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:temperflare/whiffed", function (access, actor) {
        return temperWhiffed(access, actor) ? 1 : 0;
    });

    CompanionBehavior.registerUse(temperId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            // 中间隔着墙时先交给共享接近逻辑找回射界，避免连续撞上同一面墙。
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const whiffed = CompanionBehavior.fact<number>(context, "world_combat:temperflare/whiffed", CompanionBehavior.source(context));
            if (CompanionBehavior.ai<boolean>(capability, "punishWhiff", true) && (whiffed || 0) > 0) return 54;
            return 15;
        }
    });

    addPreferences(temperId, {}, [
        field(pathOf("reckless"), "豁出去", "boolean", {
            help: "开启：冲得更远 ×1.15、更快 ×1.08、火炸得更大 ×1.2，追得上逃跑的目标，但这一撞略散 ×0.95、收招多 3 刻、冷却多 8 刻。关闭：冲得短而集中、收得干净。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标离自己这么远以内才冲过去；调大愿意主动追击更远的目标。"
        }),
        field(pathOf("ai.punishWhiff"), "失手后优先", "boolean", {
            help: "开启后，上一次出手打空的那一刻优先撞出翻倍的一下；关闭则按普通近战排序。"
        })
    ]);
}
