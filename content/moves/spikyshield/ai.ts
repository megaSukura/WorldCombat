/**
 * 尖刺防守 / spikyshield 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有藤甲时炸开；对手已经贴到 3 格内时抬到 100
 * 抢在共享顺序前——藤刺甲的意义就是让接下来撞上来的人当场掉血，所以它等的是近战对手贴上来。
 * 封变化招式是附带收益，AI 不为它单独起意。撑甲期间可走动，所以它不像拦堵那样把自己钉住。
 * 只剩本招时：威胁一进 `ai.range` 就会炸甲等它撞。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("spikyshield", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), SpikyShieldRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 5);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            return distance <= 3 ? 100 : 55;
        }
    });

    addPreferences("spikyshield", {}, [
        field(pathOf("thorn"), "锐刺／厚藤", "boolean", {
            help: "开启锐刺：刺伤威力 ×1.25，但藤甲总量 ×0.8、持续 ×0.85、收招 5 刻——惩罚重，挡得薄。关闭厚藤：总量 ×1.25、持续 ×1.15，但刺伤 ×0.8、收招 8 刻——挡得厚，惩罚轻。"
        }),
        field(pathOf("ai.range"), "炸甲距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才炸开藤甲。越大越早摆好，也越可能空炸；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
