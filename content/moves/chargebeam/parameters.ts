/**
 * 充电光束 / chargebeam —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Electric／特殊／威力 50／命中 90／PP 10／单体；命中后有 70% 让自身特攻 +1。
 * 翻译：把「向对手发射电击光束，由于蓄满电流有时提高自己的特攻」落成**一道蓄电射出的细束**——起手把电向身前收拢、
 *   压成一道束射出去；命中时束里积下的余流顺着手臂回灌，把特攻抬起来，并在稍后于命中点再咬一口（余流）。
 *   它是四式里唯一的远距离直线光束：蓄得越久越远越强、余流也越足；代价是起手最长。
 *
 * 与同族分开：火之舞是贴着自己跳、覆盖全身、扫一圈；充电光束是远远一点直线过去、命中了才回灌特攻。
 *   与十万伏特（电弹炸开、麻痹）也不同——它是一条细束、蓄电驱动、命中后涨特攻而不是麻痹。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   beam          光束威力：特攻决定电压，等级决定蓄电深度；过充式 ×1.2。
 *   velocity      飞行速度：速度决定出手的干脆程度。
 *   radius        光束判定：碰撞箱高度（大个子束更粗）。
 *   reach         射程：等级与特攻；过充式 ×1.2。
 *   surgeChance   回灌几率：特攻与等级；过充式更足（原生 70% 的即时化）。
 *   surgeStages   回灌级数：等级 55 台阶抬到 2。
 *   residualShare 余流占比：特攻；命中后那一口的轻重。
 *   residualDelay 余流延迟：速度；越快余流咬得越急。
 *   arcs          电弧条数：特攻；表现里的电弧数量。
 *   homing        追踪转向：特攻；只够修正走位。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却；过充式以更慢更贵换更远更足。
 *
 * 配置 `overcharge`（过充）双向取舍：开启＝起手与冷却更久，但射程、威力、回灌几率与电弧都更高；
 * 关闭（速射）＝更快更便宜、飞行更快，射程与回灌几率都较低。两个方向对应「远处一发狠的」与「贴身速点」。
 */
namespace PokemonSkills {
    actionParameters.define("chargebeam", {
        /** 光束威力：50 + 特攻偏移[−10,34] + 等级偏移[−3,9]；过充 ×1.20 / 速射 ×0.90；夹 30..110。 */
        beam: formula(
            F.base(50).plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-10, 34))
                .plus(F.level().minus(20).times(0.15).clamp(-3, 9))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(1.20), F.const(0.90)))
                .clamp(30, 110).round(1),
            "光束威力", {
                unit: "威力",
                description: "光束命中时那一下的威力；特攻越高电压越足、蓄电越深越强。对手特防、相性与暴击在命中时另算。"
            }),
        /** 飞行速度：2.2 + 速度偏移[−0.3,0.8]；速射 ×1.1；夹 1.6..3.4。 */
        velocity: formula(
            F.base(2.2).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.3, 0.8))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(1), F.const(1.1)))
                .clamp(1.6, 3.4).round(2),
            "光束速度", {
                unit: "格/刻",
                description: "细束沿直线射出去的速度；速度快的个体出手更干脆，速射式更快。"
            }),
        /** 光束判定：0.28 + 身高偏移[−0.03,0.15]；夹 0.20..0.55。 */
        radius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.03, 0.15)).clamp(0.20, 0.55).round(2),
            "光束判定", {
                unit: "格",
                description: "这条细束的横向判定半径；身板越大束越粗一点点。"
            }),
        /** 射程：9 + 等级偏移[0,2.4] + 特攻偏移[−0.8,1.6]；过充 ×1.20；夹 6..15。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.08).clamp(0, 2.4))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.8, 1.6))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(1.20), F.const(1)))
                .clamp(6, 15).round(2),
            "射程", {
                unit: "格",
                description: "能把电束打多远；等级越高、特攻越强够得越远，过充式再拉长一截。它也是本招的实际射程。"
            }),
        /** 回灌几率：0.70 + 特攻偏移[0,0.12] + 等级偏移[0,0.08]；过充 ×1.15；夹 0.40..0.95。 */
        surgeChance: percent(
            F.base(0.70).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(0, 0.12))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.08))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(1.15), F.const(1)))
                .clamp(0.40, 0.95).round(3),
            "回灌几率", "命中后余流回灌、特攻提升的几率；原生约 70%，特攻与等级把它抬得更稳，过充式更足。"),
        /** 回灌级数：固定 1，等级 55 台阶抬到 2；夹 1..2。 */
        surgeStages: formula(F.base(1).clamp(1, 2).round(0), "回灌级数", {
            unit: "级",
            description: "一次回灌提升的特攻级数；高级个体一发电到两级。"
        }),
        /** 余流占比：0.35 + 特攻偏移[−0.05,0.20]；夹 0.20..0.60。 */
        residualShare: percent(
            F.base(0.35).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.05, 0.20)).clamp(0.20, 0.60).round(3),
            "余流占比", "命中后余流再咬一口，这一口是直击威力的几成。"),
        /** 余流延迟：6 − 速度偏移[−2,2]；夹 4..9。 */
        residualDelay: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(4, 9).round(0),
            "余流延迟", "命中后余流在目标身上再咬一口的间隔；速度越快咬得越急。"),
        /** 电弧条数：7 + 特攻偏移[0,8]；过充 ×1.25；夹 5..20。 */
        arcs: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(0, 8))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(1.25), F.const(1)))
                .clamp(5, 20).round(0),
            "电弧条数", {
                unit: "条",
                description: "起手蓄电与命中时迸开的电弧数量；特攻越高越密，也是画面里电弧的数量。"
            }),
        /** 追踪转向：2.4 + 特攻偏移[−0.6,1.5]；夹 1.4..4.5。 */
        homing: formula(
            F.base(2.4).plus(F.stat("specialAttack").minus(60).times(0.015).clamp(-0.6, 1.5)).clamp(1.4, 4.5).round(2),
            "追踪转向", {
                unit: "度/刻",
                description: "细束每刻朝目标修正的幅度；只够修正走位，大幅度横向甩开仍然能躲。"
            }),
        /** 起手：10 − 速度偏移[−2,3] + 过充 5；夹 6..20。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(5), F.const(0)))
                .clamp(6, 20).round(0),
            "起手", "把电收进身前一点、压成细束的时间；速度越快越短，过充式多蓄五刻。"),
        /** 收招：7 − 速度偏移[−1,1.5]；夹 5..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 1.5)).clamp(5, 11).round(0),
            "收招", "射完稳住手臂的收势；速度越快越利落。"),
        /** 冷却：30 − 等级(≥20)偏移[0,6] + 过充 8；夹 18..48。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(20).times(0.10).clamp(0, 6))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.chargebeam.preference.overcharge")), F.const(8), F.const(0)))
                .clamp(18, 48).round(0),
            "冷却", "两次放电之间的等待；等级越高回得越快，过充式缓得更久。")
    });

    defineDamage("chargebeam", "beam", {});

    stages("chargebeam", [
        { level: 35, values: { beam: 58 } },
        { level: 55, values: { beam: 66, surgeStages: 2 } }
    ]);

    describe("chargebeam", [
        { key: "description.0", values: ["beam","reach","velocity"] },
        { key: "description.1", values: ["radius","surgeChance","surgeStages"] },
        { key: "description.2", values: ["residualShare","residualDelay"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.beam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.beam", "tier.1.surgeStages"] }
    ]);
}
