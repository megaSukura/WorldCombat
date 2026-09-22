/**
 * 影子分身 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、威胁已经在 ai.maxChase 以内、而且自己身上还没有残影；
 *   这是一招纯自保的准备，被威胁时才留影，安全时不浪费。
 * 对谁出手：自己；不需要瞄准也不需要贴近，站在原地完成（reach 0，accepts 只收自己）。
 * 够不到怎么办：不需要够——威胁离得太远就先不理会，等它靠近。
 * 放完之后：残影替本体挨打、磨完即碎；交回共享顺序继续战斗。
 * 配置 deploy（群影／疾影）改变残影数量、预算、持续时间与冷却；ai.maxChase 决定威胁多近才留影。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(doubleteamId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "doubleteam")) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context) {
            return context.senses["world_combat:threat"] ? 90 : 0;
        }
    });

    addPreferences(doubleteamId, { ai: { maxChase: 18, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 28, step: 1,
            help: "威胁进入这个距离内才考虑留影；调小只为贴身自卫，调大在更远处就做准备。" }),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
