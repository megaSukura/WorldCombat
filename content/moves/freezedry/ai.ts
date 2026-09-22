/**
 * 冷冻干燥 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 ai.maxChase 之内；够不到交给共享接近逻辑。
 * 对谁出手：默认（ai.soaked 开）优先扑水属性或身在水里的目标——这一招对他们相性翻倍，值得先手；
 *   关闭后对所有目标一视同仁，只按射程与生命排序。
 * 放完之后：命中即结算，冰冻是概率；伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("freezedry", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.flag("ai.soaked", "优先水湿目标"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function freezedryTargetSoaked(context: WorldBehavior.Context, target: Entity): boolean {
        if (target.wet) return true;
        const facts = pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("water") >= 0;
    }

    registerUse("freezedry", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 22 : 0;
            if (ai<boolean>(capability, "soaked", true) && freezedryTargetSoaked(context, target)) score += 18;
            return score + Math.round(ratio(target) * 8);
        }
    });
}
