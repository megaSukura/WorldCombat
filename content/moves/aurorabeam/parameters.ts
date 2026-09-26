/**
 * 极光束 / aurorabeam —— 参数与伤害段。
 *
 * 原生事实：Ice／特殊／威力 65／命中 100／PP 20／单体；10% 概率使目标攻击下降 1 级
 *   （Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「发射虹色光束」落成一条**会跑、会在冰面折一下的虹色光束**——在身前把冷光折成一段棱镜，
 * 沿瞄准线冲出去，落点结出一小片霜；挨到的人偶尔被这道冷光刺得攻击下降。它首次撞到已有的雪／冰表面
 * 时按真实方块面的法线镜面折射一次、剩余射程继续，然后才结束。与冰冻光束（瞬发贯穿的白蓝线、留冰线、
 * 冰冻）分开——极光束是看得见它一路跑到哪、还能借冰墙绕过掩体的彩虹缎带，只打最前面一个、留一小块霜斑、压攻击。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   beam        光束威力：特攻定冷光的压强，等级让虹色更烈。
 *   reach       射程：特攻决定这道光能照多远，也是两段飞行的总路程上限。
 *   velocity    光速：速度决定冲得多急。
 *   radius      判定半径：体型高度决定光柱粗细。
 *   chillChance 降攻概率：原生 10% 起，特攻与等级提高。
 *   chillStages 降攻级数：固定 1 级。
 *   band        霜斑块数：特攻决定打在地上结多少格霜，同时驱动画面密度。
 *   bandTicks   霜斑停留：等级决定霜留多久。
 *   shimmer     虹光数：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `spectrum`（虹谱）双向取舍：开启＝射程更远、判定更粗、霜斑更大更久、降攻更易触发，但威力 ×0.94、
 * 光速 ×0.85、起手 +2、冷却 +5；关闭（聚谱）＝更快更强更省的一束，代价是射程、霜斑与降攻都收窄。
 *
 * 伤害段 `beam`：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const aurorabeamId = "aurorabeam";
    export const aurorabeamScene = "world_combat:move_aurorabeam";
    export const aurorabeamChillText = "world_combat.move.aurorabeam.text.chill";
    export const aurorabeamMissText = "world_combat.move.aurorabeam.text.miss";

    actionParameters.define(aurorabeamId, {
        /** 光束威力：62 + 特攻偏移[−12,30] + 等级(≥25)偏移[0,10]，广谱 ×0.94；夹 40..110。 */
        beam: formula(
            F.base(62)
                .plus(F.stat("specialAttack").minus(55).times(0.26).clamp(-12, 30))
                .plus(F.level().minus(25).times(0.4).clamp(0, 10))
                .times(F.when(F.pref("spectrum"), F.const(0.94), F.const(1)))
                .clamp(40, 110).round(1),
            "光束威力", {
                unit: "威力",
                description: "被虹光烧到一次的基础威力；特攻越高冷光越烈，等级让虹色更沉。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：14 + 特攻偏移[−1.5,4]，广谱 ×1.12；夹 10..19。 */
        reach: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-1.5, 4))
                .times(F.when(F.pref("spectrum"), F.const(1.12), F.const(1)))
                .clamp(10, 19).round(2),
            "射程", {
                unit: "格",
                description: "这道虹光能照到多远；特攻越高越远，广谱更远。它也是本招的实际射程来源。"
            }),
        /** 光速：2.2 + 速度偏移[−0.3,0.6]，广谱 ×0.85；夹 1.5..3.0。 */
        velocity: formula(
            F.base(2.2)
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.3, 0.6))
                .times(F.when(F.pref("spectrum"), F.const(0.85), F.const(1)))
                .clamp(1.5, 3.0).round(2),
            "光速", {
                unit: "格/刻",
                description: "虹光冲出去的速度；速度快的个体射得更急，目标更难走位躲开。广谱更宽所以慢一点。"
            }),
        /** 判定半径：0.30 + 碰撞箱高度偏移[−0.04,0.16]，广谱 ×1.15；夹 0.24..0.55。 */
        radius: formula(
            F.base(0.30)
                .plus(F.body("height").minus(1.4).times(0.06).clamp(-0.04, 0.16))
                .times(F.when(F.pref("spectrum"), F.const(1.15), F.const(1)))
                .clamp(0.24, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "光柱的判定粗细；体型越高光柱越粗，广谱更宽。"
            }),
        /** 降攻概率：10% + 特攻偏移[−4%,12%] + 等级(≥25)偏移[0,5%]，广谱 ×1.25；夹 7%..34%。 */
        chillChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(55).times(0.0014).clamp(-0.04, 0.12))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .times(F.when(F.pref("spectrum"), F.const(1.25), F.const(1)))
                .clamp(0.07, 0.34).round(3),
            "降攻概率", "命中后让目标攻击下降 1 级的概率；原生 10% 起，特攻与等级越高越容易，广谱更容易。"),
        /** 降攻级数：固定 1 级。 */
        chillStages: formula(
            F.base(1),
            "降攻级数", {
                unit: "级",
                description: "一次寒芒让目标攻击下降的能力等级。"
            }),
        /** 霜斑块数：10 + 特攻偏移[0,18]，广谱 ×1.2；夹 8..34。 */
        band: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(55).times(0.14).clamp(0, 18))
                .times(F.when(F.pref("spectrum"), F.const(1.2), F.const(1)))
                .clamp(8, 34).round(0),
            "霜斑块数", {
                unit: "块",
                description: "虹光落点在地面结出多少格霜；特攻越高结得越多，广谱更大。它同时驱动画面里霜斑的密度。"
            }),
        /** 霜斑停留：80 + 等级(≥25)偏移[0,40] 刻，广谱 ×1.2；夹 60..180。 */
        bandTicks: seconds(
            F.base(80)
                .plus(F.level().minus(25).times(1).clamp(0, 40))
                .times(F.when(F.pref("spectrum"), F.const(1.2), F.const(1)))
                .clamp(60, 180).round(0),
            "霜斑停留", "虹光在地面结出的霜停留多久；等级越高留得越久，广谱更久。到期原方块回来。"),
        /** 虹光数：14 + 特攻偏移[0,22] + 等级(≥25)偏移[0,12]；夹 12..46。 */
        shimmer: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(55).times(0.16).clamp(0, 22))
                .plus(F.level().minus(25).times(0.3).clamp(0, 12))
                .clamp(12, 46).round(0),
            "虹光数", {
                unit: "点",
                description: "光束上跳动的虹色光点数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：11 − 速度偏移[−2.5,3]，广谱 +2；夹 6..16。 */
        tempo: seconds(
            F.base(11)
                .minus(F.stat("speed").minus(60).times(0.035).clamp(-2.5, 3))
                .plus(F.when(F.pref("spectrum"), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把冷光折成一段棱镜再射出的时间；速度越快越短，广谱多折一会儿。"),
        /** 收招：8 − 速度偏移[−1.5,2.5]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.5)).clamp(5, 12).round(0),
            "收招", "射出虹光后的收势；速度越快越利落。"),
        /** 冷却：30 − 速度偏移[−5,8]，广谱 +5；夹 20..46。 */
        recharge: seconds(
            F.base(30)
                .minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 8))
                .plus(F.when(F.pref("spectrum"), F.const(5), F.const(0)))
                .clamp(20, 46).round(0),
            "冷却", "两次折射虹光之间的等待；速度越快回得越快，广谱蓄得更久。")
    });

    defineDamage(aurorabeamId, "beam", {});

    stages(aurorabeamId, [
        { level: 34, values: { beam: 72, reach: 15 } },
        { level: 48, values: { beam: 80, band: 14, chillChance: 0.18 } }
    ]);

    describe(aurorabeamId, [
        { key: "description.0", values: ["beam"] },
        { key: "description.1", values: ["chillChance", "chillStages"] },
        { key: "description.2", values: ["reach","velocity","radius","band","bandTicks"] },
        { key: "spectrum.on", values: [], when: function (context) { return read(context.detail.values, ["spectrum"]) === true; } },
        { key: "spectrum.off", values: [], when: function (context) { return read(context.detail.values, ["spectrum"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.beam", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.beam", "tier.1.band", "tier.1.chillChance"] }
    ]);
}
