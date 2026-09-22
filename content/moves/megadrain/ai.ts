/**
 * 超级吸取 / megadrain 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 12）格内。它是一记中距离的抛荚，
 * 价值在于隔着一段距离持续把血抽回来：`priority` 在自身血量低于 `ai.healBelow`（默认 0.9）时抬一档，
 * 并且更愿意在目标离自己还有一段（≥ 3.5 格）时先手抛出去，把对手挡在近身之外。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是抛程。
 * 放完之后：缠吸几拍由等级决定，交回共享顺序；不占手，下一次决策就能再抛。
 */
namespace CompanionBehavior {
    registerUse("megadrain", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            var dist = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (dist > capability.data.range) return 0;
            var score = 18;
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.9)) score += 16;
            if (dist >= 3.5) score += 6;
            if (CompanionBehavior.status(context, target, "rooted")) score += 6;
            return score;
        }
    });

    PokemonSkills.addPreferences("megadrain", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("burst"), "爆荚式", "boolean", {
            help: "开启：一发爆得更重、根网更宽，但只抽一拍、回得更少、节奏更慢，适合一次打断或收残。关闭：缠钩式，多拍连续抽取，总量与回血更高，适合续航。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动抛荚，先走近。越大越愿意隔着一段距离先手抽一口。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把超级吸取当续航手段优先出手；越高越早开始靠它回血。"
        })
    ]);
}
