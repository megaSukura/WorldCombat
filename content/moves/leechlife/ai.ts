/**
 * 吸血 / leechlife 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 6）格内。它咬住后施法者原地不动，
 *   所以更愿意咬「跑不掉的目标」：`priority` 在自身血量低于 `ai.healBelow`（默认 0.88）时抬一档（回血最足），
 *   目标带着减速、麻痹或睡眠一类状态再加一档（这段抽吸能走完），对方血厚再加一档（总抽量更大）。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是咬距。
 * 放完之后：抽吸几拍走完或目标脱开即收势，交回共享顺序。
 */
namespace CompanionBehavior {
    registerUse("leechlife", {
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
            var dist = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (dist > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            var score = 18;
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.88)) score += 15;
            if (CompanionBehavior.status(context, target, "paralysis") || CompanionBehavior.status(context, target, "sleep")
                || CompanionBehavior.status(context, target, "rooted") || CompanionBehavior.protectedControl(target)) score += 10;
            if (target.maximum > 0 && target.health / target.maximum > 0.5) score += 4;
            return score;
        }
    });

    PokemonSkills.addPreferences("leechlife", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deep"), "深咬式", "boolean", {
            help: "开启：三拍重吸、每拍更狠、回血比例更高、钩子挂得更远，但起手收招更慢、每拍间隔更长，目标更容易在这段里跑掉。关闭：五拍快吸，节奏紧、回得快，但每口更轻、总抽量分得更散。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动咬上去，先走近。越大追得越执着。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把吸血当续航手段优先出手；越高越早开始靠它回血。"
        })
    ]);
}
