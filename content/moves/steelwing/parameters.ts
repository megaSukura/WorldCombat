/**
 * 钢翼 / steelwing —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Steel／物理／威力 70／命中 90／PP 25／接触；命中后有 10% 让自身防御 +1。
 * 翻译：把「用坚硬的翅膀敲打对手，有时提高自己的防御」落成**展开双翼、用两侧真实翼缘切过去**——
 *   双翼从身前收拢的位置向两侧展开，翼缘扫过身侧和侧前方；扫中的东西被推开，翼面越磨越硬、防御越稳地抬起来。
 *   它是四式里唯一靠**两侧翼缘**分别接触的一记：左翼和右翼可以扫到不同的对手，正前方两条翼缘中间的空隙反而安全。
 *
 * 与同族分开：金属爪是贴脸两点、磨的是攻击；钢翼是横向展开的两条翼缘、把两侧的人各自掀开、磨的是防御。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   wing          翼击威力：防御给出翼面硬度、物攻给出挥砸的狠度；滑翔式把力摊到更宽的一展上、单点略轻。
 *   reach         翼缘长度：身高与速度；决定每一侧从肩到翼尖能够到多远。
 *   span          翼扫角度：速度；转体快的个体翼展得更开、扫到更靠后的位置。
 *   unfold        展翼时间：速度；收拢的双翼展开到全幅的用时。
 *   edgeRadius    翼缘接触半径：防御与身高；翼面越硬越大，判定带越宽。
 *   knock         击退：体重与防御；越沉越硬的翼把命中的人推得越远。
 *   hardenChance  升防几率：防御与等级；翼面越硬越像敲钟。
 *   hardenStages  升防级数：等级 50 台阶抬到 2。
 *   glideDist     滑翔距离（滑翔式）：速度。
 *   feathers      钢羽数量：防御与速度派生，表现按它发射。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却；滑翔式以更慢更贵换更宽更远的横扫。
 *
 * 配置 `glide`（滑翔扫）双向取舍：开启＝先向前真实滑出一段、滑行期间保持两侧全幅翼缘，展翼更宽、击退更远、
 *   升防更稳，但起手与冷却更久，也可能为扫人而滑进敌阵；关闭＝原地展开双翼扫过身侧，更快更便宜、翼展略短。
 */

namespace PokemonSkills {
    actionParameters.define("steelwing", {
        /** 翼击威力：70 + 防御偏移[−12,34] + 物攻偏移[−6,16]；滑翔 ×0.94 / 原地 ×1.08；夹 40..150。 */
        wing: formula(
            F.base(70).plus(F.stat("defence").minus(55).times(0.20).clamp(-12, 34))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-6, 16))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(0.94), F.const(1.08)))
                .clamp(40, 150).round(1),
            "翼击威力", {
                unit: "威力",
                description: "每一侧翼缘切中对手时那一下的威力；翅膀越硬、身体越有劲越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 翼缘长度：3.2 + 身高偏移[−0.2,0.8] + 速度偏移[−0.2,0.5]；滑翔 ×1.10；夹 2.60..4.80。 */
        reach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.2, 0.8))
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(1.10), F.const(1)))
                .clamp(2.60, 4.80).round(2),
            "翼缘长度", {
                unit: "格",
                description: "每一侧从肩到翼尖的长度，也就是翼缘能扫到多远；身长、腿快的个体伸得更长，滑翔式再探出去一点。"
            }),
        /** 翼扫角度：105 + 速度偏移[−15,40]；滑翔 ×1.06；夹 85..150。 */
        span: formula(
            F.base(105).plus(F.stat("speed").minus(60).times(0.30).clamp(-15, 40))
                .times(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(1.06), F.const(1)))
                .clamp(85, 150).round(0),
            "翼扫角度", {
                unit: "度",
                description: "每一侧硬翼从正前方扫到侧后方的角度；角度越大翼展得越靠后、越能照顾身侧，转体快的个体扫得更开。"
            }),
        /** 展翼时间：4 − 速度偏移[−1.5,2]；夹 2..7。 */
        unfold: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(2, 7).round(0),
            "展翼时间", "把收拢的双翼展开到全幅、扫过身侧的用时；速度越快展得越利落。"),
        /** 翼缘接触半径：0.34 + 防御偏移[0,0.14] + 身高偏移[−0.06,0.12]；夹 0.24..0.60。 */
        edgeRadius: formula(
            F.base(0.34).plus(F.stat("defence").minus(55).times(0.0015).clamp(0, 0.14))
                .plus(F.body("height").minus(1.4).times(0.05).clamp(-0.06, 0.12)).clamp(0.24, 0.60).round(2),
            "翼缘接触半径", {
                unit: "格",
                description: "每一侧硬翼边缘算作接触的厚度；翼面越硬、体型越大，刃口扫过时能刮到的判定带越宽。"
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
            "升防几率", "整招第一次有效命中后把翼面磨硬、防御提升的几率；翼面越硬、等级越高越稳，滑翔式更集中。"),
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
                description: "滑翔式在展开双翼的同时真实向前滑出的距离；腿快的人滑得更远，也更容易为扫人而滑进敌阵。"
            }),
        /** 钢羽数量：14 + 防御偏移[−4,12] + 速度偏移[−2,8]；夹 10..36。 */
        feathers: formula(
            F.base(14).plus(F.stat("defence").minus(55).times(0.10).clamp(-4, 12))
                .plus(F.stat("speed").minus(60).times(0.08).clamp(-2, 8)).clamp(10, 36).round(0),
            "钢羽数量", {
                unit: "片",
                description: "展翼横扫时被翼刃气流扬起的钢羽数量，随防御与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：8 − 速度偏移[−2,3] + 滑翔 3；夹 5..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "把双翼收到身前、翼缘亮起钢光的时间；速度越快越短，滑翔式多展开一拍。"),
        /** 收招：7 − 速度偏移[−1,1.5] + 滑翔 2；夹 5..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1.5))
                .plus(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(2), F.const(0)))
                .clamp(5, 12).round(0),
            "收招", "扫完把双翼收回身侧的收势；速度越快越利落。"),
        /** 冷却：26 − 等级(≥20)偏移[0,5] + 滑翔 6；夹 16..40。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(20).times(0.09).clamp(0, 5))
                .plus(F.when(F.pref("glide", text("worldcombat.skill.steelwing.preference.glide")), F.const(6), F.const(0)))
                .clamp(16, 40).round(0),
            "冷却", "两次展翼横扫之间的等待；等级越高回得越快，滑翔式缓得更久。")
    });

    defineDamage("steelwing", "wing", {}, { contact: true });

    stages("steelwing", [
        { level: 30, values: { wing: 78 } },
        { level: 50, values: { wing: 88, hardenStages: 2 } }
    ]);

    describe("steelwing", [
        { key: "description.0", values: ["wing", "span"] },
        { key: "description.1", values: ["reach", "knock"] },
        { key: "description.2", values: ["hardenChance", "hardenStages"] },
        { key: "description.3", values: ["unfold", "edgeRadius"] },
        { key: "glide.on", values: [], when: function (context) { return read(context.detail.values, ["glide"]) === true; } },
        { key: "glide.off", values: [], when: function (context) { return read(context.detail.values, ["glide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wing"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wing", "tier.1.hardenStages"] }
    ]);
}
