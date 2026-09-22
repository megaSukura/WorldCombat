/**
 * 同命 的伙伴 AI 用途：这招自己的一套出手计划——只在真的准备去死的时候系线。
 *
 * 什么局面有意义：有可见的威胁，自己的生命比例掉到 ai.threshold 以下，身上还没有命线，威胁在 ai.maxChase 之内。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（survive 位）。
 * 候选之间怎么排：生命更低或威胁已经贴身时抬到 120，抢在共享交战次序前系好；否则 65 交回普通次序。
 * 放完之后：线自己撑着；使用者倒下会把凶手一起带走——这是保命位上的最后一手。
 * 配置：ai.threshold 决定多残才系线；ai.maxChase 决定威胁多近才算数；ai.leaveStation 决定驻守时是否离位靠近。
 */
namespace CompanionBehavior {
    registerUse("destinybond", {
        protocols: ["world_combat:survive"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (status(context, self, "destiny_bond")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
            if (ratio(self) > ai<number>(capability, "threshold", 0.3)) return false;
            return distance(self.point, threat.point) <= ai<number>(capability, "maxChase", 10);
        },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"], self = source(context);
            if (!threat) return 0;
            return ratio(self) < 0.15 || distance(self.point, threat.point) <= 2.5 ? 120 : 65;
        }
    });

    PokemonSkills.addPreferences("destinybond", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.threshold"), "系线血量", "number", {
            min: 0.1, max: 0.6, step: 0.05,
            help: "生命比例低于这个值才系线；调大更早把代价摆出来，调小只在真的快倒下时用。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "威胁距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离内才考虑系线；调小只在贴身时用，调大愿意追出去把线系好。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去系线。"
        })
    ]);
}
