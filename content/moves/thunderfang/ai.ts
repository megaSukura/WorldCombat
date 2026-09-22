/**
 * 雷电牙 / thunderfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.lockParalyzed`（默认开）打开时，已经完全麻痹的目标排得最前——这一口会把它们电锁在原地；
 *   对正在跑动的目标再抬一档（本族最快的一口最适合截住走位）。没有麻掉的目标时把它当最快的起手。
 * 够不到怎么办：牙很短，reach 之内才动手，不够先贴近。
 * 放完之后：麻痹与电锁交给共享交战计划，让它去追那些被钉住的目标。
 */
namespace PokemonSkills {
    function thunderfangWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    CompanionBehavior.registerUse("thunderfang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return thunderfangWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !thunderfangWants(context, capability, target)) return 0;
            let score = 21;
            if (CompanionBehavior.ai<boolean>(capability, "lockParalyzed", true) && CompanionBehavior.status(context, target, "paralysis")) score += 20;
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.0025) score += 6;
            return score;
        }
    });

    addPreferences("thunderfang", {}, [
        field(pathOf("overload"), "过载式", "boolean", {
            help: "开启：麻痹几率 +12%%、麻痹时长 ×1.2、电锁时长 ×1.6，但咬合威力 ×0.88、冷却 +4 刻——控场为主。关闭（点穴式）：咬得更重、循环更快，但麻得更短、锁得更短。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。雷电牙射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.lockParalyzed"), "优先电锁已麻目标", "boolean", {
            help: "开启：已经完全麻痹的目标排得最前，这一口能把它们锁在原地；正在跑动的目标再抬一档。关闭则只按普通近战排序。"
        })
    ]);
}
