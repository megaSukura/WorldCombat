/**
 * 回复指令 / Heal Order —— 参数与数值来源。
 *
 * 机制：召唤一队手下环绕施法者引导，片刻后每个幸存的手下把一份治疗交给施法者；由存活数量决定总回复量，
 *   全部被打掉就什么也回不到。
 * 数值来源：回复比例随特攻增长；手下面数随等级增多；引导时间随速度缩短；环绕半径随体型高度增大；
 *   手下生命随「精锐」档位提高（更少但更耐打，单个阵亡损失更大）。
 * 与原生：取原生「召唤手下疗伤、回复最大HP的一半」的画面与数额，改成若干个可被击杀的参与者共同交付，
 *   让「手下」这件事真的能被打断，而不只是一个特效。
 */
namespace PokemonSkills {
    export const healorderId = "healorder";
    actionParameters.define(healorderId, {
        heal: percent(F.base(0.45).plus(F.stat("specialAttack").times(0.0006)).clamp(0.35, 0.65).as("特攻转化"), "回复比例",
            "全部手下都交付时，施法者按其最大生命回复的比例；被击杀的手下少交一份。"),
        attendants: formula(F.base(3).plus(F.level().times(0.06)).floor().clamp(3, 6), "手下面数",
            { unit: " 只", description: "召唤的手下数量，随等级增多；精锐档位减半但每只更耐打。" }),
        channelTicks: seconds(F.base(50).minus(F.stat("speed").times(0.15)).clamp(28, 50).as("速度修正"), "引导时间",
            "手下环绕引导多久才交付治疗；这段时间它们可以被攻击。"),
        orbitRadius: formula(F.base(1.6).plus(F.body("height").times(0.3)).clamp(1.2, 2.4).as("体型修正"), "环绕半径",
            { unit: " 格", description: "手下环绕施法者的半径。" }),
        attendantHealth: formula(F.when(F.pref("elite"), F.const(10), F.const(4)).as("档位"), "手下生命",
            { unit: " 点", description: "每个手下的生命；被打掉就不再交付它那一份。" })
    });
    stages(healorderId, [
        { level: 40, values: { cooldown: 170 } },
        { level: 60, values: { cooldown: 140 } }
    ]);
    describe(healorderId, [
        { key: "description.0", values: ["heal", "attendants"] },
        { key: "description.1", values: ["channelTicks", "orbitRadius", "attendantHealth"] },
        { key: "stance.elite", values: [], when: function (context) { return read(context.detail.values, ["elite"]) === true; } },
        { key: "stance.swarm", values: [], when: function (context) { return read(context.detail.values, ["elite"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
