/**
 * 睡觉 / Rest —— 参数与数值来源。
 *
 * 机制：就地睡下一个可被打断的长窗口。睡满整段回复全部缺失生命并治愈六种主异常；中途被任何伤害惊醒，
 *   只按「已睡比例」结算回复，并追加一段迟缓。睡满一觉（沉睡档）还附带共享身份的状态 world_combat:refreshed
 *   （移动加速，见 startup.ts）。
 * 数值来源：睡眠时长随速度缩短（灵敏的个体坐不住，窗口更短也更安全）；神清气爽持续随等级与亲密度增长；
 *   起床气随体重增长（大块头更迟钝）。
 * 与原生：取原生「连续睡2回合、回复全部HP并治愈异常」的代价是回合制的时间；在即时战斗里这段时间表现为
 *   一段不能行动、可被任意伤害打断的睡眠窗口，回复按睡到的比例结算，被惊醒则没有加速奖励。
 */
namespace PokemonSkills {
    export const restId = "rest";
    actionParameters.define(restId, {
        sleepTicks: seconds(F.base(90).minus(F.stat("speed").times(0.3)).clamp(45, 100).as("速度修正"), "睡眠时长",
            "睡满这段时间才会彻底恢复；被任何伤害命中会提前惊醒，只能按已睡比例回复。"),
        heal: percent(F.when(F.pref("shortNap"), F.const(0.6), F.const(1)), "恢复比例",
            "睡满时首先补上的缺失生命比例；被提前惊醒时再按已睡比例打折。"),
        refreshTicks: seconds(F.base(140).plus(F.level().times(2)).plus(F.individual("friendship").times(0.2)).clamp(140, 360).as("成长与羁绊"),
            "神清气爽持续", "睡满一觉后获得的移动加速时间；被提前惊醒不会获得。"),
        wakeSlowTicks: seconds(F.base(50).plus(F.body("weight").times(0.1)).clamp(50, 110).as("体重修正"), "起床气持续",
            "被提前惊醒后的迟缓时间，越重越久。")
    });
    stages(restId, [
        { level: 40, values: { cooldown: 260 } },
        { level: 60, values: { cooldown: 220 } }
    ]);
    describe(restId, [
        { key: "description.0", values: ["sleepTicks", "heal"] },
        { key: "description.1", values: ["refreshTicks", "wakeSlowTicks"] },
        { key: "stance.deep", values: [], when: function (context) { return read(context.detail.values, ["shortNap"]) !== true; } },
        { key: "stance.nap", values: [], when: function (context) { return read(context.detail.values, ["shortNap"]) === true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
