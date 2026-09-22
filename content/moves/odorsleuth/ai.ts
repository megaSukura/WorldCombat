/**
 * 气味侦测 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）且视线畅通的威胁，自己身上还没有同一次追踪印记。
 * 什么时候最想出手：对手正在拉开（共享 movement 感官判为 fleeing）时 priority 抬到 86——气味最适合咬住一个
 *   想跑的目标；目标是幽灵时 78，先破掉它的一般/格斗免疫；其余 56。
 * 对谁出手：当前威胁；已经带着 foresight／odorsleuth 身份的目标跳过，避免浪费 40 发 PP。
 * 够不到怎么办：reach 就是嗅闻距离（按体型估算），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：气味留在目标身上、一般与格斗接得上、脚步被拖慢；印记还在时不重复。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("odorsleuth", { ai: { maxChase: 14, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 22, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function odorsleuthTargetGhost(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && Array.isArray(facts.types) && facts.types.indexOf("ghost") >= 0;
    }

    function odorsleuthWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "odorsleuth") || status(context, threat, "foresight")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("odorsleuth", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || odorsleuthWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !odorsleuthWants(context, item, target)) return 0;
            if (fleeing(context, target)) return 86;
            if (odorsleuthTargetGhost(context, target)) return 78;
            return 56;
        }
    });
}
