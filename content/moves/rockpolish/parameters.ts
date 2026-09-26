/** Temporary speed and native body slipperiness; gameplay numbers retain individual formulas. */
namespace PokemonSkills {
    actionParameters.define("rockpolish", {
        slipperiness: formula(F.base(0.82).plus(F.stat("speed").times(0.0002))
            .plus(F.when(F.pref("grit"), F.const(0.03), F.const(0))).clamp(0.82, 0.92),
            "滑行系数", { description: "身体在地面上的滑行系数；速度越高、精磨时越明显。地面本来更滑时保留地面的原生系数。" }),
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
                description: "打磨时身体周围短暂划痕的表现半径；不改变地面。"
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
        { key: "description.1", values: ["shine", "slipperiness"] },
        { key: "description.2", values: ["aftercast", "wait"] },
        { key: "description.additional", values: [] },
        { key: "grit.on", values: [], when: function (context) { return read(context.detail.values, ["grit"]) === 1; } },
        { key: "grit.off", values: [], when: function (context) { return read(context.detail.values, ["grit"]) !== 1; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shine", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shine", "tier.1.wait"] }
    ]);
}
