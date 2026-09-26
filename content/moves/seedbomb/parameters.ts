/** The original high drop height now shapes the real ballistic arc, before a short native rebound. */
namespace PokemonSkills {
    actionParameters.define("seedbomb", {
        /** 整荚威力：74 + 物攻偏移[−10,34] + 体重偏移[−6,14]；重荚 ×1.18 / 散荚 ×0.9；夹 40..132。 */
        volley: formula(
            F.base(74)
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-10, 34))
                .plus(F.body("weight").minus(300).times(0.006).clamp(-6, 14))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.seedbomb.preference.heavy")), F.const(1.18), F.const(0.9)))
                .clamp(40, 132).round(1),
            "整荚威力", {
                base: 74, unit: "威力",
                description: "整荚硬种砸下来那一下的基础威力；物攻越高荚越有力，身体越沉种子越硬。这是没算落种数量的整荚值。对手防御、相性与暴击在命中时另算。"
            }),
        /** 落种数量：14 + 物攻偏移[−4,22] + 等级(≥25)偏移[0,16]；重荚 ×0.7 / 散荚 ×1.35；夹 6..48。 */
        seeds: formula(
            F.base(14)
                .plus(F.stat("attack").minus(60).times(0.16).clamp(-4, 22))
                .plus(F.level().minus(25).times(0.4).clamp(0, 16))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.seedbomb.preference.heavy")), F.const(0.7), F.const(1.35)))
                .clamp(6, 48).round(0),
            "落种数量", {
                base: 14, unit: "颗",
                description: "从上方撒下多少颗硬种；物攻与等级越高越多，它也决定画面里种雨的密度。"
            }),
        /** 落点半径：1.5 + 宽度偏移[0,2.0]；重荚 ×0.85 / 散荚 ×1.15；夹 1.2..3.4。 */
        spread: formula(
            F.base(1.5)
                .plus(F.body("width").minus(0.9).times(0.9).clamp(0, 2.0))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.seedbomb.preference.heavy")), F.const(0.85), F.const(1.15)))
                .clamp(1.2, 3.4).round(2),
            "落点半径", {
                base: 1.5, unit: "格",
                description: "种雨盖住多大一圈；身体越宽撒得越开，重荚收窄、散荚放宽。它也是判定环与画面圈共用的半径。"
            }),
        /** 高抛弧高：4.2 + 身高偏移[0,2.4] + 等级(≥25)偏移[0,1.6]；夹 3.5..8。 */
        dropHeight: formula(
            F.base(4.2)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(0, 2.4))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.6))
                .clamp(3.5, 8).round(2),
            "高抛弧高", {
                base: 4.2, unit: "格",
                description: "实际高抛轨迹的弧高预算；高大和高等级个体抛得更高，种荚仍受真实顶棚阻挡。"
            }),
        /** 荚体半径：0.28 + 身高偏移[−0.05,0.3]；夹 0.22..0.6。 */
        seedRadius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.05, 0.3)).clamp(0.22, 0.6).round(2),
            "荚体半径", {
                base: 0.28, unit: "格",
                description: "真实种荚飞行、反弹与接触时的半径。"
            }),
        /** 高抛速度：0.62 + 速度偏移[−0.08,0.2]；夹 0.5..0.85。 */
        arcSpeed: formula(
            F.base(0.62).plus(F.stat("speed").minus(60).times(0.003).clamp(-0.08, 0.2)).clamp(0.5, 0.85).round(3),
            "高抛速度", {
                base: 0.62, unit: "格/刻",
                description: "高抛的水平投送速度预算；实际初速同时满足弧高和选定落点。"
            }),
        /** 投掷距离：10 + 物攻偏移[−1.5,3] + 等级(≥25)偏移[0,2]；夹 8..15。 */
        reach: formula(
            F.base(10)
                .plus(F.stat("attack").minus(60).times(0.03).clamp(-1.5, 3))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2))
                .clamp(8, 15).round(2),
            "投掷距离", {
                base: 10, unit: "格",
                description: "能把种荚抛到多远的目标上方；物攻与等级越高送得越远，也是本招的实际射程。"
            }),
        /** 碎壳量：18 + 物攻偏移[−6,30]；夹 12..44。 */
        chaff: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.18).clamp(-6, 30)).clamp(12, 44).round(0),
            "碎壳量", {
                base: 18, unit: "片",
                description: "命中时崩开的碎壳数量，由物攻换算；它驱动命中碎屑的表现，不是独立伤害。"
            }),
        /** 起手：11 − 速度偏移[−3,4] + 重荚 3；夹 6..18。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.seedbomb.preference.heavy")), F.const(3), F.const(0)))
                .clamp(6, 18).round(0),
            "起手", "把种荚拎起、抛出前蓄势的时间；速度越快越短，重荚要多花一点。"),
        /** 收招：10 − 速度偏移[−2,3]；夹 5..15。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(5, 15).round(0),
            "收招", "抛完种荚后收势的时间；速度快的个体更短。"),
        /** 冷却：32 − 速度偏移[−4,6] + 重荚 5；夹 18..46。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(60).times(0.06).clamp(-4, 6))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.seedbomb.preference.heavy")), F.const(5), F.const(0)))
                .clamp(18, 46).round(0),
            "冷却", "再次抛荚前的等待；重荚更长，散荚更短。")
    });

    defineDamage("seedbomb", "volley", {}, { contact: false });

    stages("seedbomb", [
        { level: 38, values: { volley: 88, spread: 1.75 } }
    ]);

    describe("seedbomb", [
        { key: "description.0", values: ["volley"] },
        { key: "description.1", values: ["spread","seedRadius"] },
        { key: "description.2", values: ["reach", "arcSpeed"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.volley", "tier.0.spread"] }
    ]);
}
