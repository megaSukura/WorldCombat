/**
 * 万圣夜 的伙伴 AI 用途：这招自己的一套出手计划，敌我两面。
 *
 * 对敌（world_combat:control）：有一个看得见、够得着（ai.maxChase 内）、视线畅通、属性单一且不是幽灵的
 *   宝可梦威胁。什么时候最想出手：目标带超能属性时 priority 抬到 80——外壳一上，幽灵与恶对它效果绝佳，是
 *   队友幽灵招的口子；其余可套目标 62，把它的受击面翻成幽灵，打开幽灵／恶的弱点。
 * 对友（world_combat:bolster）：身边有看得见、带伤或正在交战的队友，且它还没被套壳。priority 58（交战中／
 *   刚受伤）或 24（顺手）。壳替它挡下一般与格斗，代价是添上幽灵／恶的弱点。
 * 对谁出手：敌人是当前威胁；友方是共享伙伴感官挑来的伙伴；已经带着 trickortreat 的目标跳过，避免浪费 20 发 PP。
 * 放不上就不出手：只有单属性、非幽灵、属性未被锁定的宝可梦套得上；非宝可梦没有属性，明确拒绝。
 * 够不到怎么办：reach 就是套壳距离（偏短），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 *
 * 说明：队友的招式组合不在共享观测里，所以「避免帮敌免疫主输出」只做到不主动往已有幽灵／属性层已满的目标上套，
 *   无法逐招读出队友的一般／格斗输出比重；这一层判断留给玩家试玩。
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

    /** 把壳送给需要挡一般／格斗的队友：可见、带伤或正在交战、还没被套过。 */
    function trickortreatSupports(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity): boolean {
        const self = source(context);
        if (!ally || ally.health <= 0 || !ally.visible || !ally.friendly) return false;
        if (ally.ref === self.ref) return false;
        if (status(context, ally, "trickortreat")) return false;
        if (!trickortreatEligible(context, ally)) return false;
        if (!context.senses["world_combat:threat"]) return false;
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, ally.point) > ai<number>(item, "maxChase", 10)) return false;
        return !!world(context).clear(point(self.point), point(ally.point));
    }

    registerUse("trickortreat", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return target.friendly ? trickortreatSupports(context, item, target) : trickortreatWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || target.health <= 0) return 0;
            if (target.friendly) {
                if (!trickortreatSupports(context, item, target)) return 0;
                const engaged = target.attacking || (typeof target.hurtAgo === "number" && target.hurtAgo < 60);
                return engaged ? 58 : 24;
            }
            if (!trickortreatWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            return !!facts && facts.types.indexOf("psychic") >= 0 ? 80 : 62;
        }
    });
}
