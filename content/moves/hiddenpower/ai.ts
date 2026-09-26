/**
 * 觉醒力量的 AI：一枚远程特殊单发，按本个体真正的觉醒属性挑克制的对手。
 *
 * 局面：有敌对目标且在其射程内就用它；够不到时共享任务负责走近。放完后继续常规交战，不做额外收尾。
 * 属性：本个体六项个体值算出的觉醒属性经只读探针读取，与已知目标的属性相乘得到相性倍率——克制时排到前列，
 *   相性为 0（免疫）则不出手；目标不是宝可梦或类型未知（其他模组的普通生物）时按普通远程分。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_hiddenpower/type", function (access, actor) {
        return String(actor.domain()) === "cobblemon" ? hiddenpowerTypeOf(CobblemonCombat.pokemon(actor)) : "";
    });

    /** 本个体觉醒属性对目标已知属性的相性倍率；-1 表示目标类型未知（按普通远程对待）。 */
    function hiddenpowerCoverage(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const type = CompanionBehavior.fact<string>(context, "world_combat:move_hiddenpower/type", CompanionBehavior.source(context));
        if (!type) return -1;
        const facts = CompanionBehavior.pokemonFacts(context, target);
        if (!facts || !Array.isArray(facts.types) || !facts.types.length) return -1;
        let factor = 1;
        for (let index = 0; index < facts.types.length; index++)
            factor *= CobblemonCombat.typeEffectiveness(type, facts.types[index]);
        return factor;
    }

    CompanionBehavior.registerUse(hiddenpowerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return !!target && target.health > 0; },
        accepts: function (context, item, target) { return target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            const factor = hiddenpowerCoverage(context, target);
            if (factor > 1) return 22;
            if (factor === 0) return 0;
            return 5;
        }
    });
}
