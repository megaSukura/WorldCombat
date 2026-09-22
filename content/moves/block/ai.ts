/**
 * 挡路 的伙伴 AI 用途：这招自己的一套出手计划——把对手的退路从世界里拿走。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase（默认 6）格以内、对方还没被封锁。
 *   目标正在逃跑时加分（`ai.catchRunners` 默认开）：它正要离开，一堵墙正好封在背影一侧。
 *   贴身的目标也加分：把冲上来的对手按进近战范围。
 * 对谁出手：当前威胁；已被 trapped（任何来源）的目标跳过，不浪费一次封路。
 * 够不到怎么办：reach 就是立墙距离，超出的先走近；这是贴近的招，多数时候需要靠身。
 * 放完之后：目标被墙与术者夹住、走不快，伙伴交回共享顺序决定继续压制还是换目标。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("block", { ai: { maxChase: 6, catchRunners: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.flag("ai.catchRunners", "优先逃跑目标"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function blockWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, threat, "trapped")) return false;
        return context.facts.focus === threat.ref || distance(self.point, threat.point) <= ai<number>(item, "maxChase", 6);
    }

    registerUse("block", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || blockWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !blockWants(context, item, target)) return 0;
            let value = 50;
            if (ai<boolean>(item, "catchRunners", true) && fleeing(context, target)) value += 20;
            if (distance(source(context).point, target.point) < 3) value += 6;
            if (context.facts.focus === target.ref) value += 8;
            return Math.min(92, value);
        }
    });
}
