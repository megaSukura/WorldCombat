/**
 * 奇迹之眼 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）且视线畅通的威胁，自己身上还没有同一次心眼。
 * 什么时候最想出手：目标的属性里有恶时 priority 抬到 88——心眼之后超能才接得上；对手正在拉开（fleeing）时 72；
 *   其余 54；就算目标不免疫，这一眼也顺手抬自己的命中，所以总会排在普通攻击之前一点。
 * 对谁出手：当前威胁；已经带着 miracleeye 或 foresight 身份的目标跳过，避免浪费 40 发 PP。
 * 够不到怎么办：reach 就是心眼距离（按体型估算），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：印记留在目标身上、超能接得上、自己命中被抬高；印记还在时不重复。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("miracleeye", { ai: { maxChase: 12, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function miracleeyeTargetDark(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && Array.isArray(facts.types) && facts.types.indexOf("dark") >= 0;
    }

    function miracleeyeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "miracleeye") || status(context, threat, "foresight")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("miracleeye", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || miracleeyeWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !miracleeyeWants(context, item, target)) return 0;
            if (miracleeyeTargetDark(context, target)) return 88;
            if (fleeing(context, target)) return 72;
            return 54;
        }
    });
}
