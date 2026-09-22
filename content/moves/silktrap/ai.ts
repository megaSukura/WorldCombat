/**
 * 线阱 / silktrap 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有丝网时铺网；对手已经贴进 3 格时抬到 100
 * 抢在共享顺序前——线阱的缠足只有在接触当下才有意义，所以它等的是贴脸。
 * 变化招式会穿过丝网，所以它不为挡变化招而起意；理由与说明一致。
 * 只剩本招时：威胁一进 `ai.range` 就会铺网。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("silktrap", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), SilkTrapRule)) return false;
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

    addPreferences("silktrap", {}, [
        field(pathOf("snare"), "缠缚／滑丝", "boolean", {
            help: "开启缠缚：接触缠足 ×1.5、降速 +1 级，但丝网总量 ×0.8、持续 ×0.85、收招 7 刻——钉得死，挡得薄。关闭滑丝：总量 ×1.25、持续 ×1.15、收招 5 刻，但缠足 ×0.6、降速不额外加——挡得厚，黏得浅。"
        }),
        field(pathOf("ai.range"), "铺网距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才铺网。越大越早摆好，也越可能空铺；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
