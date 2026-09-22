/**
 * 定身法 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：目标可见、敌对、存活，它在 ai.maxChase 以内、有一条通视直线。已经带着定身身份的目标跳过。
 *   注意：是否「有可点名的上一手」由提交前的 ready 校验，不放进 available——否则对手还没出手时伙伴会以为
 *   无招可用而退开，这一钉永远等不到那一刻。伙伴照常贴近、反复尝试，对手一出过手就落钉。
 * 对谁出手：当前威胁；由共用服务走近到通视射程后送出定身钉。
 * 候选之间怎么排：上一手是重招（威力 ≥ 60）时 priority 50，其余 35；还没有上一手时 8（仍会贴近等待）。
 * 够不到怎么办：reach 就是本招射程（特攻与体型决定），accepts 不按距离硬拒，共享任务先走近再钉。
 * 放完之后：目标那一手被封住；交回共享交战计划，目标换别的招照样能打。
 * 配置 heavy（重钉／轻钉）改变时长、射程与冷却；ai.maxChase、ai.leaveStation 决定追多远、驻守时是否离位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_disable/last", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return "";
        const state = NativeEffects.read(access, actor);
        if (!state.used || access.tick() - (state.usedTick || -1000) > 120) return "";
        return String(state.used);
    });

    function disableWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, disableStatus)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(disableId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return target === null ? true : disableWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !disableWants(context, item, target)) return 0;
            const last = CompanionBehavior.fact<string>(context, "world_combat:move_disable/last", target);
            if (last === null || last === "") return 8;
            return CobblemonCombat.moveTemplate(String(last)).power() >= 60 ? 50 : 35;
        }
    });

    addPreferences(disableId, { heavy: false, ai: { maxChase: 14, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
