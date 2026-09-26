/**
 * 火之舞 / fierydance —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Fire／特殊／威力 80／命中 100／PP 10／单体；命中后有 50% 让自身特攻 +1。
 * 翻译：把「让火焰覆盖全身，振翅攻击对手，有时提高自己的特攻」落成**两片火翼随身体旋舞展开**——
 *   两片相对的火焰翼尖从身周内圈起转、在 `dance` 刻里绕身体扫过半圈、半径一路展到外圈；翼尖扫过谁，
 *   谁就吃一记火焰并被向外推开。玩家靠走位让火翼扫到敌人，两片翼各自最多命中同一目标一次、整舞升攻只一次。
 *   它是四式里唯一以自身为中心、用走位把两片翼缘贴到对手身侧的一记。
 *
 * 与同族分开：充电光束是远远一条连着的细束、要求持续瞄准；火之舞是贴着自己旋开的两片火翼、扫的是身周。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   blaze         每次翼击威力：特攻给出火势、速度给出振翅的节奏；旋舞式每次更轻。
 *   inner         起始半径：体型；身板越大第一刻的翼尖铺得越开。
 *   outer         终止半径：体型与速度；旋舞式再卷出去一截。
 *   dance         半圈用时：速度；越快两片火翼转得越急。
 *   edgeRadius    翼缘接触半径：特攻与身高；火势越旺、体型越大，翼尖扫过的判定带越宽。
 *   spin          火焰团数：特攻；表现里的火焰团数量。
 *   blazeChance   涨特攻几率：特攻与等级；原生 50% 的即时化。
 *   blazeStages   涨特攻级数：旋舞式一次升两级。
 *   push          击退：特攻；把命中的人沿当刻径向向外推开。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却；旋舞式以更慢更贵换更大的一支舞。
 *
 * 配置 `spiral`（旋舞）双向取舍：开启＝外圈更大、命中后一次升两级特攻，但每次翼击更轻、起手、收招与冷却更久；
 *   关闭（聚焰）＝每次更重、更快更便宜、外圈略小，命中只升一级。整舞不留火场、不额外结尾爆炸。
 */

namespace PokemonSkills {
    actionParameters.define("fierydance", {
        /** 每次翼击威力：80 + 特攻偏移[−14,44] + 速度偏移[−6,12]；旋舞 ×0.90 / 聚焰 ×1.12；夹 44..152。 */
        blaze: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 44))
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-6, 12))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(0.90), F.const(1.12)))
                .clamp(44, 152).round(1),
            "翼击威力", {
                unit: "威力",
                description: "每一片火翼扫到人身上时那一下的威力；特攻越高火越旺、振翅越快越重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 起始半径：1.6 + 身高偏移[−0.2,0.6]；夹 1.20..2.60。 */
        inner: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.2, 0.6)).clamp(1.20, 2.60).round(2),
            "起始半径", {
                unit: "格",
                description: "两片火翼开始时贴着的半径；身板越大起手铺得越开，贴在这个圈里就会被第一刻的翼尖扫到。"
            }),
        /** 终止半径：2.8 + 身高偏移[−0.3,0.9] + 速度偏移[−0.3,0.7]；旋舞 ×1.20；夹 2.20..5.00。 */
        outer: formula(
            F.base(2.8).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.3, 0.9))
                .plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.7))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1.20), F.const(1)))
                .clamp(2.20, 5.00).round(2),
            "终止半径", {
                unit: "格",
                description: "旋舞走到半圈时两片火翼卷到的最外半径；退到起始圈之外、这个圈之内的人会被翼尖追上，旋舞式卷得更开。"
            }),
        /** 半圈用时：12 − 速度偏移[−3,3]；夹 8..16。 */
        dance: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 3))
                .plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(2), F.const(0)))
                .clamp(8, 16).round(0),
            "半圈用时", "两片火翼从起始半径转到终止半径、绕身体扫过半圈的时间；速度越快转得越急。"),
        /** 翼缘接触半径：0.42 + 特攻偏移[0,0.18] + 身高偏移[−0.06,0.12]；夹 0.30..0.70。 */
        edgeRadius: formula(
            F.base(0.42).plus(F.stat("specialAttack").minus(60).times(0.0025).clamp(0, 0.18))
                .plus(F.body("height").minus(1.4).times(0.05).clamp(-0.06, 0.12)).clamp(0.30, 0.70).round(2),
            "翼缘接触半径", {
                unit: "格",
                description: "每一片火翼算作接触的厚度；火势越旺、体型越大，翼尖扫过时能烧到的判定带越宽。"
            }),
        /** 火焰团数：18 + 特攻偏移[0,16]；旋舞 ×1.20；夹 12..52。 */
        spin: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.10).clamp(0, 16))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1.20), F.const(1)))
                .clamp(12, 52).round(0),
            "火焰团数", {
                unit: "团",
                description: "整支火舞扬起的火焰团数量；特攻越高舞得越盛，旋舞式再铺一层。粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 涨特攻几率：0.50 + 特攻偏移[0,0.15] + 等级偏移[0,0.10]；旋舞 ×1.15；夹 0.30..0.80。 */
        blazeChance: percent(
            F.base(0.50).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(0, 0.15))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.10))
                .times(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1.15), F.const(1)))
                .clamp(0.30, 0.80).round(3),
            "涨特攻几率", "整支舞至少有一片火翼命中后、火焰更旺而特攻提升的几率；原生约 50%，特攻与等级把它抬得更稳，旋舞式更足。"),
        /** 涨特攻级数：固定 1，旋舞式 2；夹 1..2。 */
        blazeStages: formula(
            F.base(1).plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "涨特攻级数", {
                unit: "级",
                description: "整支火舞提升的特攻级数；旋舞式多升一级，聚焰式只升一级，整舞最多触发一次。"
            }),
        /** 击退：0.20 + 特攻偏移[0,0.25]；夹 0.10..0.50。 */
        push: formula(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(0, 0.25)).clamp(0.10, 0.50).round(2),
            "击退", {
                unit: "格",
                description: "命中后把每个人沿当刻从身体指向它的径向推开多远；火势越旺推得越开。"
            }),
        /** 起手：10 − 速度偏移[−2,3] + 旋舞 3；夹 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "火焰裹住全身、两片火翼在身侧点起的起势；速度越快越短，旋舞式多起一拍。"),
        /** 收招：8 + 旋舞 3；夹 6..14。 */
        aftercast: seconds(
            F.base(8).plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(3), F.const(0))).clamp(6, 14).round(0),
            "收招", "半圈跳完、火焰收拢的收势；旋舞式收得久一点。"),
        /** 冷却：30 − 等级(≥20)偏移[0,6] + 旋舞 6；夹 18..44。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(20).times(0.10).clamp(0, 6))
                .plus(F.when(F.pref("spiral", text("worldcombat.skill.fierydance.preference.spiral")), F.const(6), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "两支火舞之间的等待；等级越高回得越快，旋舞式缓得更久。")
    });

    defineDamage("fierydance", "blaze", {});

    stages("fierydance", [
        { level: 40, values: { blaze: 90 } },
        { level: 60, values: { blaze: 100, blazeStages: 2 } }
    ]);

    describe("fierydance", [
        { key: "description.0", values: ["blaze", "inner"] },
        { key: "description.1", values: ["outer", "dance", "push"] },
        { key: "description.2", values: ["blazeChance", "blazeStages"] },
        { key: "description.3", values: ["edgeRadius"] },
        { key: "spiral.on", values: [], when: function (context) { return read(context.detail.values, ["spiral"]) === true; } },
        { key: "spiral.off", values: [], when: function (context) { return read(context.detail.values, ["spiral"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blaze"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blaze", "tier.1.blazeStages"] }
    ]);
}
