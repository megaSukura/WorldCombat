/**
 * 灭亡之歌 的伙伴 AI 用途：这招自己的一套出手计划——只在自己比对手更能撑的时候唱。
 *
 * 什么局面有意义：有可见的威胁，自己的生命比例掉到 ai.threshold 以下（说明这一场正在输），
 *   威胁在 ai.maxChase 之内，身上还没被歌声缠上。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（fortify 位）。
 * 候选之间怎么排：生命更低时抬到 90，抢在普通自增益前先唱；否则 45 交回普通次序。
 * 放完之后：名单已经写好，唱的人也把自己算进去；走出交战或清除效果能甩掉它。
 * 配置：ai.threshold 决定多被动才唱；ai.maxChase 决定威胁多近才算数；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    registerUse("perishsong", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (marker(context, self, PokemonSkills.perishEffect)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
            if (ratio(self) > ai<number>(capability, "threshold", 0.55)) return false;
            return distance(self.point, threat.point) <= ai<number>(capability, "maxChase", 12);
        },
        priority: function (context, capability, _target) {
            const self = source(context);
            return ratio(self) < 0.35 ? 90 : 45;
        }
    });

    PokemonSkills.addPreferences("perishsong", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.threshold"), "起唱歌量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "生命比例低于这个值才起唱；调大更早把整场拉平，调小只在真的撑不住时唱。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "威胁距离", "number", {
            min: 3, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑起唱；调小只在贴身时唱，调大愿意对着更远的对手唱。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去起唱。"
        })
    ]);
}
