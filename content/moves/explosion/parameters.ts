/**
 * 大爆炸 / explosion 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 250／命中 100／PP 5／target allAdjacent（自己周围所有宝可梦）／
 *   `selfdestruct: "always"`——无论有没有打中，使用者都用完即陷入濒死；无次要效果。
 *
 * 翻译：把「引发大爆炸」翻成**一次蓄足了才放手的大引爆**：起手先把地面从脚下震裂、光从缝里漏出，
 *   提交后炸成一朵顶天立地的火球，外圈冲击环贴着地面横扫出去，圈里所有人被狠狠掀飞、抛起，
 *   尘埃落定后在地上留下一个焦黑的弹坑（租借，到期原方块回来）。与同族分开：
 *     大爆炸 —— 最大、最慢、掀得最远，炸完留下焦黑弹坑；蓄爆式再抬一档、坑留更久；
 *     自爆   —— 更小更快的一颗紧凑火球，留给对手的反应时间更短；
 *     搏命   —— 只打贴身一个、伤害等于自己当前生命；
 *     临别礼物 —— 不打伤害，把命换成削弱与遗念。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast        爆心威力 250 + 物攻偏移 + 体重偏移（身体越重、力量越大炸得越狠）。
 *   blastRadius  爆心半径 5.6 格 + 碰撞箱高度偏移 + 体重偏移（个子高、身体沉炸得越开）。
 *   knock        向外掀飞 1.5 格 + 体重偏移 + 物攻偏移（三招爆炸里掀得最远）。
 *   lift         上抛初速 0.55 格/刻 + 体重偏移。
 *   debris       碎屑量 40 + 体重 ×0.25 + 物攻 ×0.25（同时驱动画面密度）。
 *   craterTicks  弹坑停留 120 刻 + 等级偏移；蓄爆式 ×1.6。
 *   craterCells  弹坑块数 20 + 物攻 ×0.2 + 体重 ×0.2（同时驱动画面密度）。
 *   tempo／recharge  速度与等级决定起手与冷却。
 *
 * 配置 `charged`（蓄爆式）：开启＝威力 ×1.12、半径 ×1.12、弹坑停留 ×1.6，但起手 +6 刻、冷却 +14
 *   （可被打断的窗口更长）；关闭（瞬爆式）＝威力 ×0.95、半径 ×0.95、冷却 −8，出手更快、坑更短。
 *   两向各有适用局面：蓄爆吃满收益但要赌不被打断，瞬爆求稳、求快。无论哪个方向，使用者都会倒下。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原始类别 Physical、Normal 属性；打不到幽灵由属性表拦住）。
 */
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
                description: "大引爆罩住身周多大一圈；个子高、身体沉的个体炸得更开。它也是本招的实际射程与指示圈半径。"
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
        /** 弹坑停留：120 + 等级偏移[0,80]；蓄爆 ×1.6 / 瞬爆 ×1.0；夹 80..320。 */
        craterTicks: seconds(
            F.base(120).plus(F.level().minus(20).max(0).times(1.6).clamp(0, 80))
                .times(F.when(F.pref("charged", text("worldcombat.skill.explosion.preference.charged")), F.const(1.6), F.const(1.0)))
                .clamp(80, 320).round(0),
            "弹坑停留", "焦黑弹坑停留多久；到期原方块回来，等级越高留得越久，蓄爆式更久。"),
        /** 弹坑块数：20 + 物攻 ×0.2 + 体重 ×0.2；夹 14..48。同时驱动画面密度。 */
        craterCells: formula(
            F.base(20).plus(F.stat("attack").times(0.2)).plus(F.body("weight").times(0.2)).clamp(14, 48).round(0),
            "弹坑块数", {
                unit: "块",
                description: "地面被炸出的弹坑块数；随物攻与体重增长，也决定画面的密度。"
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
        { key: "description.2", values: ["knock", "lift"] },
        { key: "description.3", values: ["craterTicks","craterCells"] },
        { key: "charged.on", values: [], when: function (context) { return read(context.detail.values, ["charged"]) === true; } },
        { key: "charged.off", values: [], when: function (context) { return read(context.detail.values, ["charged"]) !== true; } },
        { key: "timing", values: ["range","prepare","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.blastRadius"] }
    ]);
}
