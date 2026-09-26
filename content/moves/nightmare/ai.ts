/**
 * 恶梦 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：挂在共享的 attack / control / ranged 位上，但这招**只在对方已经睡着、且这个睡眠窗口还稳**时
 *   才有意义。目标要可见、敌对、还活着、带着共享睡眠身份，且与施法者通视（**距离不在这里拒绝**：超过
 *   ai.maxChase 只是优先级下降，伙伴会先走到该在的位置再下咒）。已经带着恶梦的目标跳过，不重复下咒。
 *   队友若正攻击这个睡者，恶梦的第一跳还没落下它就先被打醒——窗口不稳，先不做，等它再次睡下。
 * 对谁出手：当前威胁；它是睡眠链的收割端，看到睡着的目标就该压上去。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒。
 * 放完之后：这一抽会把睡者弄醒、恶梦随之散去；伙伴交回共享顺序，可以换回普通攻击。
 * 优先级：基础 72；目标生命低于四成时再 +12（尽快在窗口里收掉）；超出 ai.maxChase 时降到 36（仍会走近去下咒）。
 */
namespace PokemonSkills {
    /** 队伍里有没有人正把这个睡者当目标打：伤害会先把它弄醒，恶梦还没落就白下。 */
    function nightmareWindowStable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.attacking === target.ref) return false;
        }
        return true;
    }

    function nightmareWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (!CompanionBehavior.status(context, target, "sleep")) return false;
        if (CompanionBehavior.status(context, target, "nightmare")) return false;
        if (!nightmareWindowStable(context, target)) return false;
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
