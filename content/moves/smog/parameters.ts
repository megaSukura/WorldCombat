/**
 * 浊雾 / smog —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／特殊／威力 30／命中 70／PP 20／单体／40% 令目标中毒。
 *
 * 翻译：把「将肮脏的浓雾吹向对手」落成一记**脱口的滚动浊雾团**——施法者吸一口气，朝选定方向吐出雾团；
 *   雾团从口边沿固定的 3D 方向缓慢滚远，横截面一路膨大成锥宽，沿途罩到的人各吃一次伤害、很容易中毒。
 *   它是这一族里射程最短、伤害最低、但中毒概率最高、PP 最多的一招：不靠打疼人，靠把人熏毒；真实墙会把雾路截断。
 *
 * 与同族分开：污泥攻击是低弧小泥团、污泥炸弹是落地插引信的延时爆弹、垃圾射击是负重直线炮；
 *   只有浊雾是**一团自己滚出去的雾**，反制方式是横移离开雾路，或退到墙后。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数上：
 *   fumes       浊雾威力：特攻决定雾里的毒性，等级带来成长；滚涌形态把浓度换给广度所以单段略轻。
 *   cone        雾锥张角：特攻、体重与等级决定吹得多开；它也是雾团到尽头时的横截面全宽。
 *   mouth       雾口宽：体重与体型决定开口大小，是雾团刚脱口时的半径。
 *   reach       喷吐距离：特攻与等级决定够得多远；滚涌形态更远。
 *   toxinChance 中毒概率：特攻与等级决定；滚涌形态更高。
 *   venomTicks  中毒时长：等级与特攻决定。
 *   waveTicks   滚涌时长：速度决定雾团从口边滚到尽头要多久。
 *   puffs       雾团数：特攻与体重决定，同时驱动画面密度。
 *   inhale/settle/recharge：速度与等级决定吸气、收招与冷却。
 *
 * 配置 `billow`（滚涌取向，默认关）双向取舍：开启＝雾锥更宽更远（张角 ×1.2、距离 ×1.15）、中毒概率 ×1.15、
 *   滚得更慢，但单段威力 ×0.85；关闭（尖吹）＝雾团更窄更浓、威力 ×1.15、来得更快。两向各有适用局面。
 *
 * 伤害段 `fumes` 与参数同名，走共享换算（原生类别 Special）。中毒走共享身份 world_combat:status/poison。
 */
namespace PokemonSkills {
    actionParameters.define("smog", {
        /** 浊雾威力：30 + 特攻偏移[−6,14] + 等级(≥25)偏移[0,8]；滚涌 ×0.85 / 尖吹 ×1.15；夹 20..62。 */
        fumes: formula(
            F.base(30).plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-6, 14))
                .plus(F.level().minus(25).times(0.3).clamp(0, 8))
                .times(F.when(F.pref("billow"), F.const(0.85), F.const(1.15)))
                .clamp(20, 62).round(1),
            "浊雾威力", {
                unit: "威力",
                description: "雾团罩到某人时结算一次的基础威力；特攻越高雾里的毒性越强。滚涌形态把浓度换给广度，单次略轻。对手特防、相性与暴击在命中时另算。"
            }),
        /** 雾锥张角：34 + 特攻偏移[−4,10] + 体重偏移[−2,5] + 等级(≥25)偏移[0,6]；滚涌 ×1.2；夹 22..62。 */
        cone: formula(
            F.base(34).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-4, 10))
                .plus(F.body("weight").minus(60).times(0.008).clamp(-2, 5))
                .plus(F.level().minus(25).times(0.1).clamp(0, 6))
                .times(F.when(F.pref("billow"), F.const(1.2), F.const(1)))
                .clamp(22, 62).round(1),
            "雾锥张角", {
                unit: "度",
                description: "雾团滚远时张开的总角度；特攻高、体型重（体内存得住更多气）、等级高的个体吹得更开，滚涌形态更宽。雾团到尽头时的横截面宽度由它和射程一起决定，画面与判定同源。"
            }),
        /** 雾口宽：0.44 + 体型宽偏移[−0.1,0.35] + 体重偏移[−0.05,0.12]；夹 0.32..0.85。 */
        mouth: formula(
            F.base(0.44)
                .plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.35))
                .plus(F.body("weight").minus(60).times(0.001).clamp(-0.05, 0.12))
                .clamp(0.32, 0.85).round(2),
            "雾口宽", {
                unit: "格",
                description: "雾团刚离开口边时的半径；体型越宽、体内存气越多，开口越大。它随滚动距离一路膨大到锥宽，粒子范围按同一个半径画出。"
            }),
        /** 喷吐距离：6 + 特攻偏移[−0.5,1.2] + 等级(≥25)偏移[0,0.6]；滚涌 ×1.15；夹 4.5..9。 */
        reach: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.2))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("billow"), F.const(1.15), F.const(1)))
                .clamp(4.5, 9).round(2),
            "喷吐距离", {
                unit: "格",
                description: "雾团能滚到多远；特攻高、熟练的个体吹得更远，滚涌形态更远。它也是本招的实际射程，真实墙会提前把它截住。"
            }),
        /** 中毒概率：0.40 + 特攻偏移[−0.07,0.18] + 等级(≥25)偏移[0,0.06]；滚涌 ×1.15；夹 0.28..0.72。 */
        toxinChance: percent(
            F.base(0.40).plus(F.stat("specialAttack").minus(60).times(0.0018).clamp(-0.07, 0.18))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("billow"), F.const(1.15), F.const(1)))
                .clamp(0.28, 0.72).round(3),
            "中毒概率", "被雾团罩到后陷入中毒的概率；原生 40% 起，特攻与等级越高越容易中毒，滚涌形态再抬一档。"),
        /** 中毒时长：240 + 等级(≥25)偏移[0,120] + 特攻偏移[−20,70]；夹 180..460。 */
        venomTicks: seconds(
            F.base(240).plus(F.level().minus(25).times(4).clamp(0, 120))
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-20, 70))
                .clamp(180, 460).round(0),
            "中毒时长", "毒如果没有立刻被解掉会持续多久；等级与特攻（毒气浓度）越高挂得越久。"),
        /** 滚涌时长：26 − 速度偏移[−4,9] + 滚涌 8；夹 16..48。 */
        waveTicks: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.18).clamp(-4, 9))
                .plus(F.when(F.pref("billow"), F.const(8), F.const(0))).clamp(16, 48).round(0),
            "滚涌时长", "雾团从口边滚到射程尽头所需的时间；速度快的个体吐得急、滚得更短，滚涌取向滚得更慢。"),
        /** 雾团数：14 + 特攻偏移[−4,16] + 体重偏移[−2,8]；滚涌 ×1.3；夹 10..40。 */
        puffs: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-4, 16))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-2, 8))
                .times(F.when(F.pref("billow"), F.const(1.3), F.const(1)))
                .clamp(10, 40).round(0),
            "雾团数", {
                unit: "团",
                description: "翻滚雾团的粒子数，随特攻与体重增长；粒子按它发射，画面密度与机制一致。"
            }),
        /** 吸气：10 − 速度偏移[−1.5,2] + 滚涌 2；夹 5..15。 */
        inhale: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-1.5, 2))
                .plus(F.when(F.pref("billow"), F.const(2), F.const(0))).clamp(5, 15).round(0),
            "吸气", "吸满一口气再吐出去的时间；速度越快越短，滚涌取向多蓄一拍。"),
        /** 收招：7；滚涌 +1；夹 5..12。 */
        settle: seconds(
            F.base(7).plus(F.when(F.pref("billow"), F.const(1), F.const(0))).clamp(5, 12).round(0),
            "收招", "吐完把气顺回来的时间；滚涌取向多花一拍。雾团此时已经自己滚着，吐完就能行动。"),
        /** 冷却：16 − 等级(≥25)偏移[0,3]；夹 9..22。 */
        recharge: seconds(
            F.base(16).minus(F.level().minus(25).times(0.1).clamp(0, 3)).clamp(9, 22).round(0),
            "冷却", "两团浊雾之间的等待；等级越高回得越快，配合高 PP 可以一直熏。"),
        maxTargets: hidden(5)
    });

    defineDamage("smog", "fumes", {});

    stages("smog", [
        { level: 25, values: { fumes: 34, cone: 40 } },
        { level: 40, values: { fumes: 40, toxinChance: 0.50 } }
    ]);

    describe("smog", [
        { key: "description.0", values: ["fumes", "cone", "mouth"] },
        { key: "description.1", values: ["reach", "toxinChance"] },
        { key: "description.poison", values: ["venomTicks"] },
        { key: "description.2", values: ["waveTicks"] },
        { key: "description.targets", values: ["maxTargets"] },
        { key: "billow.on", values: [], when: function (context) { return read(context.detail.values, ["billow"]) === true; } },
        { key: "billow.off", values: [], when: function (context) { return read(context.detail.values, ["billow"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fumes", "tier.0.cone"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fumes", "tier.1.toxinChance"] }
    ]);
}
