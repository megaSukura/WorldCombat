/**
 * 水流环 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己血量低于 ai.healBelow 且身上还没有水幕——这是一条持续续航线，早点铺上更赚。
 * 对谁出手：只有自己（kind self），reach 0；水幕已经挂着就不重复铺。
 * 什么时候最想：血越低分越高（priority 55 降到 30），但不必紧急到越过攻击；它按共享的「照顾自己」次序出手，
 *   在安全或拉锯的局面里铺开。
 * 配置：spring（涌泉／细流）在参数层改变回血节奏与存续；ai.healBelow 决定多低才铺水幕。
 */
namespace CompanionBehavior {
    const aquaRingHealBelow = PokemonSkills.number("ai.healBelow", "铺环血量", 0.3, 1, 0.05);
    aquaRingHealBelow.help = "自身生命低于这个比例时，伙计把水流环排进续航计划；调低更倾向先打，调高则一受伤就铺水幕。";

    PokemonSkills.addPreferences("aquaring", { spring: false, ai: { healBelow: 0.8 } }, [aquaRingHealBelow]);

    registerUse("aquaring", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function (context) { return !status(context, source(context), "aquaring"); },
        available: function (context, item) {
            const self = source(context);
            return !context.facts.mounted && !status(context, self, "aquaring")
                && ratio(self) < ai<number>(item, "healBelow", 0.8);
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        priority: function (context, item) {
            if (status(context, source(context), "aquaring")) return 0;
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.8) ? 55 : 30;
        }
    });
}
