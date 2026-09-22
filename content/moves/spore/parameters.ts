/**
 * 蘑菇孢子 / Spore —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Grass／变化／威力 0／命中 100／PP 15／单体，命中后目标陷入睡眠；flags 含
 *   powder（粉末类，草属性对粉末免疫）。
 *
 * 世界化：把「沙沙沙地撒满孢子」翻成**原地抖开一身蘑菇孢子**——孢子在一瞬间炸满周围一小片，贴得越近
 *   越躲不掉。它是四式中**最可靠的一记**：命中接近必然（参数只读施法者自己的数据，几乎不落空），
 *   但只够到很近的地方，冷却也最长，而且什么都不留下（不像催眠粉铺一片云）。草属性穿过孢子。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   burstRadius  孢子爆开半径：体宽（抖得越开）＋ 特攻（孢子越鼓），配置「密孢」收窄。
 *   sleepTicks   睡多久（本组最长）：特攻 ＋ 亲密度，配置「密孢」延长。
 *   maxTargets   一次最多罩住几人：等级，配置「蓬孢」多一个。
 *   landChance   沾上孢子的概率（本组最高）：只读施法者特攻与等级——孢子太密，几乎必中。
 *   spores       孢子颗粒数：特攻 ＋ 等级台阶；它同时是画面里孢子的数量。
 *   sporeSpeed   孢子向外炸开的初速：速度。
 *   puffSize     单颗孢子的个头：身高（个高的抖出更大的孢子团）。
 *   tempo        起手：速度。
 *   aftercast    收招：速度。
 *   recharge     冷却（本组最长）：等级，配置「密孢」更久。
 *
 * 配置 `dense`（密孢）双向取舍：开启＝孢子半径 ×0.8、睡眠 ×1.2、沾上概率更高，但冷却 ×1.15、罩住的人更少；
 *   关闭（蓬孢）＝半径 ×1.25、最多罩住的人 +1、冷却 ×0.9，但睡眠 ×0.85。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const sporeId = "spore";
    export const sporeScene = "world_combat:move_spore";

    actionParameters.define(sporeId, {
        /** 孢子半径：2.2 + 体宽偏移[−0.3,1.1] + 特攻偏移[−0.15,0.5]；密孢 ×0.8／蓬孢 ×1.25；夹 1.5..3.4。 */
        burstRadius: formula(
            F.base(2.2)
                .plus(F.body("width").minus(0.9).times(0.9).clamp(-0.3, 1.1))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.5))
                .times(F.when(F.pref("dense"), F.const(0.8), F.const(1.25)))
                .clamp(1.5, 3.4).round(2),
            "孢子半径", {
                unit: " 格",
                description: "孢子一瞬间炸满的半径；体型越宽抖得越开、特攻越高越鼓。它是本招的实际覆盖与指示圈半径。"
            }),
        /** 睡眠时长：260 + 特攻偏移[−40,140] + 亲密度×0.4；密孢 ×1.2／蓬孢 ×0.85；夹 160..460。 */
        sleepTicks: seconds(
            F.base(260)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-40, 140))
                .plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("dense"), F.const(1.2), F.const(0.85)))
                .clamp(160, 460).round(0),
            "睡眠时长", "孢子带走的睡眠有多久；它是四式里最长的一档，特攻越高、越亲近睡得越沉。"),
        /** 最多罩住：3 + 等级(≥30)偏移[0,3] + 蓬孢 +1；夹 2..6。 */
        maxTargets: formula(
            F.base(3).plus(F.level().minus(30).times(0.06).clamp(0, 3))
                .plus(F.when(F.pref("dense"), F.const(0), F.const(1)))
                .clamp(2, 6).round(0),
            "最多罩住", {
                unit: " 人",
                description: "一次最多让几个人沾上孢子；等级越高罩得越多，蓬孢式再放宽一个。"
            }),
        /** 沾上概率：0.88 + 特攻偏移[0,0.08] + 等级(≥30)偏移[0,0.05]；密孢 ×1.03；夹 0.80..0.99。 */
        landChance: percent(
            F.base(0.88)
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(0, 0.08))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.05))
                .times(F.when(F.pref("dense"), F.const(1.03), F.const(1)))
                .clamp(0.80, 0.99),
            "沾上概率", "贴着孢子的人沾上的概率；它只读施法者自己——孢子太密，几乎必中。太远或免疫的人除外。"),
        /** 孢子量：22 + 特攻偏移[0,26]；夹 16..56；等级台阶再抬。 */
        spores: formula(
            F.base(22).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(0, 26)).clamp(16, 56).round(0),
            "孢子量", {
                unit: " 粒",
                description: "一次炸出的孢子数量；特攻越高越多，也是画面里孢子喷出的数量。"
            }),
        /** 孢子初速：1.1 + 速度偏移[−0.2,0.6]；夹 0.9..1.7。 */
        sporeSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.2, 0.6)).clamp(0.9, 1.7).round(2),
            "孢子初速", {
                unit: "格/刻",
                description: "孢子向外炸开的初速；速度快的个体喷得更急，覆盖到边缘也更利落。"
            }),
        /** 单颗孢子个头：0.18 + 身高偏移[−0.04,0.20]；夹 0.14..0.40。 */
        puffSize: formula(
            F.base(0.18).plus(F.body("height").minus(1.2).times(0.08).clamp(-0.04, 0.2)).clamp(0.14, 0.4).round(3),
            "孢子个头", {
                unit: " 格",
                description: "单颗孢子的大小；个高的个体抖出的孢子团更大，画面里的孢子也按它放大。"
            }),
        /** 起手：8 − 速度偏移[−2,3]；夹 5..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手", "鼓起一身孢子、抖开的时间；速度越快越短。"),
        /** 收招：8 − 速度偏移[−1.5,2.5]；夹 5..13。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(5, 13).round(0),
            "收招", "孢子炸完、收回身子的时间。"),
        /** 冷却：(150 − 等级(≥30)偏移[0,20]) × 密孢 1.15／蓬孢 0.9；夹 90..190。 */
        recharge: seconds(
            F.base(150).minus(F.level().minus(30).times(0.6).clamp(0, 20))
                .times(F.when(F.pref("dense"), F.const(1.15), F.const(0.9)))
                .clamp(90, 190).round(0),
            "冷却", "两轮孢子之间的等待；它是四式里最长的一档，等级越高回得越快，密孢式缓得更久。")
    });

    stages(sporeId, [
        { level: 40, values: { spores: 32, maxTargets: 4 } },
        { level: 55, values: { spores: 42, sleepTicks: 340, burstRadius: 2.7 } }
    ]);

    describe(sporeId, [
        { key: "description.0", values: ["burstRadius", "maxTargets", "sporeSpeed"] },
        { key: "description.1", values: ["landChance", "sleepTicks"] },
        { key: "description.2", values: ["spores", "puffSize"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spores", "tier.0.maxTargets"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spores", "tier.1.sleepTicks", "tier.1.burstRadius"] }
    ]);
}
