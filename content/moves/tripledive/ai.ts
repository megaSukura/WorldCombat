/**
 * 三连钻 / tripledive 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 5）格内；更远交给共享接近逻辑。
 * 为什么选目标：三钻的价值在那一层「湿透」——已经带着 `world_combat:status/drenched` 的目标每一钻都吃 `soakBonus`，
 *   所以 `ai.drenchFirst`（默认开）下它排得更前；大体型更好接触、水花范围也更容易扫到，`ai.preferLarge`（默认开）
 *   再给一档分。每跳执行时都会按当前身位重新取可达落点（本招射程很短，目标跑远时这一钻就落在可达范围内收势）。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 放完之后：三钻落地自己收势，交回共享交战计划；带着冷却时不会重复起跳。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("tripledive", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "drenchFirst", true) && CompanionBehavior.status(context, target, "drenched")) score += 10;
            const bulk = (target.width === undefined ? 0.9 : target.width) * (target.height === undefined ? 1.4 : target.height);
            if (CompanionBehavior.ai<boolean>(capability, "preferLarge", true) && bulk >= 2.2) score += 8;
            return score;
        }
    });

    addPreferences("tripledive", {}, [
        field(pathOf("plunge"), "深潜", "boolean", {
            help: "开启：跳得更高、每钻重 20%、水花判定 ×1.2、湿身 ×1.25，但节拍 +2 刻、冷却 +6 刻——更痛但给对手更长窗口。关闭（连跳）：三钻更快、每钻轻 10%、循环更短，但水花更小、湿身更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不起跳，先走近。钻击距离很短，设大也常常够不到。"
        }),
        field(pathOf("ai.drenchFirst"), "优先打湿身", "boolean", {
            help: "开启：已经带着「湿透」的目标排得更前（每一钻都吃湿身加成）；关闭则所有目标同价。"
        }),
        field(pathOf("ai.preferLarge"), "优先大体型", "boolean", {
            help: "开启：身体体积较大的目标（更好接触、水花范围更易扫到）多一档分；关闭则只看湿身与距离。"
        })
    ]);
}
