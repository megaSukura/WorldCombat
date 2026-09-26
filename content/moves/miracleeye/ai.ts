/**
 * 奇迹之眼 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）且视线畅通的威胁，自己身上还没有同一次心眼。
 * 什么时候最想出手：目标的属性里有恶时 priority 抬到 90——心眼之后超能才接得上；对手正在拉开（fleeing）时 74；
 *   己方有超能属性可兑现、或自己当下的命中等级已经偏低时 66，这一眼顺手抬自己的准星；其余 44，没收益不优先。
 * 对谁出手：当前威胁；已经带着 miracleeye 身份的目标跳过。识破不再互相拒绝：两者各自叠加／清理，唯一共享的是
 *   同一份正闪避，下一次看穿前会先还回上一份。
 * 够不到怎么办：reach 就是心眼距离（按体型估算），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：印记留在目标身上、超能接得上、自己命中被抬高；印记还在时不重复。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 *
 * 说明：队友的招式属性不在共享观测里，所以「己方有超能输出」用当前可读到的属性作近似：自己或附近队友带超能属性
 *   即视为有兑现价值。真实的招式组合差异留给玩家试玩判断。
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

    function miracleeyeHasPsychic(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && Array.isArray(facts.types) && facts.types.indexOf("psychic") >= 0;
    }

    /** 己方（含自己）有超能属性，心眼兑现后能直接接上。 */
    function miracleeyePartyPsychic(context: WorldBehavior.Context): boolean {
        if (miracleeyeHasPsychic(context, source(context))) return true;
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === source(context).ref) continue;
            if (miracleeyeHasPsychic(context, other)) return true;
        }
        return false;
    }

    function miracleeyeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "miracleeye")) return false;
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
            if (miracleeyeTargetDark(context, target)) return 90;
            if (fleeing(context, target)) return 74;
            if (miracleeyePartyPsychic(context) || stage(context, source(context), "accuracy") < 0) return 66;
            return 44;
        }
    });
}
