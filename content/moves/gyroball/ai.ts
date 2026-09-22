/**
 * 陀螺球 / gyroball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在自己 `ai.maxChase`（默认 7）格以内；更远交给共享接近逻辑。
 * 因为这一招以「慢」为燃料，**自己速度越慢越倾向用它**（慢的个体才把陀螺转成重锤），速度快的伙伴会把它
 * 让给别的招。对手已经被打懵时补一撞也能吃到站位优势，优先级再抬一点。
 * 放完之后：撞开对手就重新贴上；这只是一种普通近身招，所以条件不成立时也照常出手，只是分量轻。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(gyroballId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (context.facts.speed <= 60) score += 12;
            if (context.facts.speed <= 45) score += 4;
            if (CompanionBehavior.status(context, target, "flinch")) score += 4;
            return score;
        }
    });

    addPreferences(gyroballId, {}, [
        field(pathOf("brace"), "定桩式", "boolean", {
            help: "开启：威力与击退更高，但垫前更近、滚动更慢、起手与冷却更久，适合已经贴到脸上的慢速个体。关闭（默认）：轻旋式，够得远、转得快、收得干净，单发略低。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就先走近。陀螺球是贴身短招，设大也常常够不到。"
        })
    ]);
}
