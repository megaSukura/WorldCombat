/** 点穴提供一项短时随机强化。稳按换取更高收益，快按方便给身边伙伴补足。 */
namespace PokemonSkills {
    actionParameters.define("acupressure", {
        /** 一轮只强化一项；快按一级，稳按保留原生的两级。 */
        press: formula(
            F.when(F.pref("steady", text("worldcombat.skill.acupressure.preference.steady")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "点穴等级", {
                unit: " 级",
                description: "这一按把随机点到的那项能力抬高多少级；稳按 2 级，快按 1 级。"
            }),
        /** 点穴距离：体型越大够得着越远。 */
        reach: formula(
            F.base(1.5).plus(F.body("width").times(0.6)).plus(F.body("height").times(0.3)).clamp(1.5, 4).round(2),
            "点穴距离", {
                unit: " 格",
                description: "按到穴道所需的距离，也是表现里点击范围；体型越大够得着越远。"
            }),
        /** 通畅窗口覆盖一轮短交战。 */
        window: seconds(
            F.base(120).plus(F.level().times(1.2)).clamp(120, 220).round(0),
            "通畅窗口", "这一项强化持续多久；通畅结束后才能接受下一次点穴。"),
        /** 手感光点：速度越高越多。 */
        motes: formula(
            F.base(18).plus(F.stat("speed").times(0.3)).clamp(18, 70).round(0),
            "手感光点", {
                unit: " 点",
                description: "一次点穴溅起的光点数量；速度越高越多，粒子按它发射。"
            }),
        /** 推拿拍数：等级越高多推几拍。 */
        beats: formula(
            F.base(2).plus(F.level().div(25)).clamp(2, 4).round(0),
            "推拿拍数", {
                unit: " 拍",
                description: "按下去之后推几拍；等级越高越多，画面按它一拍拍透进去。"
            }),
        /** 起手：速度决定落指多快，稳按更慢。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.acupressure.preference.steady")), F.const(5), F.const(0)))
                .clamp(4, 15).round(0),
            "起手", "落指需要多久；速度越快越短，稳按更慢。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "点完之后收回手的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，稳按更长。 */
        wait: seconds(
            F.base(200).minus(F.level().times(0.4))
                .times(F.when(F.pref("steady", text("worldcombat.skill.acupressure.preference.steady")), F.const(1.25), F.const(0.9)))
                .clamp(140, 250).round(0),
            "冷却", "两次点穴之间的等待；等级越高越短，稳按更长。")
    });

    stages("acupressure", [
        { level: 34, values: { window: 160, wait: 180 } },
        { level: 54, values: { window: 180, wait: 170 } }
    ]);

    describe("acupressure", [
        { key: "description.0", values: ["press"] },
        { key: "steady.on", values: [], when: function (context) { return read(context.detail.values, ["steady"]) === true; } },
        { key: "steady.off", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== true; } },
        { key: "description.1", values: ["reach", "window"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
