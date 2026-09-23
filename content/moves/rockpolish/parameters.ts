/**
 * 岩石打磨 / Rock Polish — 参数与数值来源。
 *
 * 原生事实：Rock、变化、威力 —、命中必中、PP 20、目标 self、boosts { spe: +2 }、flags snatch/metronome。
 *
 * 翻译：把「打磨自己的身体，减少空气阻力」翻成一件**要花时间做的活**——用地面当磨石，在自己身上一圈圈磨，
 *   火花与石粉往外溅，磨掉粗糙的那层；磨过之后身体泛光、空气再也挂不住你。它取原生「+2 速度、20 PP、
 *   纯自我强化」；放弃回合制里永久保留的等级 → 打磨出的光面会随时间失亮，速度等级随之一起收回（对手能拖过去）。
 *   本族里它最慢、最彻底：站着不动磨、地面上真的留下磨亮的一圈，也是唯一会在世上留痕的速度提升。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift        提速等级：粗磨 2 级（体重 ≥ 100kg 再 +1）／精磨固定 3 级；夹 2..3。越沉的身体越值得磨。
 *   shine       光面时长：基础 160 刻 + 体重（kg）×0.6，再乘磨料系数；夹 120..420。窗口走完速度等级收回。
 *   patchRadius 磨亮半径：基础 1.0 格 + 体重（kg）×0.004，再乘磨料系数；夹 0.9..2.6。体重决定地上磨开多大一圈。
 *   sparks      火花数量：基础 20 + 物攻×0.5；夹 20..80。压得越狠，磨出的火花越密（也是画面里的数量）。
 *   dust        石粉数量：基础 16 + 体重（kg）×0.12；夹 16..60。粉越重越多，落在地上拖出灰。
 *   tempo       起手：基础 14 刻 + 体重（kg）×0.012，再乘磨料系数；夹 8..26。越沉磨得越久。
 *   aftercast   收招：基础 6 刻 + 碰撞箱高度×1.3；夹 6..12。身板越高大收得越慢。
 *   wait        冷却：基础 90 刻 − 等级×0.4，再乘磨料系数；夹 50..115。PP 20 的代价。
 * 配置 grit（磨料）双向取舍：粗磨快、冷却短、地上留的圈小、光面短；精磨慢、冷却长、地圈更大、光面更久，
 *   且对轻身板也能磨到 3 级。两向各有局面（速战 vs 持久）。
 */
namespace PokemonSkills {
    actionParameters.define("rockpolish", {
        /** 提速等级：粗磨吃体重，精磨固定拉满。 */
        gift: formula(
            F.when(F.pref("grit", text("worldcombat.skill.rockpolish.preference.grit")),
                F.const(3),
                F.base(2).plus(F.when(F.body("weight").gte(1000), F.const(1), F.const(0)))
            ).clamp(2, 3).round(0),
            "提速等级", {
                unit: " 级",
                description: "磨光之后抬高的速度等级；粗磨对 100kg 以上的身体多给一级，精磨对任何身体都给满。"
            }),
        /** 光面时长：窗口走完速度等级收回。 */
        shine: seconds(
            F.base(160).plus(F.body("weight").div(10).times(0.6))
                .times(F.when(F.pref("grit", text("worldcombat.skill.rockpolish.preference.grit")), F.const(1.3), F.const(0.8)))
                .clamp(120, 420).round(0),
            "光面时长", "磨出的光面在身体上留多久；越沉越久，精磨再 ×1.3。光面失亮时这段打磨抬起的等级一起收回。"),
        /** 磨亮半径：地面上磨开的一圈。 */
        patchRadius: formula(
            F.base(1.0).plus(F.body("weight").div(10).times(0.004))
                .times(F.when(F.pref("grit", text("worldcombat.skill.rockpolish.preference.grit")), F.const(1.25), F.const(0.85)))
                .clamp(0.9, 2.6).round(2),
            "磨亮半径", {
                unit: " 格",
                description: "地面上被磨亮的那一圈半径；越沉磨得越开，精磨再 ×1.25。画面里的地环就是这个半径。"
            }),
        /** 火花数量：物攻越高越密。 */
        sparks: formula(
            F.base(20).plus(F.stat("attack").times(0.5)).clamp(20, 80).round(0),
            "火花数量", {
                unit: " 点",
                description: "打磨时溅出的火花数量；物攻越高压得越狠，粒子按它发射。"
            }),
        /** 石粉数量：越沉越多。 */
        dust: formula(
            F.base(16).plus(F.body("weight").div(10).times(0.12)).clamp(16, 60).round(0),
            "石粉数量", {
                unit: " 撮",
                description: "磨掉的石粉量；身体越沉掉得越多，落地拖出灰线。"
            }),
        /** 起手：越沉磨得越久。 */
        tempo: seconds(
            F.base(14).plus(F.body("weight").div(10).times(0.012))
                .times(F.when(F.pref("grit", text("worldcombat.skill.rockpolish.preference.grit")), F.const(1.35), F.const(0.72)))
                .clamp(8, 26).round(0),
            "起手", "把这层粗糙磨掉需要多久；越沉越久，精磨再 ×1.35（也更容易被打断）。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.3)).clamp(6, 12).round(0),
            "收招", "磨完站定、收回身形的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.4))
                .times(F.when(F.pref("grit", text("worldcombat.skill.rockpolish.preference.grit")), F.const(1.18), F.const(0.88)))
                .clamp(50, 115).round(0),
            "冷却", "两次打磨之间的等待；等级越高越短，精磨更长。PP 20 的代价。")
    });

    stages("rockpolish", [
        { level: 40, values: { shine: 200, wait: 80 } },
        { level: 55, values: { shine: 250, wait: 70 } }
    ]);

    describe("rockpolish", [
        { key: "description.0", values: ["gift", "tempo"] },
        { key: "description.1", values: ["shine", "patchRadius"] },
        { key: "description.2", values: ["aftercast", "wait"] },
        { key: "description.additional", values: [] },
        { key: "grit.on", values: [], when: function (context) { return read(context.detail.values, ["grit"]) === 1; } },
        { key: "grit.off", values: [], when: function (context) { return read(context.detail.values, ["grit"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shine", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shine", "tier.1.wait"] }
    ]);
}
