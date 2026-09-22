/**
 * 吞下 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：身上攒着蓄力层数、且血量低于 ai.cashBelow 时，把层数兑现成回复。
 * 什么时候最想出手：默认（ai.emergency 关闭）要攒到 ai.minLayers 层（默认 2，与蓄力默认的攒层数一致）才吞，priority 60；
 *   开启 ai.emergency 时，血量掉到 cashBelow 以下、哪怕只有一层也先吞保命，priority 75。
 * 对谁出手：只有自己（kind self），不需要接近。
 * 放完之后：层数被消费、蓄力单元按共享身份收回每层的防御/特防，伙伴回到共享计划（需要时再补蓄力）。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_swallow/layers", function (access, actor, _argument) {
        return PokemonSkills.swallowLayers(access, actor);
    });

    const swallowBelow = PokemonSkills.number("ai.cashBelow", "兑现血量", 0.2, 1, 0.05);
    swallowBelow.help = "自身生命低于这个比例时，伙计才打算把蓄力吞下去；调低更舍不得吞、调高更早兑现。";
    const swallowMinLayers = PokemonSkills.number("ai.minLayers", "至少攒到", 1, 3, 1);
    swallowMinLayers.help = "打算攒到几层再吞；3 层一口回满，调低则更早兑现但回得更少。";
    const swallowEmergency = PokemonSkills.flag("ai.emergency", "危急先吞");
    swallowEmergency.help = "开启：血量低于兑现血量时，哪怕只有一层也先吞保命；关闭：不足最少层数就先不吞，继续等蓄力。";

    registerUse("swallow", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        available: function (context, item) {
            const self = source(context);
            if (context.facts.mounted) return false;
            const layers = fact<number>(context, "world_combat:move_swallow/layers", self) || 0;
            if (layers <= 0 || ratio(self) >= ai<number>(item, "cashBelow", 0.7)) return false;
            const enough = layers >= ai<number>(item, "minLayers", 2);
            return enough || ai<boolean>(item, "emergency", false);
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item) {
            const self = source(context);
            const layers = fact<number>(context, "world_combat:move_swallow/layers", self) || 0;
            if (layers <= 0 || ratio(self) >= ai<number>(item, "cashBelow", 0.7)) return 0;
            if (layers >= ai<number>(item, "minLayers", 2)) return 60;
            return ai<boolean>(item, "emergency", false) ? 75 : 0;
        }
    });

    PokemonSkills.addPreferences("swallow", { sipping: false, ai: { cashBelow: 0.7, minLayers: 2, emergency: false } }, [
        PokemonSkills.flag("sipping", "慢咽"),
        swallowBelow,
        swallowMinLayers,
        swallowEmergency
    ]);
}
