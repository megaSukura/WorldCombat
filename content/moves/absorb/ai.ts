/**
 * 吸取 / absorb 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 7）格内；焦点目标不受距离限制。
 * 它是本族最便宜的一口：冷却短、起手短，`priority` 在自身血量低于 `ai.healBelow`（默认 0.9）时抬一档，
 * 把它当续航手段先用——抽回来的血就是继续站场的机会；血量健康时退回普通近身候选取伤害。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。够不到交给共享接近逻辑，射程就是藤长。
 * 放完之后：交回共享顺序；它不占手，下一次决策就能再用。
 */
namespace CompanionBehavior {
    registerUse("absorb", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
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
            if (!target || !capability) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            var injured = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.9);
            return injured ? 30 : 14;
        }
    });

    PokemonSkills.addPreferences("absorb", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("grasp"), "缠根式", "boolean", {
            help: "开启：藤更长更粗、单口更重、抽得更足，但起手更慢、冷却更久，适合先手压制。关闭：快摘式，出手快、回得快，但够得近、抽得少，适合贴身缠斗。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动探藤，先走近。越大越愿意隔着一段距离先手点一下。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把吸取当续航手段优先出手；越高越早开始靠它回血。"
        })
    ]);
}
