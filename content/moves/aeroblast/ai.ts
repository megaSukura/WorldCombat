/**
 * 气旋攻击 / aeroblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内。它是本族射程最远、单发最重的
 *   招，所以越远越先被考虑（在对手进入自己射程前先手一炮）；贴身后仍然可用，但让位给更便宜的近战。
 *   `ai.finishLow`（默认开）在对手血量偏低时抬优先级，用这一发尝试收掉。
 * 放完之后：交回共享交战计划；它是站定的单体远程，掷完不改变站位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aeroblastId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                    <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > Number(capability.data.range)) return 0;
            let base = distance > 8 ? 32 : 22;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) <= 0.4) base += 18;
            return base;
        }
    });

    addPreferences(aeroblastId, {}, [
        field(pathOf("charge"), "蓄力式", "boolean", {
            help: "开启：威力 ×1.18、射程 +2.5 格、涡流判定 ×1.15、气环 ×1.1，但起手 +6 刻、收招 +2 刻、冷却 +14 刻、飞行 ×0.9，适合预判远距目标。关闭（速射式，默认）：飞得更快（×1.12）、冷却少 8 刻，但威力 ×0.94、射程略短，适合贴身也敢放。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 28, step: 1,
            help: "超过这个距离就不主动出手，先走近。它是本族射程最远的招，数值大时会在远处先手开炮。"
        }),
        field(pathOf("ai.finishLow"), "收残血", "boolean", {
            help: "开启：对手血量低于四成时优先打这一发重炮，尝试收掉；关闭：不看血量，按普通远程排序。"
        })
    ]);
}
