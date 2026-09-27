namespace PokemonSkills {
    actionParameters.define("selfdestruct", {
        /** 爆心威力：200 + 物攻偏移[−30,80] + 体重偏移[−16,50]；聚爆 ×1.28 / 扩散 ×0.88；夹 120..330。 */
        blast: formula(
            F.base(200)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.body("weight").minus(60).times(0.1).clamp(-16, 50))
                .times(F.when(F.pref("focus", text("worldcombat.skill.selfdestruct.preference.focus")), F.const(1.28), F.const(0.88)))
                .clamp(120, 330).round(1),
            "爆心威力", {
                unit: "威力",
                description: "爆开时对圈内每个目标结算一次的基础威力；物攻越高、身体越沉炸得越狠。对手防御、相性与暴击在命中时另算。"
            }),
        /** 爆心半径：4.0 + 高度偏移[−0.4,1.4] + 体重偏移[−0.3,1.0]；聚爆 ×0.74 / 扩散 ×1.18；夹 2.8..6.4。 */
        blastRadius: formula(
            F.base(4.0)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.4, 1.4))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.3, 1.0))
                .times(F.when(F.pref("focus", text("worldcombat.skill.selfdestruct.preference.focus")), F.const(0.74), F.const(1.18)))
                .clamp(2.8, 6.4).round(2),
            "爆心半径", {
                unit: "格",
                description: "爆炸罩住身周多大一圈；个子高、身体沉的个体炸得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 向外掀开：0.9 + 体重偏移[−0.1,0.6] + 物攻偏移[−0.1,0.5]；聚爆 ×1.1 / 扩散 ×0.95；夹 0.4..1.9。 */
        knock: formula(
            F.base(0.9)
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.1, 0.6))
                .plus(F.stat("attack").minus(60).times(0.005).clamp(-0.1, 0.5))
                .times(F.when(F.pref("focus", text("worldcombat.skill.selfdestruct.preference.focus")), F.const(1.1), F.const(0.95)))
                .clamp(0.4, 1.9).round(2),
            "向外掀开", {
                unit: "格",
                description: "被爆风沿离中心方向掀开的距离；身体越沉、力量越大掀得越远。"
            }),
        /** 上抛初速：0.35 + 体重偏移[−0.08,0.4]；夹 0.15..0.8。 */
        lift: formula(
            F.base(0.35).plus(F.body("weight").minus(60).times(0.0022).clamp(-0.08, 0.4)).clamp(0.15, 0.8).round(3),
            "上抛初速", {
                unit: "格/刻",
                description: "被爆风向上抛起的初速；越沉的个体把自己与别人掀得越高。"
            }),
        /** 碎屑量：26 + 体重 ×0.2 + 物攻 ×0.2；聚爆 ×0.8 / 扩散 ×1.2；夹 16..60。同时驱动画面密度。 */
        debris: formula(
            F.base(26)
                .plus(F.body("weight").times(0.2))
                .plus(F.stat("attack").times(0.2))
                .times(F.when(F.pref("focus", text("worldcombat.skill.selfdestruct.preference.focus")), F.const(0.8), F.const(1.2)))
                .clamp(16, 60).round(0),
            "碎屑量", {
                unit: "片",
                description: "爆开时炸飞的碎屑量；身体越沉、物攻越高越多，也决定画面的密集程度。"
            }),
        /** 焦痕停留：60 + 等级偏移[0,40]；夹 40..140。 */
        scorchTicks: seconds(
            F.base(60).plus(F.level().minus(20).max(0).times(0.8)).clamp(40, 140).round(0),
            "焦痕停留", "爆炸后焦烟残尘淡去前的停留时间；等级越高越久。"),
        /** 残尘密度：10 + 物攻 ×0.1；夹 8..26。同时驱动画面密度。 */
        scorchCells: formula(
            F.base(10).plus(F.stat("attack").times(0.1)).clamp(8, 26).round(0),
            "残尘密度", {
                unit: "点",
                description: "爆炸后残尘与余烬的视觉密度；随物攻增长。"
            }),
        /** 起手：12 − 速度偏移[−2,4] − 聚爆 2 / 扩散 +2；夹 8..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 4))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.selfdestruct.preference.focus")), F.const(-2), F.const(2)))
                .clamp(8, 18).round(0),
            "起手", "身体急涨、缝里透光到爆开需要多久；速度越快越急，聚爆式更短、扩散式更长。"),
        /** 冷却：70 − 等级偏移[0,12] + 聚爆 6 / 扩散 −6；夹 45..100。 */
        recharge: seconds(
            F.base(70).minus(F.level().minus(20).max(0).times(0.3).clamp(0, 12))
                .plus(F.when(F.pref("focus", text("worldcombat.skill.selfdestruct.preference.focus")), F.const(6), F.const(-6)))
                .clamp(45, 100).round(0),
            "冷却", "一次自爆后要等多久；等级越高回手越快，聚爆式更久。无论哪个方向，使用者都会倒下。"),
        maxTargets: hidden(12)
    });

    defineDamage("selfdestruct", "blast", {});

    stages("selfdestruct", [
        { level: 40, values: { blast: 240, blastRadius: 4.6, debris: 40 } }
    ]);

    describe("selfdestruct", [
        { key: "description.0", values: ["blast","maxTargets"] },
        { key: "description.1", values: ["blastRadius"] },
        { key: "description.2", values: ["knock", "lift"] },
        { key: "description.3", values: ["scorchTicks", "scorchCells"] },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.blastRadius"] }
    ]);
}
