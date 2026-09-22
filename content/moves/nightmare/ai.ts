/**
 * 恶梦 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：挂在共享的 attack / control / ranged 位上，但这招**只在对方已经睡着时**才有意义——
 *   醒着的人没有梦可做，`ready` 会在提交前作废、白花一次 PP。目标要可见、敌对、还活着、带着共享睡眠身份，
 *   且与施法者通视（**距离不在这里拒绝**：超过 ai.maxChase 只是优先级下降，伙伴会先走到该在的位置再下咒）。
 *   已经带着恶梦的目标跳过，不重复下咒。
 * 对谁出手：当前威胁；它是睡眠链的收割端，看到睡着的目标就该压上去。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒。
 * 放完之后：目标被按在睡眠里持续失血，直到恶梦走完或被人解掉；伙伴可以趁窗口继续输出。
 * 优先级：基础 72；目标生命低于四成时再 +12（尽快在窗口里收掉）；超出 ai.maxChase 时降到 36（仍会走近去下咒）。
 */
namespace PokemonSkills {
    function nightmareWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (!CompanionBehavior.status(context, target, "sleep")) return false;
        if (CompanionBehavior.status(context, target, "nightmare")) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(nightmareId, {
        protocols: ["world_combat:attack", "world_combat:control", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, item, purpose, target) { return target === null ? false : nightmareWants(context, item, target); },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible && CompanionBehavior.status(context, target, "sleep");
        },
        priority: function (context, item, target) {
            if (!target || !nightmareWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return 36;
            return CompanionBehavior.ratio(target) < 0.4 ? 84 : 72;
        }
    });

    addPreferences(nightmareId, { ai: { maxChase: 13, leaveStation: true } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "睡着目标进入这个距离内才考虑下咒；越大越愿意从更远处压上去。"
        }),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
