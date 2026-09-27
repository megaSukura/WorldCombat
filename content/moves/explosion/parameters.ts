namespace PokemonSkills {
    actionParameters.define("explosion", {
        /** 爆心威力：250 + 物攻偏移[−35,95] + 体重偏移[−20,60]；蓄爆 ×1.12 / 瞬爆 ×0.95；夹 150..400。 */
        blast: formula(
            F.base(250)
                .plus(F.stat("attack").minus(60).times(0.6).clamp(-35, 95))
                .plus(F.body("weight").minus(60).times(0.12).clamp(-20, 60))
                .times(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(1.12), F.const(0.95)))
                .clamp(150, 400).round(1),
            "爆心威力", {
                unit: "威力",
                description: "大引爆时对圈内每个目标结算一次的基础威力；物攻越高、身体越沉炸得越狠。对手防御、相性与暴击在命中时另算。"
            }),
        /** 爆心半径：5.6 + 高度偏移[−0.5,1.8] + 体重偏移[−0.4,1.2]；蓄爆 ×1.12 / 瞬爆 ×0.95；夹 4.0..8.4。 */
        blastRadius: formula(
            F.base(5.6)
                .plus(F.body("height").minus(1.4).times(1.1).clamp(-0.5, 1.8))
                .plus(F.body("weight").minus(60).times(0.005).clamp(-0.4, 1.2))
                .times(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(1.12), F.const(0.95)))
                .clamp(4.0, 8.4).round(2),
            "爆心半径", {
                unit: "格",
                description: "大引爆罩住爆点周围多大一圈；个子高、身体沉的个体炸得更开。它也是指示圈半径，圈就是会被炸到的地。"
            }),
        /** 推进距离：4.0 + 高度偏移[−0.6,1.0]；夹 3.0..5.5。既是引信期间身体能压进的上限，也是本招的选取射程。 */
        deliverRange: formula(
            F.base(4.0).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.6, 1.0)).clamp(3.0, 5.5).round(2),
            "推进距离", {
                unit: "格",
                description: "提交后朝所选近地点推进的上限；也是本招能选多远的地面。个子越高推得越远。"
            }),
        /** 引信：20 刻 − 速度偏移[−2,3]；蓄爆 +3；夹 15..26。走完引信才在真实位置引爆。 */
        fuse: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(3), F.const(0)))
                .clamp(15, 26).round(0),
            "引信", "提交后引信烧多久才引爆；这一段里身体只朝爆点短步前进、不攻击，对手能看着圈熄灭走开。速度越快越短，蓄爆式更长。"),
        /** 推进速度：0.4 + 速度偏移[−0.16,0.24]；夹 0.2..0.72。 */
        deliverSpeed: formula(
            F.base(0.4).plus(F.stat("speed").minus(60).times(0.003).clamp(-0.16, 0.24)).clamp(0.2, 0.72).round(3),
            "推进速度", {
                unit: "格/刻",
                description: "引信期间身体压向爆点的速度；速度越高越快到位，到位后停住等引信烧完。"
            }),
        /** 向外掀飞：1.5 + 体重偏移[−0.15,0.9] + 物攻偏移[−0.15,0.8]；蓄爆 ×1.05；夹 0.7..2.6。 */
        knock: formula(
            F.base(1.5)
                .plus(F.body("weight").minus(60).times(0.006).clamp(-0.15, 0.9))
                .plus(F.stat("attack").minus(60).times(0.008).clamp(-0.15, 0.8))
                .times(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(1.05), F.const(1)))
                .clamp(0.7, 2.6).round(2),
            "向外掀飞", {
                unit: "格",
                description: "被爆风沿离中心方向掀飞的距离；三招爆炸里掀得最远，身体越沉、力量越大越远。"
            }),
        /** 上抛初速：0.55 + 体重偏移[−0.1,0.6]；夹 0.25..1.1。 */
        lift: formula(
            F.base(0.55).plus(F.body("weight").minus(60).times(0.0035).clamp(-0.1, 0.6)).clamp(0.25, 1.1).round(3),
            "上抛初速", {
                unit: "格/刻",
                description: "被爆风向上抛起的初速；越沉的个体把自己与别人掀得越高。"
            }),
        /** 碎屑量：40 + 体重 ×0.25 + 物攻 ×0.25；蓄爆 ×1.15 / 瞬爆 ×0.9；夹 24..90。同时驱动画面密度。 */
        debris: formula(
            F.base(40)
                .plus(F.body("weight").times(0.25))
                .plus(F.stat("attack").times(0.25))
                .times(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(1.15), F.const(0.9)))
                .clamp(24, 90).round(0),
            "碎屑量", {
                unit: "片",
                description: "炸飞的碎屑量；身体越沉、物攻越高越多，也决定画面的密集程度。"
            }),
        /** 余烬停留：120 + 等级偏移[0,80]；蓄爆 ×1.6 / 瞬爆 ×1.0；夹 80..320。 */
        craterTicks: seconds(
            F.base(120).plus(F.level().minus(20).max(0).times(1.6).clamp(0, 80))
                .times(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(1.6), F.const(1.0)))
                .clamp(80, 320).round(0),
            "余烬停留", "爆炸后烟尘余烬淡去前的停留时间；等级越高越久，蓄爆式更久。"),
        /** 余烬密度：20 + 物攻 ×0.2 + 体重 ×0.2；夹 14..48。同时驱动画面密度。 */
        craterCells: formula(
            F.base(20).plus(F.stat("attack").times(0.2)).plus(F.body("weight").times(0.2)).clamp(14, 48).round(0),
            "余烬密度", {
                unit: "点",
                description: "爆炸后残尘与余烬的视觉密度；随物攻与体重增长。"
            }),
        /** 起手：16 − 速度偏移[−3,5] + 蓄爆 6；夹 10..26。 */
        tempo: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.025).clamp(-3, 5))
                .plus(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(6), F.const(0)))
                .clamp(10, 26).round(0),
            "起手", "从压地蓄力到引爆需要多久；这一整段可以被对手打断（打断则不花任何代价），蓄爆式更长。"),
        /** 冷却：90 − 等级偏移[0,16] + 蓄爆 14 / 瞬爆 −8；夹 60..140。 */
        recharge: seconds(
            F.base(90).minus(F.level().minus(20).max(0).times(0.4).clamp(0, 16))
                .plus(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(14), F.const(-8)))
                .clamp(60, 140).round(0),
            "冷却", "一次大引爆后要等多久；等级越高回手越快，蓄爆式更久。无论哪个方向，使用者都会倒下。"),
        maxTargets: hidden(14)
    });

    defineDamage("explosion", "blast", { defenceCoefficient: 0.0055, rationale: "巨大爆炸对防御的穿透略强于默认，让力量与体重的差别更可见。" });

    stages("explosion", [
        { level: 48, values: { blast: 300, blastRadius: 6.2, debris: 60 } }
    ]);

    describe("explosion", [
        { key: "description.0", values: ["blast","maxTargets"] },
        { key: "description.1", values: ["blastRadius"] },
        { key: "description.2", values: ["deliverRange","fuse","deliverSpeed"] },
        { key: "description.3", values: ["knock", "lift"] },
        { key: "description.4", values: ["craterTicks","craterCells"] },
        { key: "charged.on", values: [], when: function (context) { return read(context.detail.values, ["charged"]) === true; } },
        { key: "charged.off", values: [], when: function (context) { return read(context.detail.values, ["charged"]) !== true; } },
        { key: "timing", values: ["range","prepare","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.blastRadius"] }
    ]);
}
