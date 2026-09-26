/**
 * 跺脚 / stompingtantrum 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 7）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见；谁当前被盯上就跺给谁。裂缝是朝目标的一条线，路上站着的旁人一起挨。
 * 排序：`ai.punishWhiff`（默认开）打开时，施法者上一次出手打空的那一刻 priority 抬到 52——那正是翻倍窗口，
 *   值得插在普通近战前；否则按普通近战 16 排序。
 * 够不到怎么办：射程交给 `fissure`，共享任务把身位收进裂缝长度后再跺。
 * 放完接什么：交回共享交战计划；跺完地面留痕，下一次交手可能就在那道缝上。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:stompingtantrum/whiffed", function (access, actor) {
        return stompWhiffed(access, actor) ? 1 : 0;
    });

    CompanionBehavior.registerUse(stompId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const whiffed = CompanionBehavior.fact<number>(context, "world_combat:stompingtantrum/whiffed", CompanionBehavior.source(context));
            if (CompanionBehavior.ai<boolean>(capability, "punishWhiff", true) && (whiffed || 0) > 0) return 52;
            return 16;
        }
    });

    addPreferences(stompId, {}, [
        field(pathOf("deep"), "深跺", "boolean", {
            help: "开启：裂缝更宽 ×1.25、上抛 ×1.15、浮尘停留更久，封住一条路，但威力 ×0.92、裂缝略短 ×0.95、起手多 3 刻、冷却多 8 刻。关闭：窄而快、单次更疼。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标离自己这么远以内才跺过去；调大愿意主动靠近更远的目标。"
        }),
        field(pathOf("ai.punishWhiff"), "失手后优先", "boolean", {
            help: "开启后，上一次出手打空的那一刻优先跺出翻倍的一脚；关闭则按普通近战排序。"
        })
    ]);
}
