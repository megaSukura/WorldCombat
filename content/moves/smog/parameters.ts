/**
 * 浊雾 / smog —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／特殊／威力 30／命中 70／PP 20／单体／40% 令目标中毒。
 *
 * 翻译：把「将肮脏的浓雾吹向对手」落成一记**正前方喷出的低矮浊雾锥**——施法者吸一口气，朝选定的方向把浓雾
 *   一口吹出去；雾贴着地面向前滚，滚过近处再滚到远处，每一段扫到的人都吃一点伤害、很容易中毒。
 *   它是这一族里射程最短、伤害最低、但中毒概率最高、PP 最多的一招：不靠打疼人，靠把人熏毒。
 *
 * 与同族分开：污泥攻击是低弧小泥团、污泥炸弹是落地插引信的延时爆弹、垃圾射击是负重直线炮；
 *   只有浊雾是**正前方滚出去的雾锥**，反制方式是绕到它侧面或退出锥形。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数上：
 *   fumes       浊雾威力：特攻决定雾里的毒性，等级带来成长；滚涌形态把浓度换给广度所以单段略轻。
 *   cone        雾锥张角：特攻、体重与等级决定吹得多开；滚涌形态更宽。
 *   reach       喷吐距离：特攻与等级决定够得多远；滚涌形态更远。
 *   toxinChance 中毒概率：特攻与等级决定；滚涌形态更高。
 *   venomTicks  中毒时长：等级与特攻决定。
 *   waveTicks   滚动节拍：速度决定近段与远段之间隔多久。
 *   puffs       雾团数：特攻与体重决定，同时驱动画面密度。
 *   inhale/settle/recharge：速度与等级决定吸气、收招与冷却。
 *
 * 配置 `billow`（滚涌取向，默认关）双向取舍：开启＝雾锥更宽更远（张角 ×1.2、距离 ×1.15）、中毒概率 ×1.15、
 *   滚得更慢，但单段威力 ×0.85；关闭（尖吹）＝雾锥更窄更浓、威力 ×1.15、来得更快。两向各有适用局面。
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
                description: "雾滚过时对每个被扫到的人各结算一次的基础威力；特攻越高雾里的毒性越强。滚涌形态把浓度换给广度，单段略轻。对手特防、相性与暴击在命中时另算。"
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
                description: "雾向前滚开的总张角；特攻高、体型重（体内存得住更多气）、等级高的个体吹得更开，滚涌形态更宽。它也是判定锥与画面锥的角度。"
            }),
        /** 喷吐距离：6 + 特攻偏移[−0.5,1.2] + 等级(≥25)偏移[0,0.6]；滚涌 ×1.15；夹 4.5..9。 */
        reach: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.2))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("billow"), F.const(1.15), F.const(1)))
                .clamp(4.5, 9).round(2),
            "喷吐距离", {
                unit: "格",
                description: "浊雾能滚到多远；特攻高、熟练的个体吹得更远，滚涌形态更远。它也是本招的实际射程。"
            }),
        /** 中毒概率：0.40 + 特攻偏移[−0.07,0.18] + 等级(≥25)偏移[0,0.06]；滚涌 ×1.15；夹 0.28..0.72。 */
        toxinChance: percent(
            F.base(0.40).plus(F.stat("specialAttack").minus(60).times(0.0018).clamp(-0.07, 0.18))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("billow"), F.const(1.15), F.const(1)))
                .clamp(0.28, 0.72).round(3),
            "中毒概率", "被浊雾熏到后陷入中毒的概率；原生 40% 起，特攻与等级越高越容易中毒，滚涌形态再抬一档。"),
        /** 中毒时长：240 + 等级(≥25)偏移[0,120] + 特攻偏移[−20,70]；夹 180..460。 */
        venomTicks: seconds(
            F.base(240).plus(F.level().minus(25).times(4).clamp(0, 120))
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-20, 70))
                .clamp(180, 460).round(0),
            "中毒时长", "毒如果没有立刻被解掉会持续多久；等级与特攻（毒气浓度）越高挂得越久。"),
        /** 滚动节拍：5 − 速度偏移[−0.5,1.5]；夹 3..8。 */
        waveTicks: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-0.5, 1.5)).clamp(3, 8).round(0),
            "滚动节拍", "近段扫过之后，远段隔多久才滚到；速度快的个体吐得急，雾滚得更连贯。"),
        /** 雾团数：14 + 特攻偏移[−4,16] + 体重偏移[−2,8]；滚涌 ×1.3；夹 10..40。 */
        puffs: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-4, 16))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-2, 8))
                .times(F.when(F.pref("billow"), F.const(1.3), F.const(1)))
                .clamp(10, 40).round(0),
            "雾团数", {
                unit: "团",
                description: "喷出的浊雾团数，随特攻与体重增长；粒子按它发射，画面密度与机制一致。"
            }),
        /** 吸气：10 − 速度偏移[−1.5,2] + 滚涌 2；夹 5..15。 */
        inhale: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-1.5, 2))
                .plus(F.when(F.pref("billow"), F.const(2), F.const(0))).clamp(5, 15).round(0),
            "吸气", "吸满一口气再喷出去的时间；速度越快越短，滚涌取向多蓄一拍。"),
        /** 收招：7；滚涌 +1；夹 5..12。 */
        settle: seconds(
            F.base(7).plus(F.when(F.pref("billow"), F.const(1), F.const(0))).clamp(5, 12).round(0),
            "收招", "喷完把气顺回来的时间；滚涌取向多花一拍。"),
        /** 冷却：16 − 等级(≥25)偏移[0,3]；夹 9..22。 */
        recharge: seconds(
            F.base(16).minus(F.level().minus(25).times(0.1).clamp(0, 3)).clamp(9, 22).round(0),
            "冷却", "两口浊雾之间的等待；等级越高回得越快，配合高 PP 可以一直熏。"),
        maxTargets: hidden(5)
    });

    defineDamage("smog", "fumes", {});

    stages("smog", [
        { level: 25, values: { fumes: 34, cone: 40 } },
        { level: 40, values: { fumes: 40, toxinChance: 0.50 } }
    ]);

    describe("smog", [
        { key: "description.0", values: ["fumes", "cone"] },
        { key: "description.1", values: ["reach", "toxinChance", "venomTicks"] },
        { key: "description.2", values: ["waveTicks"] },
        { key: "billow.on", values: [], when: function (context) { return read(context.detail.values, ["billow"]) === true; } },
        { key: "billow.off", values: [], when: function (context) { return read(context.detail.values, ["billow"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fumes", "tier.0.cone"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fumes", "tier.1.toxinChance"] }
    ]);
}
