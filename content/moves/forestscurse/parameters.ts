/** 森林诅咒：给目标追加草属性；根须、树冠与解除时的落叶承载诅咒表现。 个体差异、配置和现场事实由以下公式定义。 */

namespace PokemonSkills {
    actionParameters.define("forestscurse", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.body("height").minus(1.4).times(1.2).as("体型"))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.8).as("等级"))
                .clamp(4, 12).round(1),
            "种咒距离", { unit: "格", description: "诅咒能落到多远；个头越高、等级越高落得越远。它也是本招实际射程的来源。" }),
        hold: seconds(
            F.base(220, "基础")
                .plus(F.level().times(3.4).as("等级"))
                .plus(F.stat("specialAttack").times(0.8).as("特攻"))
                .times(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(1.7), F.const(0.6)).as("扎根深浅"))
                .clamp(100, 1400).round(),
            "诅咒时长", "被追加的草属性维持多久；等级与特攻越高根扎得越深，深根档明显更长。"),
        roots: formula(
            F.base(10, "基础").plus(F.stat("specialAttack").div(6).as("特攻")).clamp(8, 36).round(),
            "根须数", { unit: "条", description: "从地面钻出、缠住目标的根须数量；特攻越高越多，画面里的根须也按它画出。" }),
        leaves: formula(
            F.base(14, "基础").plus(F.stat("speed").div(4).as("速度")).clamp(12, 40).round(),
            "落叶数", { unit: "片", description: "从头顶罩下的叶片数量；速度越快越密。" }),
        grove: formula(
            F.base(1.6, "基础").plus(F.body("width").minus(0.9).times(1).as("体型"))
                .times(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(1.35), F.const(0.8)).as("根须范围"))
                .clamp(1.2, 3.2).round(1),
            "根须半径", { unit: "格", description: "根须与树冠的表现半径；体型越宽越广，深根更大。" }),
        tempo: seconds(
            F.base(10, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 4).as("速度"))
                .plus(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(3), F.const(0)).as("深根起手"))
                .clamp(5, 14).round(),
            "种咒起手", "把诅咒画出来所需时间；速度越快起得越快，深根更慢。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(50).clamp(-1, 2).as("特防")).clamp(4, 11).round(),
            "收势", "种完后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(96, "基础").minus(F.stat("speed").times(0.28).as("速度"))
                .plus(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(20), F.const(-10)).as("深根代价"))
                .clamp(44, 140).round(),
            "再种冷却", "再种一次诅咒需要多久；速度快的个体更快恢复，深根更费力。")
    });

    stages("forestscurse", [{ level: 40, values: { cooldown: 86 } }, { level: 55, values: { cooldown: 74 } }]);

    describe("forestscurse", [
        { key: "description.0", values: ["hold"] },
        { key: "description.1", values: ["reach", "tempo", "aftercast"] },
        { key: "rooted.on", values: ["hold", "recharge"], when: function (context) { return read(context.detail.values, ["rooted"]) === true; } },
        { key: "rooted.off", values: [], when: function (context) { return read(context.detail.values, ["rooted"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
