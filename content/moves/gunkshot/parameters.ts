/**
 * 垃圾射击 / gunkshot —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／物理／威力 120／命中 80／PP 5／单体／30% 令目标中毒。
 *
 * 翻译：把「用肮脏的垃圾撞向对手」落成一记**把压缩垃圾团当炮弹轰出去的直线重击**——它是这一族唯一的物理招，
 *   也是唯一可能真的打偏的一招：弹道带一个由命中 80 翻来的偏角，离得越远越容易从目标身边擦过。
 *   打中就吃一记很重的物理伤害、被狠狠顶开、按概率中毒；打偏只在地面砸起一蓬垃圾。
 *
 * 与同族分开：污泥攻击是低弧小泥团、污泥炸弹是落地插引信的延时爆弹、浊雾是正前方雾锥；
 *   只有垃圾射击是**一次负重的直线重炮**，反制方式是拉开距离让它的偏角替你躲掉这一发。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数上：
 *   wad       炮弹威力：物攻决定压缩得多实；重装取向再抬一档。
 *   spread    弹道偏角：物攻越高手越稳（偏差越小），等级带来熟练；重装取向装药更多所以更飘。
 *   muzzle    炮口初速：速度决定弹速。
 *   reach     射程：物攻与等级决定能轰多远。
 *   wadRadius 弹体判定：碰撞箱高度决定炮弹大小。
 *   shove     顶开距离：物攻与体重决定把人推多远；重装取向更狠。
 *   poisonChance 中毒概率：物攻决定垃圾多脏。
 *   venomTicks   中毒时长：等级与物攻决定。
 *   chunks    碎屑数：物攻决定，同时驱动炮口、弹道与命中的画面密度。
 *   load/settle/recharge：速度与等级决定装填、收招与冷却（PP 少，一发出手很贵）。
 *
 * 配置 `heavy`（重装取向，默认关）双向取舍：开启＝威力 ×1.18、顶开 ×1.25，但偏角 ×1.4（更难命中）、
 *   装填 +2 刻、冷却 +4 刻；关闭（轻装）＝偏角更小、出手更快、冷却更短，但每一发更轻。两向各有适用局面。
 *
 * 伤害段 `wad` 与参数同名，走共享换算（原生类别 Physical）。中毒走共享身份 world_combat:status/poison。
 */
namespace PokemonSkills {
    actionParameters.define("gunkshot", {
        /** 炮弹威力：120 + 物攻偏移[−20,45]；重装 ×1.18 / 轻装 ×1.0；夹 90..190。 */
        wad: formula(
            F.base(120).plus(F.stat("attack").minus(80).times(0.5).clamp(-20, 45))
                .times(F.when(F.pref("heavy"), F.const(1.18), F.const(1)))
                .clamp(90, 190).round(1),
            "炮弹威力", {
                unit: "威力",
                description: "压缩垃圾团正面撞上时结算的基础威力；物攻越高压得越实，重装取向再抬一档。对手物防、相性与暴击在命中时另算。"
            }),
        /** 弹道偏角：8 − 物攻偏移[−4,3]（物攻越高越稳）− 等级(≥30)偏移[0,2]；重装 ×1.4；夹 2..14。 */
        spread: formula(
            F.base(8).minus(F.stat("attack").minus(80).times(0.05).clamp(-4, 3))
                .minus(F.level().minus(30).times(0.05).clamp(0, 2))
                .times(F.when(F.pref("heavy"), F.const(1.4), F.const(1)))
                .clamp(2, 14).round(2),
            "弹道偏角", {
                unit: "度",
                description: "炮弹脱手时向左右随机偏的最大角度（命中 80 的即时翻译）；物攻高、熟练的个体更稳，重装取向装药更多所以更飘。离得越远，同样的角度偏得越开——这就是它会打偏的原因。"
            }),
        /** 炮口初速：1.9 + 速度偏移[−0.2,0.5]；重装 ×0.95；夹 1.4..2.6。 */
        muzzle: formula(
            F.base(1.9).plus(F.stat("speed").minus(70).times(0.005).clamp(-0.2, 0.5))
                .times(F.when(F.pref("heavy"), F.const(0.95), F.const(1)))
                .clamp(1.4, 2.6).round(2),
            "炮口初速", {
                unit: "格/刻",
                description: "炮弹脱手时的直线速度；速度快的个体轰得更急，目标更难走位躲开。"
            }),
        /** 射程：12 + 物攻偏移[−2,4] + 等级(≥30)偏移[0,1]；夹 9..20。 */
        reach: formula(
            F.base(12).plus(F.stat("attack").minus(80).times(0.04).clamp(-2, 4))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1))
                .clamp(9, 20).round(2),
            "射程", {
                unit: "格",
                description: "能把炮弹轰到多远；物攻高、熟练的个体射得更远。它也是本招的实际射程。"
            }),
        /** 弹体判定：0.26 + 高度偏移[−0.05,0.2]；重装 ×1.1；夹 0.2..0.5。 */
        wadRadius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.05, 0.2))
                .times(F.when(F.pref("heavy"), F.const(1.1), F.const(1)))
                .clamp(0.2, 0.5).round(2),
            "弹体判定", {
                unit: "格",
                description: "炮弹飞行与命中判定的半径；体型越高炮弹越大，也更容易在偏角下仍然擦中。"
            }),
        /** 顶开距离：0.45 + 物攻偏移[−0.1,0.5] + 体重每 10 加 0.02；重装 ×1.25；夹 0.2..1.7。 */
        shove: formula(
            F.base(0.45).plus(F.stat("attack").minus(80).times(0.006).clamp(-0.1, 0.5))
                .plus(F.body("weight").div(10).times(0.02).clamp(0, 0.4))
                .times(F.when(F.pref("heavy"), F.const(1.25), F.const(1)))
                .clamp(0.2, 1.7).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中后沿弹道方向把目标顶开多远；物攻高、体重大的个体推得更狠，重装取向更明显。"
            }),
        /** 中毒概率：0.30 + 物攻偏移[−0.06,0.16]；夹 0.18..0.55。 */
        poisonChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(80).times(0.0015).clamp(-0.06, 0.16)).clamp(0.18, 0.55).round(3),
            "中毒概率", "被脏垃圾撞中后陷入中毒的概率；原生 30% 起，物攻越高垃圾越脏。"),
        /** 中毒时长：300 + 等级(≥30)偏移[0,120] + 物攻偏移[−20,70]；夹 220..500。 */
        venomTicks: seconds(
            F.base(300).plus(F.level().minus(30).times(4).clamp(0, 120))
                .plus(F.stat("attack").minus(80).times(0.6).clamp(-20, 70))
                .clamp(220, 500).round(0),
            "中毒时长", "毒如果没有立刻被解掉会持续多久；等级与物攻越高挂得越久。"),
        /** 碎屑数：18 + 物攻偏移[−6,22]；重装 ×1.2；夹 12..44。 */
        chunks: formula(
            F.base(18).plus(F.stat("attack").minus(80).times(0.16).clamp(-6, 22))
                .times(F.when(F.pref("heavy"), F.const(1.2), F.const(1)))
                .clamp(12, 44).round(0),
            "碎屑数", {
                unit: "块",
                description: "炮口、弹道与命中处迸出的垃圾碎屑数量，随物攻增长；粒子按它发射，画面密度与机制一致。"
            }),
        /** 装填：16 − 速度偏移[−2,4] + 重装 2；夹 10..22。 */
        load: seconds(
            F.base(16).minus(F.stat("speed").minus(70).times(0.06).clamp(-2, 4))
                .plus(F.when(F.pref("heavy"), F.const(2), F.const(0))).clamp(10, 22).round(0),
            "装填", "把垃圾压进膛、瞄准再轰出去的时间；速度越快越短，重装取向多花一点。"),
        /** 收招：10；重装 ×1.15 / 轻装 ×0.9；夹 6..16。 */
        settle: seconds(
            F.base(10).times(F.when(F.pref("heavy"), F.const(1.15), F.const(0.9))).clamp(6, 16).round(0),
            "收招", "轰完把身体收回架势的时间；重装取向后坐更大、收得更慢。"),
        /** 冷却：40 − 等级(≥30)偏移[0,8] + 重装 4；夹 24..48。 */
        recharge: seconds(
            F.base(40).minus(F.level().minus(30).times(0.27).clamp(0, 8))
                .plus(F.when(F.pref("heavy"), F.const(4), F.const(0))).clamp(24, 48).round(0),
            "冷却", "两发之间的等待；PP 少、一发出手很贵，等级越高回得越快，重装取向更久。")
    });

    defineDamage("gunkshot", "wad", {});

    stages("gunkshot", [
        { level: 35, values: { wad: 128, shove: 0.55 } },
        { level: 50, values: { wad: 138, poisonChance: 0.42 } }
    ]);

    describe("gunkshot", [
        { key: "description.0", values: ["wad", "spread"] },
        { key: "description.1", values: ["shove", "poisonChance", "venomTicks"] },
        { key: "description.2", values: ["muzzle", "reach"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wad", "tier.0.shove"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wad", "tier.1.poisonChance"] }
    ]);
}
