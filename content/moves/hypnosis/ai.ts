/**
 * 催眠术 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：挂在共享的 control 位上。带催眠术的伙伴在没有攻击可用时用它；有攻击时它作为那记攻击
 *   前的控制手段。目标要可见、敌对、还活着，且与施法者之间有一条通视的直线——被墙挡住的先交给共享接近
 *   逻辑，走近、转出视线再放。已经睡着的目标跳过，不重复下手。**距离不在这里拒绝**：超过 ai.maxChase 只是
 *   优先级下降，共享任务仍会先走近再放，这样「只剩本招」时它照样会被放出来。
 * 对谁出手：当前威胁；`ai.opening` 决定时机——随时出手，或只在自己刚挨过打时还手。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒。
 * 放完之后：目标睡下、不再行动，直到受伤惊醒；伙伴交回共享顺序，可以转火别人或等下一个睡眠窗口。
 * 优先级：基础 44；正在逃跑的威胁抬到 58（先把它钉住）；超出 ai.maxChase 时降到 12（先靠近，别隔空硬掷）。
 */
namespace PokemonSkills {
    function hypnosisWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "sleep")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ai<string>(item, "opening", "anytime") === "bitten" && self.hurtAgo >= 80) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(hypnosisId, {
        protocols: ["world_combat:control", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : hypnosisWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !hypnosisWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 11)) return 12;
            return CompanionBehavior.fleeing(context, target) ? 58 : 44;
        }
    });

    addPreferences(hypnosisId, { ai: { maxChase: 11, opening: "anytime", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 16, step: 1,
            help: "威胁进入这个距离内才考虑凝视；越大越愿意先远远地试一次。"
        }),
        choice("ai.opening", "出手时机", ["anytime", "bitten"], ["随时", "挨打后"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
