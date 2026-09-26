/** AI uses the current medium and the called recipe's resolved reach. */
namespace CompanionBehavior {
    registerUse("naturepower", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            return !!target && target.health > 0;
        },
        accepts: function (context, item, target) {
            var goal = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12);
        }
    });

    PokemonSkills.addPreferences("naturepower", { charged: false, ai: { maxChase: 12, leaveStation: false } },
        [PokemonSkills.flag("charged", "催发自然之力"), PokemonSkills.number("ai.maxChase", "出手距离", 2, 32, 1),
            PokemonSkills.flag("ai.leaveStation", "驻守时离位")]);
}
