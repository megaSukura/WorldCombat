/**
 * 万圣夜 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）、视线畅通、属性单一且不是幽灵的宝可梦威胁——
 *   只有这种目标才套得上幽灵外壳（双属性或已是幽灵的套不上）。
 * 什么时候最想出手：目标是超能属性时 priority 抬到 80——外壳一上，幽灵与恶对它效果绝佳，是队友幽灵招的口子；
 *   其余单属性目标 62，把它的受击面翻成幽灵，打开幽灵／恶的弱点。
 * 对谁出手：当前威胁；已经带着 trickortreat 身份的目标跳过，避免浪费 20 发 PP。
 * 够不到怎么办：reach 就是套壳距离（偏短），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：外壳挂在目标身上、属性层随即生效；壳还在时不重复。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("trickortreat", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 16, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 单属性、非幽灵的宝可梦才套得上；事实缺失（非宝可梦）一律跳过。 */
    function trickortreatEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = combatStats(context, target);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.length > 0 && facts.types.length < 3 && facts.types.indexOf("ghost") < 0;
    }

    function trickortreatWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "trickortreat")) return false;
        if (!trickortreatEligible(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("trickortreat", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || trickortreatWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !trickortreatWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            return !!facts && facts.types.indexOf("psychic") >= 0 ? 80 : 62;
        }
    });
}
