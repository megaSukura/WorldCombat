/**
 * 吸取拳 / drainpunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 6）格内。它是一记站定的贴身直拳，
 * `priority` 在自身血量低于 `ai.healBelow`（默认 0.85）时抬一档，把「打到就回一点」当续航手段；
 * 目标正在拉开距离时再加一档——贴上去一拳正好把人留在身前。
 * 但满血时它不为连打追远：生命在阈值以上、又不在拳距内时，直接让位给别的招，不主动扑上去。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是拳距。
 * 放完之后：连打式三拳打完再交回共享顺序；单拳式一击即回，可以按冷却反复出。
 */
namespace CompanionBehavior {
    registerUse("drainpunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            var self = CompanionBehavior.source(context);
            var dist = CompanionBehavior.distance(self.point, target.point);
            if (dist > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            var wounded = CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "healBelow", 0.85);
            // 满血时不为连打追远：够不到拳距就不主动扑，交给别的招。
            if (!wounded && dist > capability.data.range) return 0;
            var score = 19;
            if (wounded) score += 15;
            if (CompanionBehavior.fleeing(context, target)) score += 9;
            else if (dist <= capability.data.range) score += 5;
            return score;
        }
    });

    PokemonSkills.addPreferences("drainpunch", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("combo"), "连打式", "boolean", {
            help: "开启：一记直拳展开成三连拳，总伤害更高、更容易打出暴击，但每拳更轻、每拳的回血比例更低、收招更长。关闭：一记干净的直拳，回血更足、收招更快，适合续航。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。越大追得越执着。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把吸取拳当续航手段优先出手；越高越早开始靠它回血。"
        })
    ]);
}
