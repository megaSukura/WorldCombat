/**
 * 拦堵 / obstruct 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`（拒马要靠接触惩罚，所以要求对手贴近）、自己身上还没有拒马时立起；
 * 对手已经贴到窗口里时抬到 100 抢在共享顺序前——立拒马的意义就是让接下来撞上来的人变软。
 * 撑罩期间定身，所以它是一记“请君入瓮”的取舍。只剩本招时，敌人贴进 `ai.range` 就会立起等它撞。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("obstruct", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), ObstructRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 4);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            return distance <= 4 ? 100 : 50;
        }
    });

    addPreferences("obstruct", {}, [
        field(pathOf("barbs"), "带刺／加固", "boolean", {
            help: "开启带刺：接触降防 +1，但拒马量 ×0.75、持续 ×0.85，收招 6 刻。关闭加固：拒马量 ×1.2、持续 ×1.15，降防不额外加，收招 10 刻。"
        }),
        field(pathOf("ai.range"), "立拒马距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才立拒马。越大越早摆好，越可能空立；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
