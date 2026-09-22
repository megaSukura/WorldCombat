/**
 * 祈愿 的伙伴 AI：愿星延迟兑现，所以要在还撑得住的时候提前许下，而不是等见底。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时，比睡觉与回复指令更早动用。
 * 对谁出手：只有自己（kind self），reach 0；愿星落在施法者脚下，开启分享后圈里的伙伴一并受益。
 * 放完之后：愿星仍在原地计时，伙伴按共用计划继续交战、走位或撤退；愿星到点自行兑现。
 * 配置：share 布尔决定兑现时是否治疗圈内伙伴（自己的比例相应摊薄）。
 */
namespace CompanionBehavior {
    const wishHealBelow = PokemonSkills.number("ai.healBelow", "祈愿阈值", 0.3, 0.9, 0.05);
    wishHealBelow.help = "伙伴自身生命低于该比例时就提前许愿；调低更倾向硬撑，调高则一受伤就兑现一张延迟治疗。";

    PokemonSkills.addPreferences("wish", { share: false, helpFriends: false, ai: { healBelow: 0.7 } }, [wishHealBelow]);

    registerUse("wish", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) { return ratio(source(context)) < ai<number>(item, "healBelow", 0.7); },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
