/**
 * 恶意追击 / assurance 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 10）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`ai.pounce`（默认开）打开时，最近 4.5 秒内受过伤、或已经掉到六成血以下的目标会被优先追击
 *   （那正是翻倍的窗口）；否则按普通近战排序。
 * 放完接什么：交回共享交战计划；它是一记补刀追击，不主动缠斗。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(assuranceId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "pounce", true)
                && (typeof target.hurtAgo === "number" && target.hurtAgo <= 90
                    || typeof target.maximum === "number" && target.health < target.maximum * 0.6)) return 52;
            return 16;
        }
    });

    addPreferences(assuranceId, {}, [
        field(pathOf("relentless"), "穷追", "boolean", {
            help: "开启：追击窗口多 0.6 秒、追得更远 ×1.08，缠住带伤目标；但本击 ×0.90、冷却多 5 刻。关闭：本击 ×1.06，一记了结。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标离自己这么远以内才追过去；调大愿意主动扑向更远的残血目标。"
        }),
        field(pathOf("ai.pounce"), "追击残血", "boolean", {
            help: "开启后，刚受过伤或已掉血的目标会被优先追击（正是翻倍窗口）；关闭则按普通近战排序。"
        })
    ]);
}
