/**
 * 金属爪 / metalclaw —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Steel／物理／威力 50／命中 95／PP 35／接触；命中后有 10% 让自身物攻 +1。
 * 翻译：把「用钢铁之爪劈开对手，有时提高自己的攻击」落成**贴脸沿自由准心左右两爪各劈一下**——爪刃劈中活物就被磨出锋口，
 *   磨出的物攻让下一记劈得更重；它是四式里最近、最快、最便宜的一记，靠贴着目标连打把攻击一点点喂起来。
 *
 * 与同族分开：钢翼是横向一扇、把面前的人一起扫开、磨的是防御；金属爪是贴脸两点、磨的是攻击，越劈越重。
 *   本招的配置是「重爪式」（一记更重）与「连爪式」（两记），与独立招式「磨爪」无关。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   rake          爪击威力：物攻给出爪劲、速度给出挥速；重爪式一记更重，连爪式每记更轻。
 *   reach         爪程：速度与体型共同决定够到多远；目标选择按身体外缘再多 0.4 格余量，爪迹本身仍走 reach。
 *   radius        爪刃判定：身高与体重决定爪面宽度。
 *   gap           两爪间隔：速度越快两爪接得越紧。
 *   sharpenChance 磨利几率：物攻与等级；重爪式更专注，连爪式每记各掷一次。
 *   sharpenStages 单次施放最多磨起的物攻级数：等级 55 台阶抬到 2。
 *   knock         击退：物攻。
 *   sparks        火星数量：物攻与速度派生，表现按它发射。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却；重爪式以更慢更贵换更重的单记。
 *
 * 配置 `hone`（重爪式）双向取舍：开启＝只劈一记但更重、更高几率、击退更远，起手与冷却更久；
 * 关闭（连爪式）＝两记各掷一次磨利，更快更便宜、单记更轻。两个方向分别对应「稳扎一记」与「多点机会」。
 */
namespace PokemonSkills {
    actionParameters.define("metalclaw", {
        /** 爪击威力：50 + 物攻偏移[−10,30] + 速度偏移[−8,14]；磨爪 ×1.40 / 连爪每记 ×0.66；夹 22..104。 */
        rake: formula(
            F.base(50).plus(F.stat("attack").minus(60).times(0.20).clamp(-10, 30))
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-8, 14))
                .times(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(1.40), F.const(0.66)))
                .clamp(22, 104).round(1),
            "爪击威力", {
                unit: "威力",
                description: "每一记钢爪劈中的威力；物攻越重、挥得越快越狠。重爪式合成一记更重的劈砍，连爪式把力分成两记。对手防御、相性与暴击在命中时另算。"
            }),
        /** 爪程：2.0 + 速度偏移[−0.3,0.6] + 身高偏移[−0.1,0.3]；磨爪 ×1.12；夹 1.70..3.20。 */
        reach: formula(
            F.base(2.0).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.6))
                .plus(F.body("height").minus(1.4).times(0.08).clamp(-0.1, 0.3))
                .times(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(1.12), F.const(1)))
                .clamp(1.70, 3.20).round(2),
            "爪程", {
                unit: "格",
                description: "钢爪沿准心真实劈出的距离；腿快、身长的个体够得更远，重爪式探得更深一点。目标选择距离在此之上按身体外缘再加 0.4 格余量，爪迹本身仍按此值。"
            }),
        /** 爪刃判定：0.5 + 身高偏移[−0.05,0.25] + 体重偏移[−0.04,0.20]；夹 0.38..0.90。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.05, 0.25))
                .plus(F.body("weight").minus(50).times(0.0008).clamp(-0.04, 0.20)).clamp(0.38, 0.90).round(2),
            "爪刃判定", {
                unit: "格",
                description: "这一爪扫过的横向判定半径；身板越大越沉，爪面越宽。"
            }),
        /** 两爪间隔：5 − 速度偏移[−2,2]；夹 3..8。 */
        gap: formula(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(3, 8).round(0),
            "两爪间隔", {
                unit: "刻",
                description: "连爪式里左右两爪之间的间隔；速度越快接得越紧，也越难被反手打断。重爪式只有一记，此项不生效。"
            }),
        /** 磨利几率：0.10 + 物攻偏移[0,0.10] + 等级偏移[0,0.08]；磨爪 ×1.35 / 连爪 ×0.85；夹 0.05..0.34。 */
        sharpenChance: percent(
            F.base(0.10).plus(F.stat("attack").minus(60).times(0.0009).clamp(0, 0.10))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.08))
                .times(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(1.35), F.const(0.85)))
                .clamp(0.05, 0.34).round(3),
            "磨利几率", "劈中后爪刃被磨出锋口、物攻提升的几率；重爪式捏得更准，连爪式每记各掷一次。"),
        /** 磨利级数：固定 1，等级 55 台阶抬到 2；夹 1..2。 */
        sharpenStages: formula(F.base(1).clamp(1, 2).round(0), "磨利级数", {
            unit: "级",
            description: "一次施放里最多磨起的物攻级数；连爪式两记各掷一次也共享这个上限，高级个体一记可磨两级。"
        }),
        /** 击退：0.18 + 物攻偏移[0,0.20]；磨爪 ×1.4；夹 0.10..0.50。 */
        knock: formula(
            F.base(0.18).plus(F.stat("attack").minus(60).times(0.0015).clamp(0, 0.20))
                .times(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(1.4), F.const(1)))
                .clamp(0.10, 0.50).round(2),
            "击退", {
                unit: "格",
                description: "劈中后把目标带开的方向偏移；物攻越高推得越远，重爪式的一记掀得更开。"
            }),
        /** 火星数量：10 + 物攻偏移[−4,14] + 速度偏移[−3,10]；夹 8..34。 */
        sparks: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 14))
                .plus(F.stat("speed").minus(60).times(0.08).clamp(-3, 10)).clamp(8, 34).round(0),
            "火星数量", {
                unit: "个",
                description: "爪刃相击与劈中时溅起的钢火星数量，随物攻与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−1.5,2] + 磨爪 3；夹 4..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.015).clamp(-1.5, 2))
                .plus(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(3), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "张开双爪、把刃口亮出来的时间；速度越快越短，重爪式多蓄一拍。"),
        /** 收招：6 − 速度偏移[−1,1.5] + 磨爪 1；夹 4..11。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1.5))
                .plus(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(1), F.const(0)))
                .clamp(4, 11).round(0),
            "收招", "两爪收势的时间；速度越快越利落。"),
        /** 冷却：22 − 等级(≥20)偏移[0,5] + 磨爪 6；夹 14..34。 */
        recharge: seconds(
            F.base(22).minus(F.level().minus(20).times(0.08).clamp(0, 5))
                .plus(F.when(F.pref("hone", text("worldcombat.skill.metalclaw.preference.hone")), F.const(6), F.const(0)))
                .clamp(14, 34).round(0),
            "冷却", "两次出爪之间的等待；等级越高回得越快，重爪式缓得更久。")
    });

    defineDamage("metalclaw", "rake", {}, { contact: true });

    stages("metalclaw", [
        { level: 30, values: { rake: 56 } },
        { level: 55, values: { rake: 64, sharpenStages: 2 } }
    ]);

    describe("metalclaw", [
        { key: "description.0", values: ["rake", "radius"] },
        { key: "description.1", values: ["reach", "gap", "knock"] },
        { key: "description.2", values: ["sharpenChance","sharpenStages"] },
        { key: "hone.on", values: [], when: function (context) { return read(context.detail.values, ["hone"]) === true; } },
        { key: "hone.off", values: [], when: function (context) { return read(context.detail.values, ["hone"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rake"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rake", "tier.1.sharpenStages"] }
    ]);
}
