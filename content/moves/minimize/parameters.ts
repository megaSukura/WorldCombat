/** Native body scale plus shared evasion; larger contact attackers compare against the original body. */
namespace PokemonSkills {
    actionParameters.define("minimize", {
        /** 闪避等级：大胆 3 级／谨慎 2 级。 */
        evade: formula(
            F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(3), F.const(2)).clamp(2, 3).round(0),
            "闪避等级", {
                unit: " 级",
                description: "缩小之后抬高的闪避等级；大胆 3 级，谨慎 2 级。"
            }),
        /** 缩小窗口：速度与等级决定缩多久，大胆更短。 */
        window: seconds(
            F.base(160).plus(F.stat("speed").times(0.8)).plus(F.level().times(2.5))
                .times(F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(0.85), F.const(1)))
                .clamp(100, 400).round(0),
            "缩小窗口", "身体缩着多久；速度与等级越高越久，大胆缩小更短。窗口走完或被清除时，闪避等级收回。"),
        /** 收缩尺度：越高大的身体缩得越明显，也是表现里壳与地环的收拢倍率。 */
        small: formula(
            F.base(0.62).minus(F.body("height").times(0.05)).clamp(0.45, 0.80).round(2),
            "收缩尺度", {
                format: function (value: number) { return String(Math.round(value * 100) / 100) + "×"; },
                description: "缩到原来的多大；越高大的身体缩得越明显，画面里的壳与地环按它收拢。"
            }),
        /** 踩踏加成：大体型打中缩小者时的伤害倍率。 */
        trample: formula(
            F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(1.75), F.const(1.5)).clamp(1.4, 1.8).round(2),
            "踩踏加成", {
                format: function (value: number) { return String(Math.round(value * 100) / 100) + "×"; },
                description: "体积 ≥ 1.3 倍的身体打中缩小者时的伤害倍率；大胆更高，这是它换来的破绽。"
            }),
        /** 缩身尘点：速度越高越多。 */
        motes: formula(
            F.base(16).plus(F.stat("speed").times(0.25)).clamp(16, 70).round(0),
            "缩身尘点", {
                unit: " 点",
                description: "一次缩身带起的尘点数量；速度越高越多，粒子按它发射。"
            }),
        /** 收缩拍数：等级越高多收几拍。 */
        pulses: formula(
            F.base(2).plus(F.level().div(26)).clamp(2, 4).round(0),
            "收缩拍数", {
                unit: " 拍",
                description: "身体收几拍；等级越高越多，画面按它一下下收拢。"
            }),
        /** 起手：速度决定缩多快，大胆更慢。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(3), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "缩成一团需要多久；速度越快越短，大胆缩小更慢。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(0.8)).clamp(4, 9).round(0),
            "收招", "缩回来之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，大胆更短。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("bold", text("worldcombat.skill.minimize.preference.bold")), F.const(0.9), F.const(1.05)))
                .clamp(70, 150).round(0),
            "冷却", "两次缩小之间的等待；等级越高越短，大胆更短。PP 10 的代价。")
    });

    stages("minimize", [
        { level: 36, values: { window: 280, wait: 100 } },
        { level: 56, values: { window: 340, wait: 88 } }
    ]);

    describe("minimize", [
        { key: "description.0", values: ["evade", "small"] },
        { key: "bold.on", values: [], when: function (context) { return read(context.detail.values, ["bold"]) === true; } },
        { key: "bold.off", values: [], when: function (context) { return read(context.detail.values, ["bold"]) !== true; } },
        { key: "description.1", values: ["window","trample"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
