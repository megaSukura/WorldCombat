namespace PokemonSkills {
    actionParameters.define("swordsdance", {
        rise: formula(F.const(2), "磨刃增益", {
            unit: " 级",
            description: "这支舞把物攻抬高多少级；原生「大幅提高攻击」的对位。"
        }),
        dance: seconds(F.base(14).minus(F.stat("speed").minus(60).times(.04))
            .plus(F.when(F.pref("press"),F.const(4),F.const(0))).clamp(8,22).round(0),
            "剑舞时长", "合剑之前尚未获得本次强化；速度越高越快，进逼会增加舞步时间。"),
        step: formula(
            F.base(0.45).plus(F.stat("speed").minus(60).times(0.004)).plus(F.body("height").times(0.12)).clamp(0.3, 1.1).round(2),
            "合计进逼距离", {
                unit: " 格",
                description: "「进逼」下一整支剑舞的合计位移，随舞步缓慢前压；速度与身板越大跨得越远。"
            }),
        arc: formula(
            F.base(1.0).plus(F.body("height").times(0.4)).clamp(0.9, 2.0).round(2),
            "刃风半径", {
                unit: " 格", visible:false,
                description: "剑形绕身体移动的半径。"
            }),
        hone: seconds(
            F.base(240).plus(F.level().times(4)).plus(F.stat("attack").times(0.6)).clamp(200, 600).round(0),
            "磨刃窗口", "「磨刃」在身上的时长；等级与物攻越高撑得越久。窗口走完，这段舞抬起的物攻等级一并收回。"),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 10).round(0),
            "起势", "压低身形、拔刀起势需要多久；速度越高越快。"),
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.5)).clamp(6, 10).round(0),
            "收招", "定锋收势；碰撞箱越高大收得越慢。"),
        wait: seconds(
            F.base(110).minus(F.level().times(0.6))
                .plus(F.when(F.pref("press", text("worldcombat.skill.swordsdance.preference.press")), F.const(10), F.const(0)))
                .clamp(70, 120).round(0),
            "冷却", "两次剑舞之间的等待；等级越高越短，进逼更长。PP 20 的代价。")
    });

    stages("swordsdance", [
        { level: 30, values: { wait: 100, hone: 300 } },
        { level: 50, values: { wait: 84, hone: 380 } }
    ]);

    describe("swordsdance", [
        { key: "description.0", values: ["rise","dance"] },
        { key: "description.1", values: ["hone"] },
        { key: "description.stack", values: [] },
        { key: "description.hold", values: [] },
        { key: "press.on", values: ["step"], when: function (context) { return read(context.detail.values, ["press"]) === true; } },
        { key: "press.off", values: [], when: function (context) { return read(context.detail.values, ["press"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hone"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.hone"] }
    ]);
}
