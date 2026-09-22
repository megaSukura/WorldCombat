/**
 * 骨头回力镖 / bonemerang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 11）格内；更远交给共享接近逻辑。
 * 为什么保持距离：这是一记**离手往返**——`ai.minGap`（默认 1.5）以内不再掷，让共享近战去接手，因为贴脸时
 *   骨头没有绕行的空间、第二次掠过的价值也小；落在 `capability.data.range` 之内的甜区时 priority 最高。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 放完之后：骨头自己飞回来，交回共享交战计划；带着冷却时不会重复掷。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("bonemerang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            const minGap = CompanionBehavior.ai<number>(capability, "minGap", 1.5);
            if (gap < minGap) return 8;
            return gap > capability.data.range * 0.45 ? 26 : 20;
        }
    });

    addPreferences("bonemerang", {}, [
        field(pathOf("arc"), "回旋弧", "boolean", {
            help: "开启：越目标更远、向侧面摆得更开、飞得更慢，去程轻 15%、回程重 20%、冷却 +6 刻——回程更重但更难命中。关闭（直去直回）：更快、更平、两段更均匀、冷却更短，更稳但没有回程加成。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动投掷，先走近。越大越愿意从远处先手。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 6, step: 0.5,
            help: "近于这个距离就不再投掷、交给共享近战。调大更常把贴身的机会让给别的招。"
        })
    ]);
}
