/**
 * 清醒 / smellingsalts 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 7）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`ai.wake`（默认开）打开时，正麻痹的目标 priority 50——那正是翻倍窗口，值得插在普通攻击前面；
 *   没人在麻痹时它仍能当一记普通拍击，但压到 9 让位给别的招。
 * 放完接什么：交回共享交战计划；命中会解除目标的麻痹，这一记不负责持续压制。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(smellingsaltsId, {
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
            if (CompanionBehavior.ai<boolean>(capability, "wake", true)
                && CompanionBehavior.status(context, target, "paralysis")) return 50;
            return 9;
        }
    });

    addPreferences(smellingsaltsId, {}, [
        field(pathOf("coarse"), "粗盐", "boolean", {
            help: "开启：拍开 ×1.5，且解除麻痹后额外留下一段踉跄（减速）；但本击 ×0.90、冷却多 3 刻。关闭：本击 ×1.06，拍醒就干净。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标离自己这么远以内才拍过去；调大愿意主动追上更远的麻痹目标。"
        }),
        field(pathOf("ai.wake"), "趁麻痹拍", "boolean", {
            help: "开启后，正麻痹的目标会被优先拍醒（正是翻倍窗口）；关闭则只在没有别的招时会用这一记普通拍击。"
        })
    ]);
}
