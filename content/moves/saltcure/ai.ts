/**
 * 盐腌 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，在 ai.maxChase 之内，而且身上还没有 saltcure 身份（腌过再腌是浪费）。
 * 对谁出手：默认（ai.brittle 开）优先钢/水属性或湿身的目标——盐对他们翻倍；关闭则按生命高低排序。
 * 够不到怎么办：reach 就是投盐距离，超出先由共享接近逻辑走近。
 * 放完之后：盐壳自己按间隔蛰下去，伙伴交回共享顺序继续交战或转去别的目标。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("saltcure", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.brittle", "优先钢水目标"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function saltcureBrittleTarget(context: WorldBehavior.Context, target: Entity): boolean {
        if (target.wet) return true;
        const facts = pokemonFacts(context, target);
        return !!facts && (facts.types.indexOf("steel") >= 0 || facts.types.indexOf("water") >= 0);
    }

    registerUse("saltcure", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            if (status(context, target, "saltcure")) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !status(context, target, "saltcure");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const inRange = distance(source(context).point, target.point) <= capability.data.range;
            let score = inRange ? 30 : 0;
            if (ai<boolean>(capability, "brittle", true) && saltcureBrittleTarget(context, target)) score += 15;
            return score + Math.round(ratio(target) * 8);
        }
    });
}
