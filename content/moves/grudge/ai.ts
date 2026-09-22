/**
 * 怨念 的伙伴 AI 用途：这招自己的一套出手计划——把「亲手了结我」标上价码。
 *
 * 什么局面有意义：有可见的威胁，自己的生命比例掉到 ai.threshold 以下，身上还没有这份怨念，威胁在 ai.maxChase 之内。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（fortify 位）。
 * 候选之间怎么排：生命更低时抬到 70，抢在普通自增益前先立；否则 40 交回普通次序。
 * 放完之后：怨念自己撑着；使用者倒下会把凶手那一手的 PP 掏空。
 * 配置：ai.threshold 决定多残才立；ai.maxChase 决定威胁多近才算数；ai.leaveStation 决定驻守时是否离位靠近。
 */
namespace CompanionBehavior {
    registerUse("grudge", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (marker(context, self, PokemonSkills.grudgeEffect)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
            if (ratio(self) > ai<number>(capability, "threshold", 0.5)) return false;
            return distance(self.point, threat.point) <= ai<number>(capability, "maxChase", 10);
        },
        priority: function (context, capability, _target) {
            const self = source(context);
            return ratio(self) < 0.25 ? 70 : 40;
        }
    });

    PokemonSkills.addPreferences("grudge", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.threshold"), "立怨血量", "number", {
            min: 0.2, max: 0.8, step: 0.05,
            help: "生命比例低于这个值才立下怨念；调大更早把「补刀」标价，调小只在真的快倒下时用。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "威胁距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离内才考虑立怨；调小只在贴身时用，调大愿意追出去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去立怨。"
        })
    ]);
}
