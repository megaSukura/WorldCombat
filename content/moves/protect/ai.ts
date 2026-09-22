/**
 * 守住 / protect 的 AI 用途。
 *
 * 什么局面下出手：有威胁、距离进入 `ai.trigger`、且自己身上还没有穹顶时撑罩；贴脸又残血时抬到 105 抢在共享顺序前。
 * 没有威胁时只在驻守／自由活动下保留（原地预备），不会为空气撑罩。撑罩期间定身，所以出手是个真实的取舍。
 * “只剩本招可选”时：威胁一进 `ai.trigger` 就会起罩，不依赖别的招先出手。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("protect", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), ProtectRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "trigger", 10);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            return ratio < 0.5 && distance <= 4 ? 105 : 60;
        }
    });

    addPreferences("protect", {}, [
        field(pathOf("braced"), "守据／瞬罩", "boolean", {
            help: "开启守据：屏障 ×1.3、护盾量 ×1.15，但收招 10 刻、冷却 ×1.15，且整段定身。关闭瞬罩：屏障 ×0.8、护盾量 ×0.8，收招只要 4 刻、冷却 ×0.85，撑罩期间还能走动。"
        }),
        field(pathOf("ai.trigger"), "反应距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离就考虑撑罩。越大越早预判，也越可能白撑；越小越省，但可能来不及。"
        })
    ]);
}
