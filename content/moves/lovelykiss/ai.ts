/**
 * 恶魔之吻 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：挂在共享的 control / contact 位上。目标要可见、敌对、还活着、未睡，且与施法者之间有一条
 *   通视的直线——它必须把身体送过去，所以位置就是它的准备。**距离不在这里拒绝**：超过 ai.maxChase 只是
 *   优先级下降，伙伴会先走到起扑距离再扑；只剩本招时它照样会扑出去。
 * 对谁出手：当前威胁；`ai.finish` 开启时，生命低于 40% 的目标抬一档（冲上去把它睡死）。
 * 低血避免冒险：扑上去会把自己暴露在近身，自己生命低于四成时明显降优先——不是不能扑，而是不再拿命去换。
 * 够不到怎么办：reach 取扑击距离加判定半径，共享任务把身位收进去再扑；accepts 不按距离硬拒。
 * 放完之后：睡着的人不再行动，直到受伤惊醒；伙伴交回共享顺序，通常要退开一步避免被反打。
 * 优先级：基础 52；`ai.finish` 开启且目标残血时 66；自身低血时降到 22；超出 ai.maxChase 时降到 14（先贴上去）。
 */
namespace PokemonSkills {
    function lovelykissWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "sleep")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(lovelykissId, {
        protocols: ["world_combat:control", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : lovelykissWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !lovelykissWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const finisher = CompanionBehavior.ai<boolean>(item, "finish", false) && CompanionBehavior.ratio(target) < 0.4;
            const score = finisher ? 66 : CompanionBehavior.ratio(self) < 0.4 ? 22 : 52;
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return 14;
            return score;
        }
    });

    addPreferences(lovelykissId, { ai: { maxChase: 12, finish: false, leaveStation: true } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 18, step: 1,
            help: "威胁进入这个距离内才考虑扑上去；越大越愿意从更远的地方起扑，也越容易在扑空后落单。"
        }),
        flag("ai.finish", "优先扑残血"),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
