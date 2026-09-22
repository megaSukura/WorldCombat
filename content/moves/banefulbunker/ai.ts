/**
 * 碉堡 / banefulbunker 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有碉堡时合拢；对手已经中毒时抬到 95——
 * 碉堡会把中毒改灌成剧毒，所以它最想等的是已经把毒铺在对手身上的局面。封变化招式是附带收益。
 * 只剩本招时：威胁一进 `ai.range` 就会合拢碉堡等它撞。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("banefulbunker", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), BanefulRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 5);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, threat.point);
            if (CompanionBehavior.status(context, threat, "poison") || CompanionBehavior.status(context, threat, "toxic")) return 95;
            return distance <= 3 ? 90 : 50;
        }
    });

    addPreferences("banefulbunker", {}, [
        field(pathOf("venomous"), "淬毒／厚壁", "boolean", {
            help: "开启淬毒：灌毒时长 ×1.35，但碉堡总量 ×0.8、持续 ×0.85、收招 8 刻——毒得久，挡得薄。关闭厚壁：总量 ×1.25、持续 ×1.15、收招 5 刻，但灌毒 ×0.8——挡得厚，毒得浅。"
        }),
        field(pathOf("ai.range"), "合壁距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才合拢碉堡。越大越早摆好，也越可能空合；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
