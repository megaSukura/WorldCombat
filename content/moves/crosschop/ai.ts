/**
 * 十字劈 / crosschop 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 5）之内；更远交给共享接近逻辑。
 * 对谁出手：这一招射程很短，两劈又要先后落在同一个锁定交叉点上，所以宽身体目标更值（交叉更容易同时罩住），
 *   `ai.pointBlank`（默认开）只在贴到身上（射程六成以内）时才抬高一档——确保第一劈撞开架势后第二劈仍落在原地；
 *   横向高速移动的目标不硬追交叉（第二劈多半落空），降低推荐让位给更稳的近身招。关闭 pointBlank 则按普通近身攻击排序。
 * 够不到怎么办：出手距离交给 `reach`，共享任务把身位收进两臂范围再劈。
 * 放完接什么：交回共享交战计划；只有同一目标两劈都中才吃满破势加成，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(crosschopId, {
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
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            let base = 22;
            // 宽身体更容易被两道斜线同时罩住，交叉劈更值。
            if ((target.width || 0.9) >= 1.2) base += 10;
            // 横向高速移动的目标会移出锁定的交叉点，第二劈多半落空；不硬追交叉。
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.0025) base -= 10;
            if (!CompanionBehavior.ai<boolean>(capability, "pointBlank", true)) return Math.max(0, base);
            return (gap <= capability.data.range * 0.65 ? base + 12 : base);
        }
    });

    addPreferences(crosschopId, {}, [
        field(pathOf("guard"), "破势式", "boolean", {
            help: "开启：第一劈撞开架势，第二劈对已被第一劈劈中的目标多切一截（破势加成 ×1.35），代价是射程略短、两劈间隔与起手更久、冷却 +6 刻；关闭：双劈式，两劈等重、出手更快射程更远，代价是没有破势加成。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动交叉劈，先走近。越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.pointBlank"), "贴着才劈", "boolean", {
            help: "开启：只在贴到射程六成以内时抬高一档，确保两劈都能落在同一个点上；关闭：按普通近身攻击排序，够到就劈。"
        })
    ]);
}
