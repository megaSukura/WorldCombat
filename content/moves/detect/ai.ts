/**
 * 看穿 / detect 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有读招窗口时读招；对方正把矛头指向自己、
 * 或自己刚挨过打时抬到 100 抢在共享顺序前——它奖励的是踩在对手出手那一下上。
 * 读招可以边走边打，所以不像守住那样要求站定。只剩本招时，有威胁就会读，不会干等。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("detect", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), DetectRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 6);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const incoming = threat.attacking === self.ref || self.hurtAgo !== undefined && self.hurtAgo < 20;
            return incoming ? 100 : 40;
        }
    });

    addPreferences("detect", {}, [
        field(pathOf("strike"), "走位／反击", "boolean", {
            help: "关闭走位：读中抬速度，窗口略长（×1.15），先机用来拉开距离。开启反击：读中抬攻击，但窗口 ×0.85、收招多 2 刻、冷却多 8 刻。"
        }),
        field(pathOf("ai.range"), "读招距离", "number", {
            min: 2, max: 14, step: 1,
            help: "威胁进入这个距离才考虑读招。越大越早举幕，越可能在对手还没出手时白读。"
        })
    ]);
}
