/**
 * 变小 / minimize — 参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 10、目标 self、boosts { evasion: +2 }、volatileStatus "minimize"，
 *   原作里同时让踩踏／重磅一类招式对缩小者必定命中且伤害翻倍。
 *
 * 翻译：把「蜷缩身体显得很小，从而大幅提高自己的闪避率」翻成**把身体缩成一团**——打向它的攻击更容易落空，
 *   但明显更大的身体踩下来时挨得更重。取原生「闪避 +2、PP 10、缩小者怕踩」；放弃回合制里把闪避写成命中率修正——
 *   即时交战里闪避等级只作宝可梦的原生读数，真正「打不中」由本单元的入场伤害规则承担（见 skill.ts）。
 *   它是本族里唯一真正改变体型的招，也是唯一带明确弱点的招；与影子分身（残影替你挨打）分开：这里没有替身，
 *   身体本身更小、更滑，一次踩空或一脚踩实都由命中那一刻决定。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   evade    闪避等级：大胆 3 级／谨慎 2 级；夹 2..3。原生 +2 是基准，配置把它在两向之间挪一格。
 *   window   缩小窗口：基础 160 刻 + 速度×0.8 + 等级×2.5，大胆再 ×0.85；夹 100..400。速度与等级越高，缩着的时间越久。
 *   small    收缩尺度：基础 0.62 − 碰撞箱高度×0.05；夹 0.45..0.80。越高大的身体缩得越明显（表现里的壳与地环按它收拢）。
 *   dodge    闪避概率：谨慎 18%／大胆 27%，再加速度/2200；夹 10%..50%。速度越快越难被打中，粒子与浮字按它表现。
 *   trample  踩踏加成：谨慎 1.5×／大胆 1.75×；夹 1.40..1.80。大体型（体积 ≥ 1.3×）打中它时按它放大伤害。
 *   motes    缩身尘点：基础 16 + 速度×0.25；夹 16..70。速度越高，缩起来带动的尘点越多，粒子按它发射。
 *   pulses   收缩拍数：基础 2 + 等级/26；夹 2..4。等级越高，多收几拍。
 *   tempo    起手：基础 6 刻 − 速度×0.03，大胆再 +3；夹 3..12。越快的个体缩得越快，大胆更慢。
 *   aftercast 收招：基础 4 刻 + 碰撞箱高度×0.8；夹 4..9。
 *   wait     冷却：基础 120 刻 − 等级×0.5，大胆 ×0.9／谨慎 ×1.05；夹 70..150。PP 10 的代价。
 * 配置 bold（大胆缩小）双向取舍：大胆＝闪避 3 级、更难被打中，但被大体型踩中的加成更高（1.75×）、缩着的时间更短；
 *   谨慎＝闪避 2 级、踩踏加成更低、缩得更久。更高的回避 vs 更低的破绽，两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("minimize", {
        /** 闪避等级：大胆 3 级／谨慎 2 级。 */
        evade: formula(
            F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(3), F.const(2)).clamp(2, 3).round(0),
            "闪避等级", {
                unit: " 级",
                description: "缩小之后抬高的闪避等级；大胆 3 级，谨慎 2 级。"
            }),
        /** 缩小窗口：速度与等级决定缩多久，大胆更短。 */
        window: seconds(
            F.base(160).plus(F.stat("speed").times(0.8)).plus(F.level().times(2.5))
                .times(F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(0.85), F.const(1)))
                .clamp(100, 400).round(0),
            "缩小窗口", "身体缩着多久；速度与等级越高越久，大胆缩小更短。窗口走完或被清除时，闪避等级收回。"),
        /** 收缩尺度：越高大的身体缩得越明显，也是表现里壳与地环的收拢倍率。 */
        small: formula(
            F.base(0.62).minus(F.body("height").times(0.05)).clamp(0.45, 0.80).round(2),
            "收缩尺度", {
                format: function (value: number) { return String(Math.round(value * 100) / 100) + "×"; },
                description: "缩到原来的多大；越高大的身体缩得越明显，画面里的壳与地环按它收拢。"
            }),
        /** 闪避概率：打向缩小者的攻击有这么多机会落空。 */
        dodge: percent(
            F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(0.27), F.const(0.18))
                .plus(F.stat("speed").div(2200)).clamp(0.10, 0.50),
            "闪避概率", "打向缩小者的攻击落空的机会；大胆更高，速度越快越高。"),
        /** 踩踏加成：大体型打中缩小者时的伤害倍率。 */
        trample: formula(
            F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(1.75), F.const(1.5)).clamp(1.4, 1.8).round(2),
            "踩踏加成", {
                format: function (value: number) { return String(Math.round(value * 100) / 100) + "×"; },
                description: "体积 ≥ 1.3 倍的身体打中缩小者时的伤害倍率；大胆更高，这是它换来的破绽。"
            }),
        /** 缩身尘点：速度越高越多。 */
        motes: formula(
            F.base(16).plus(F.stat("speed").times(0.25)).clamp(16, 70).round(0),
            "缩身尘点", {
                unit: " 点",
                description: "一次缩身带起的尘点数量；速度越高越多，粒子按它发射。"
            }),
        /** 收缩拍数：等级越高多收几拍。 */
        pulses: formula(
            F.base(2).plus(F.level().div(26)).clamp(2, 4).round(0),
            "收缩拍数", {
                unit: " 拍",
                description: "身体收几拍；等级越高越多，画面按它一下下收拢。"
            }),
        /** 起手：速度决定缩多快，大胆更慢。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(3), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "缩成一团需要多久；速度越快越短，大胆缩小更慢。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(0.8)).clamp(4, 9).round(0),
            "收招", "缩回来之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，大胆更短。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(0.9), F.const(1.05)))
                .clamp(70, 150).round(0),
            "冷却", "两次缩小之间的等待；等级越高越短，大胆更短。PP 10 的代价。")
    });

    stages("minimize", [
        { level: 36, values: { window: 280, wait: 100 } },
        { level: 56, values: { window: 340, wait: 88 } }
    ]);

    describe("minimize", [
        { key: "description.0", values: ["evade", "dodge"] },
        { key: "bold.on", values: [], when: function (context) { return read(context.detail.values, ["bold"]) === true; } },
        { key: "bold.off", values: [], when: function (context) { return read(context.detail.values, ["bold"]) !== true; } },
        { key: "description.1", values: ["window", "trample"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
