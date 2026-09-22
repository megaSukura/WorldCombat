/**
 * 自爆 / selfdestruct 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 200／命中 100／PP 5／target allAdjacent（自己周围所有宝可梦）／
 *   `selfdestruct: "always"`——**无论有没有打中，使用者都用完即陷入濒死**；无次要效果。
 *
 * 翻译：把「引发爆炸」翻成**身体当场炸成一颗紧凑的白热球**：起手先把身体急涨、裂开发光的缝，
 *   提交后从原地爆开，圈里所有人各挨一记、被向外掀开并抛起一点，施法者自己随之倒下。
 *   与同族分开：
 *     自爆     —— 紧凑、出手快、范围小，用一条命换一圈重击，起手短到对手常来不及走开；
 *     大爆炸   —— 更大更慢、威力与掀飞都更强，炸完留下焦黑弹坑；
 *     搏命     —— 只打一个贴身的对手、伤害等于自己当前生命，是单向的一换一；
 *     临别礼物 —— 不打伤害，把命换成削弱与一团会继续施压的遗念。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast        爆心威力 200 + 物攻偏移 + 体重偏移（身体越重、力量越大炸得越狠；与威力 200 同源）。
 *   blastRadius  爆心半径 4.0 格 + 碰撞箱高度偏移 + 体重偏移（个子高、身体沉炸得越开）。
 *   knock        向外掀开 0.9 格 + 体重偏移 + 物攻偏移。
 *   lift         上抛初速 0.35 格/刻 + 体重偏移（越沉把自己和别人掀得越高，但远小于地震）。
 *   debris       碎屑量 26 + 体重 ×0.2 + 物攻 ×0.2（同时驱动画面密度）。
 *   scorchTicks  焦痕停留 60 刻 + 等级偏移。
 *   scorchCells  焦痕块数 10 + 物攻 ×0.1（同时驱动画面密度）。
 *   tempo／recharge  速度与等级决定起手与冷却。
 *
 * 配置 `focus`（聚爆式）：开启＝威力 ×1.28、半径 ×0.74、起手 −2 刻，但冷却 +6——贴着一个重点目标狠炸；
 *   关闭（扩散式）＝威力 ×0.88、半径 ×1.18、起手 +2 刻、冷却 −6——一次罩住一圈人，更快。
 *   两向各有适用局面。无论哪个方向，使用者都会倒下。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原始类别 Physical、Normal 属性；打不到幽灵由属性表拦住）。
 */
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
            "焦痕停留", "地面被炸焦的痕迹停留多久；到期原方块回来，等级越高焦得越久。"),
        /** 焦痕块数：10 + 物攻 ×0.1；夹 8..26。同时驱动画面密度。 */
        scorchCells: formula(
            F.base(10).plus(F.stat("attack").times(0.1)).clamp(8, 26).round(0),
            "焦痕块数", {
                unit: "块",
                description: "地面被炸焦的块数；随物攻增长，也决定画面的密度。"
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
        { key: "description.0", values: ["blast"] },
        { key: "description.1", values: ["blastRadius"] },
        { key: "description.2", values: ["knock", "lift"] },
        { key: "description.3", values: ["debris", "scorchTicks", "scorchCells"] },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.blastRadius", "tier.0.debris"] }
    ]);
}
