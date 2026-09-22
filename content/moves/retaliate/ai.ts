/**
 * 报仇 / retaliate 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 9）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`ai.avenge`（默认开）且自己带着哀兵身份时，`selectTarget` 把目标换成记下的那名凶手（如果在附近）；
 *   找不到就照原目标走。`accepts` 只筛阵营、存活与可见。
 * 排序：带哀兵时 priority 抬到 50——那正是翻倍窗口，值得插在普通攻击前；否则按普通近战 14 排序。
 * 够不到怎么办：射程交给 `dash`，共享任务把身位收进冲撞距离后再撞。
 * 放完接什么：交回共享交战计划；命中后哀兵之痛泄掉，没撞上则留着下次再报。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(retaliateId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        selectTarget: function (context, capability, proposed) {
            if (!CompanionBehavior.ai<boolean>(capability, "avenge", true)) return proposed;
            const self = CompanionBehavior.source(context);
            if (!CompanionBehavior.status(context, self, retaliateStatus)) return proposed;
            const grudge = retaliateGrudge(self.ref);
            if (!grudge) return proposed;
            const killer = CompanionBehavior.entity(context, grudge);
            return killer !== null && killer.health > 0 ? killer : proposed;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.status(context, self, retaliateStatus)) return 50;
            return 14;
        }
    });

    addPreferences(retaliateId, {}, [
        field(pathOf("solemn"), "哀兵式", "boolean", {
            help: "开启：冲得更远 ×1.12、翻倍系数 ×1.06，追着凶手打，但基础威力 ×0.92、起手多 3 刻、冷却多 8 刻。关闭：基础 ×1.08、冲得短而干净。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标离自己这么远以内才撞过去；调大愿意主动追击更远的目标。"
        }),
        field(pathOf("ai.avenge"), "追打凶手", "boolean", {
            help: "开启后，带着哀兵时优先撞向记下的那名凶手；关闭则照当前目标出手。"
        })
    ]);
}
