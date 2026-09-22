/**
 * 蛛网 / spiderweb — 参数与数值来源。
 *
 * 原生事实：Bug／变化／威力 —／命中必中／PP 10／单体；命中即让目标 trapped（无法逃走、无法换人）。
 * 原生介绍「将黏糊糊的细丝一层一层缠住对手，使其不能从战斗中逃走。」学习者 6，稀少。
 *
 * 世界化：把「一层一层缠住」落成**吐一团会飞的黏丝，命中后把目标裹成茧**——茧越缠越厚：
 *   同一目标再中一次就多一层（MobEffect 增幅等级记层数），时长更久、导航速度更慢，三层以上完全动不了。
 *   茧是缠在目标身上的，术者可以走开；代价是**怕火**：任何火属性伤害、或目标身上着了火，都会立刻把丝烧开、
 *   把层数一次烧光。它是本族唯一**缠在目标身上、离开术者也成立**的一招。
 *
 * 与同族分开：挡路在目标背后立实墙；黑色目光靠术者站在原地维持；蛛网把目标自己裹起来，术者不必留下，火能烧开。
 * 与吐丝分开：吐丝主要掉速度、会在地上留网；蛛网是纯裹身、分层、可燃，命中后没有地面残留。
 *
 * 数据分散（每项读不同精灵数据，落到不同参数）：
 *   wrapTicks   第一层时长：等级与防御决定丝在多久后松脱；厚茧再拉长。
 *   layerBonus  每多一层的时长增量：物攻决定丝吐得多厚。
 *   layerCap    层数上限：体重 ≥250 的个体多缠一层；厚茧再加一层。
 *   slow        每层减掉多少导航速度：特攻换算，决定几层能完全钉住。
 *   globSpeed   黏丝的飞行速度：速度决定目标更难走开；厚茧的丝更沉更慢。
 *   globRadius  黏丝的判定半径：身高决定判定多宽。
 *   reach       吐丝距离：速度决定够得多远。
 *   threads     丝道数：特攻换算，驱动画面里丝束的密度。
 *   splat       落空溅开的半径：体型越宽溅得越大。
 *   tempo／aftercast／recharge：速度、身形与等级定节奏。
 *
 * 配置 `thick`（厚茧）双向取舍（默认关）：
 *   开（厚茧）：层数上限 +1、每层时长 +25%%、每层减速更狠、丝道更密；代价是黏丝飞行更慢、起手 +3 刻、冷却 +12 刻。
 *   关（薄网）：丝飞得更快、起手与冷却更短；代价是层数更少、每层更短。
 */
namespace PokemonSkills {
    actionParameters.define("spiderweb", {
        /** 第一层时长：80 + 等级 ×1.5 + 防御 ×0.4；厚茧 ×1.25；夹 70..240。 */
        wrapTicks: seconds(
            F.base(80).plus(F.level().times(1.5)).plus(F.stat("defence").times(0.4))
                .times(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(1.25), F.const(1.0)))
                .clamp(70, 240).round(0),
            "裹身时长", "第一层丝在目标身上留多久；等级与防御越高留得越久，厚茧再拉长。到期丝自己松脱。"),
        /** 每层时长增量：40 + 物攻 ×0.3；夹 30..90。 */
        layerBonus: seconds(
            F.base(40).plus(F.stat("attack").times(0.3)).clamp(30, 90).round(0),
            "每层增量", "每多缠一层，裹身时长再增加多少；物攻越高吐的丝越厚，缠得越久。"),
        /** 层数上限：3 + 体重 ≥250 加 1；厚茧再 +1；夹 3..5。 */
        layerCap: formula(
            F.base(3).plus(F.when(F.body("weight").gte(250), F.const(1), F.const(0)))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(1), F.const(0)))
                .clamp(3, 5).round(0),
            "层数上限", {
                unit: "层",
                description: "同一目标最多能被缠几层；体重 250 以上的个体多一层，厚茧再加一层。层数越高越难动、缠得越久。"
            }),
        /** 每层减速：30%% + 特攻 ×0.05%%；厚茧 ×1.2；夹 26%%..44%%。 */
        slow: percent(
            F.base(0.30).plus(F.stat("specialAttack").times(0.0005))
                .times(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(1.2), F.const(1.0)))
                .clamp(0.26, 0.44),
            "每层减速", "每多一层，目标的导航速度被多减掉多少；特攻越高减得越狠。三层以上通常就完全动不了。"),
        /** 黏丝速度：0.9 + (速度 −60) ×0.005；厚茧 ×0.85；夹 0.7..1.5。 */
        globSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.005))
                .times(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(0.85), F.const(1.0)))
                .clamp(0.7, 1.5).round(2),
            "黏丝速度", {
                unit: "格/刻",
                description: "黏丝飞行的速度；速度快的个体更早命中，厚茧的丝更沉更慢，目标更容易走开。"
            }),
        /** 判定半径：0.3 + (身高 −1.4) ×0.08；夹 0.22..0.6。 */
        globRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.22, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "黏丝的横向判定半径；身量越高判定越宽。"
            }),
        /** 吐丝距离：7 + (速度 −60) ×0.02；夹 6..10。 */
        reach: formula(
            F.base(7).plus(F.stat("speed").minus(60).times(0.02)).clamp(6, 10).round(1),
            "吐丝距离", {
                unit: "格",
                description: "黏丝能打到的最远点；速度越快够得越远。它也是本招的实际射程。"
            }),
        /** 丝道数：12 + 特攻 ×0.2；厚茧 ×1.2；夹 10..30。 */
        threads: formula(
            F.base(12).plus(F.stat("specialAttack").times(0.2))
                .times(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(1.2), F.const(1.0)))
                .clamp(10, 30).round(0),
            "丝道数", {
                unit: "道",
                description: "裹住目标的丝束道数；特攻越高越密，也决定画面里丝网的数量。"
            }),
        /** 落空溅开半径：0.8 + 体型宽度 ×0.5；夹 0.6..1.6。 */
        splat: formula(
            F.base(0.8).plus(F.body("width").times(0.5)).clamp(0.6, 1.6).round(2),
            "落空溅开", {
                unit: "格",
                description: "黏丝落空时在地上溅开的半径；体型越宽溅得越大，是表现里那团丝痕的参考尺寸。"
            }),
        /** 起手：10 − (速度 −60) ×0.03 + 厚茧 3；夹 7..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(3), F.const(0)))
                .clamp(7, 16).round(0),
            "起手", "把丝在口边聚成一团需要多久；速度越快越短，厚茧要多吐一会儿。"),
        /** 收招：7 + (身高 −1.4) ×0.8；夹 5..12。 */
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.8)).clamp(5, 12).round(0),
            "收招", "吐丝之后的收势；身量越大收得越慢。"),
        /** 冷却：90 − (等级 −30) ×0.5 + 厚茧 12；夹 60..120。 */
        recharge: seconds(
            F.base(90).minus(F.level().minus(30).max(0).times(0.5))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.spiderweb.preference.thick")), F.const(12), F.const(0)))
                .clamp(60, 120).round(0),
            "冷却", "两次吐丝之间的等待；等级越高越熟练，厚茧更费。PP 10 的代价。")
    });

    stages("spiderweb", [
        { level: 35, values: { wrapTicks: 130, recharge: 78 } }
    ]);

    describe("spiderweb", [
        { key: "description.0", values: ["wrapTicks", "layerBonus", "layerCap"] },
        { key: "description.1", values: ["slow", "threads"] },
        { key: "description.2", values: ["globSpeed", "globRadius", "reach", "splat"] },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wrapTicks", "tier.0.recharge"] }
    ]);
}
