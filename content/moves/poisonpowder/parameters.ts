/**
 * 毒粉 / Poison Powder — 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Poison／变化／威力 0／命中 75／PP 35／单体，命中后目标中毒；
 *   flags 含 powder（粉末类，草属性对粉末免疫）。毒属性与钢属性对中毒免疫（共享默认规则自动生效）。
 *
 * 世界化：把「撒出毒粉」翻成一撮**当空撒开、立刻落下就完事的毒尘**——施法者把粉团抛向选定的落点，
 *   落地立刻炸开，把圈里的人一次全毒上，然后什么都不留下。它是四式状态里最便宜、最不占地方的出手：
 *   短距离、小范围、短冷却，用来顺手把贴身的目标们点上毒；不像毒瓦斯留一片会爆燃的云，也不像剧毒会越钻越深。
 *   草属性穿过粉末，毒属性与钢属性穿过中毒。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   reach        撒粉距离（实际射程）：等级（经验越足抛得越准越远）。
 *   dustRadius   落点覆盖半径：体宽（撒得越开）＋ 特攻（粉团越鼓），配置「黏附」收窄。
 *   poisonTicks  中毒时长：特攻（毒性越厚留得越久），配置「黏附」延长。
 *   puffSpeed    抛粉速度：速度（快个体抛得更急）。
 *   motes        尘粒数：特攻 ＋ 等级台阶；它同时是画面里炸开的毒尘数量。
 *   tempo        起手：速度（越快越早撒）。
 *   recharge     冷却：等级（越熟练回得越快），配置「黏附」略久。
 *
 * 配置 `cling`（黏附）双向取舍：开启＝半径 ×0.8、中毒 ×1.3，但冷却 ×1.1，用来把单个硬目标毒得久；
 *   关闭＝撒得更开（半径 ×1.15）、冷却 ×0.9、中毒 ×0.8，用来一次点上挤在一起的一小群。两个方向各有适用局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const poisonpowderId = "poisonpowder";

    actionParameters.define(poisonpowderId, {
        /** 撒粉距离：6 + 等级(≥25)偏移[0,1.5]；夹 5..10。 */
        reach: formula(
            F.base(6).plus(F.level().minus(25).times(0.06).clamp(0, 1.5)).clamp(5, 10).round(2),
            "撒粉距离", {
                unit: "格",
                description: "粉团能抛到多远的落点；等级越高抛得越远。它也是本招的实际射程。"
            }),
        /** 落点覆盖半径：1.5 + 体宽偏移[−0.3,1.0] + 特攻偏移[−0.15,0.5]；黏附 ×0.8 / 散撒 ×1.15；夹 1.2..2.8。 */
        dustRadius: formula(
            F.base(1.5)
                .plus(F.body("width").minus(0.9).times(0.9).clamp(-0.3, 1.0))
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .times(F.when(F.pref("cling"), F.const(0.8), F.const(1.15)))
                .clamp(1.2, 2.8).round(2),
            "落点覆盖半径", {
                unit: "格",
                description: "粉团落地炸开时罩住的半径；体型越宽、特攻越高铺得越开。它也是指示圈与实际判定半径。"
            }),
        /** 中毒时长：220 + 特攻偏移[−40,100]；黏附 ×1.3 / 散撒 ×0.8；夹 140..420。 */
        poisonTicks: seconds(
            F.base(220).plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-40, 100))
                .times(F.when(F.pref("cling"), F.const(1.3), F.const(0.8)))
                .clamp(140, 420).round(0),
            "中毒时长", "被毒上之后持续掉血多久；特攻越高毒性越厚，黏附式留得更久。"),
        /** 抛粉速度：1.2 + 速度偏移[−0.2,0.6]；夹 0.9..1.8。 */
        puffSpeed: formula(
            F.base(1.2).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.2, 0.6)).clamp(0.9, 1.8).round(2),
            "抛粉速度", {
                unit: "格/刻",
                description: "粉团脱手飞向落点的速度；速度快的个体抛得更急，目标更难在它落下前走开。"
            }),
        /** 尘粒数：14 + 特攻偏移[0,18]；夹 10..40；等级台阶再抬。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.25).clamp(0, 18)).clamp(10, 40).round(0),
            "尘粒数", {
                unit: "粒",
                description: "粉团炸开时撒出的毒尘数量；特攻越高越密，也是画面里毒尘的数量。"
            }),
        /** 起手：7 − 速度偏移[−2,3]；夹 4..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(4, 11).round(0),
            "起手", "把粉团拢好、脱手的时间；速度越快越短。"),
        /** 冷却：24 − 等级(≥25)偏移[0,6]；黏附 ×1.1 / 散撒 ×0.9；夹 14..40。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(25).times(0.15).clamp(0, 6))
                .times(F.when(F.pref("cling"), F.const(1.1), F.const(0.9)))
                .clamp(14, 40).round(0),
            "冷却", "两次撒粉之间的等待；等级越高回得越快。它的冷却最短，可以反复顺手点毒。")
    });

    stages(poisonpowderId, [
        { level: 40, values: { motes: 22 } },
        { level: 55, values: { motes: 28, poisonTicks: 280 } }
    ]);

    describe(poisonpowderId, [
        { key: "description.0", values: ["reach", "dustRadius", "puffSpeed"] },
        { key: "description.1", values: ["poisonTicks"] },
        { key: "cling.on", values: [], when: function (context) { return read(context.detail.values, ["cling"]) === true; } },
        { key: "cling.off", values: [], when: function (context) { return read(context.detail.values, ["cling"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.poisonTicks"] }
    ]);
}
