/**
 * 钢翼 / steelwing —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Steel／物理／威力 70／命中 90／PP 25／接触；命中后有 10% 让自身防御 +1。
 * 翻译：把「用坚硬的翅膀敲打对手，有时提高自己的防御」落成**侧身一记横扫**——钢翼像门板一样平扫过身前的一整扇，
 *   把挤在面前的人一起掀开；翼面越硬、扫中的东西越沉，防御就越稳地抬起来。它是四式里唯一横向成扇、能同时照顾多人的一记。
 *
 * 与同族分开：金属爪是贴脸两点、磨的是攻击；钢翼是横向一大扇、把面前的人一起扫开、磨的是防御——站得越靠前越容易被一扫带走。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   wing          横扫威力：防御给出翼面硬度、物攻给出挥砸的狠度；滑翔式把力摊到更宽的一扇上、单点略轻。
 *   reach         扇面半径：身高与速度；决定能扫到多远。
 *   span          扇面角度：速度；转体快的个体扫得更开。
 *   knock         击退：体重与防御；越沉越硬的翼把人推得越远。
 *   hardenChance  升防几率：防御与等级；翼面越硬越像敲钟。
 *   hardenStages  升防级数：等级 50 台阶抬到 2。
 *   glideDist     滑行距离（滑翔式）：速度。
 *   feathers      钢羽数量：防御与速度派生，表现按它发射。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却；滑翔式以更慢更贵换更宽更远的一扫。
 *
 * 配置 `glide`（滑翔扫）双向取舍：开启＝先向前滑一段再横扫、扇面更宽、击退更远、升防更稳，但起手与冷却更久，
 * 也可能为扫人而滑进敌阵；关闭＝原地横扫，更快更便宜、扇面略窄。两个方向对应「扫一片」与「守住原位」。
 */
namespace PokemonSkills {
    actionParameters.define("steelwing", {
        /** 横扫威力：70 + 防御偏移[−12,34] + 物攻偏移[−6,16]；滑翔 ×0.94 / 原地 ×1.08；夹 40..150。 */
        wing: formula(
            F.base(70).plus(F.stat("defence").minus(55).times(0.20).clamp(-12, 34))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-6, 16))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(0.94), F.const(1.08)))
                .clamp(40, 150).round(1),
            "横扫威力", {
                unit: "威力",
                description: "钢翼扫中每个人时那一下的威力；翅膀越硬、身体越有劲越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扇面半径：3.2 + 身高偏移[−0.2,0.8] + 速度偏移[−0.2,0.5]；滑翔 ×1.10；夹 2.60..4.80。 */
        reach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.2, 0.8))
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(1.10), F.const(1)))
                .clamp(2.60, 4.80).round(2),
            "扇面半径", {
                unit: "格",
                description: "钢翼从身体向外平扫能覆盖多远；身长、腿快的个体够得更远，滑翔式再探出去一点。"
            }),
        /** 扇面角度：120 + 速度偏移[−20,45]；滑翔 ×1.12；夹 90..180。 */
        span: formula(
            F.base(120).plus(F.stat("speed").minus(60).times(0.30).clamp(-20, 45))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(1.12), F.const(1)))
                .clamp(90, 180).round(0),
            "扇面角度", {
                unit: "度",
                description: "横扫张开的总角度；转体快的个体扫得更开，滑翔式再宽一档。"
            }),
        /** 击退：0.5 + 体重偏移[−0.1,0.5] + 防御偏移[0,0.25]；滑翔 ×1.25；夹 0.25..1.20。 */
        knock: formula(
            F.base(0.5).plus(F.body("weight").minus(50).times(0.0012).clamp(-0.1, 0.5))
                .plus(F.stat("defence").minus(55).times(0.001).clamp(0, 0.25))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(1.25), F.const(1)))
                .clamp(0.25, 1.20).round(2),
            "击退", {
                unit: "格",
                description: "命中后把每个人沿背离施法者的方向推开多远；越重、翼面越硬的个体推得越远，滑翔式掀得更开。"
            }),
        /** 升防几率：0.10 + 防御偏移[0,0.12] + 等级偏移[0,0.08]；滑翔 ×1.20；夹 0.05..0.36。 */
        hardenChance: percent(
            F.base(0.10).plus(F.stat("defence").minus(55).times(0.001).clamp(0, 0.12))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.08))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(1.20), F.const(1)))
                .clamp(0.05, 0.36).round(3),
            "升防几率", "扫中任意目标后把翼面磨硬、防御提升的几率；翼面越硬、等级越高越稳，滑翔式更集中。"),
        /** 升防级数：固定 1，等级 50 台阶抬到 2；夹 1..2。 */
        hardenStages: formula(F.base(1).clamp(1, 2).round(0), "升防级数", {
            unit: "级",
            description: "一次施放里最多提升的防御级数；高级个体一记可磨硬两级。"
        }),
        /** 滑行距离：1.4 + 速度偏移[−0.3,0.8]；夹 1.0..2.8。 */
        glideDist: formula(
            F.base(1.4).plus(F.stat("speed").minus(60).times(0.015).clamp(-0.3, 0.8)).clamp(1.0, 2.8).round(2),
            "滑行距离", {
                unit: "格",
                description: "滑翔式在横扫之前朝前滑出的距离；腿快的人滑得更远，也更容易为扫人而滑进敌阵。"
            }),
        /** 钢羽数量：14 + 防御偏移[−4,12] + 速度偏移[−2,8]；夹 10..36。 */
        feathers: formula(
            F.base(14).plus(F.stat("defence").minus(55).times(0.10).clamp(-4, 12))
                .plus(F.stat("speed").minus(60).times(0.08).clamp(-2, 8)).clamp(10, 36).round(0),
            "钢羽数量", {
                unit: "片",
                description: "横扫时被翼刃气流扬起的钢羽数量，随防御与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：8 − 速度偏移[−2,3] + 滑翔 3；夹 5..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "把翅膀张到最大、边缘亮起钢光的时间；速度越快越短，滑翔式多展开一拍。"),
        /** 收招：7 − 速度偏移[−1,1.5] + 滑翔 2；夹 5..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1.5))
                .plus(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(2), F.const(0)))
                .clamp(5, 12).round(0),
            "收招", "扫完稳住身形的收势；速度越快越利落。"),
        /** 冷却：26 − 等级(≥20)偏移[0,5] + 滑翔 6；夹 16..40。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(20).times(0.09).clamp(0, 5))
                .plus(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(6), F.const(0)))
                .clamp(16, 40).round(0),
            "冷却", "两次横扫之间的等待；等级越高回得越快，滑翔式缓得更久。")
    });

    defineDamage("steelwing", "wing", {}, { contact: true });

    stages("steelwing", [
        { level: 30, values: { wing: 78 } },
        { level: 50, values: { wing: 88, hardenStages: 2 } }
    ]);

    describe("steelwing", [
        { key: "description.0", values: ["wing", "span"] },
        { key: "description.1", values: ["reach", "knock"] },
        { key: "description.2", values: ["hardenChance", "hardenStages", "feathers"] },
        { key: "glide.on", values: [], when: function (context) { return read(context.detail.values, ["glide"]) === true; } },
        { key: "glide.off", values: [], when: function (context) { return read(context.detail.values, ["glide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wing"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wing", "tier.1.hardenStages"] }
    ]);
}
