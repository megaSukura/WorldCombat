/** Drench duration and coverage trade against cooldown; CombatTypes owns the temporary type change. */
namespace PokemonSkills {
    actionParameters.define("soak", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.body("height").minus(1.4).times(1.4).as("体型"))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2).as("等级"))
                .clamp(4, 12).round(1),
            "浇淋距离", { unit: "格", description: "水柱能浇到多远；个头越高、等级越高浇得越远。它也是本招实际射程的来源。" }),
        hold: seconds(
            F.base(200, "基础")
                .plus(F.level().times(3).as("等级"))
                .plus(F.stat("specialAttack").div(2.5).as("特攻"))
                .times(F.when(F.pref("flood", text("worldcombat.skill.soak.preference.flood")), F.const(0.75), F.const(1)).as("漫流摊薄"))
                .clamp(120, 900).round(),
            "浸透时长", "对手被冲成水属性多久；等级与特攻越高水越难干，漫流摊薄后每只都更短。"),
        splash: formula(
            F.base(1.6, "基础").plus(F.body("width").minus(0.9).times(1.1).as("体型")).clamp(1.2, 3.4).round(1),
            "漫流半径", { unit: "格", description: "水花铺开的半径，也是漫流档的判定圈；体型越宽越广。" }),
        streaks: formula(
            F.base(10, "基础").plus(F.stat("specialAttack").div(6).as("特攻")).clamp(10, 40).round(),
            "水柱条数", { unit: "道", description: "从施法者沿视线冲到对手身上的水流条数；特攻越高越粗壮，画面里的水流也按它画出。" }),
        ripples: formula(
            F.base(6, "基础").plus(F.stat("speed").div(28).as("速度")).clamp(6, 18).round(),
            "水花圈数", { unit: "圈", description: "落地后一圈圈荡开的水花数量；速度越快越密。" }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 4).as("速度")).clamp(5, 13).round(),
            "起手", "把水聚起来所需时间；速度越快起得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(50).clamp(-1, 2).as("特防")).clamp(4, 11).round(),
            "收势", "浇完后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(88, "基础").minus(F.stat("speed").times(0.3).as("速度"))
                .plus(F.when(F.pref("flood", text("worldcombat.skill.soak.preference.flood")), F.const(18), F.const(-8)).as("漫流代价"))
                .clamp(40, 130).round(),
            "再浇冷却", "再浇一次需要多久；速度快的个体更快恢复，漫流更费力。", { base: 88 })
    });

    stages("soak", [{ level: 40, values: { recharge: 78 } }, { level: 55, values: { recharge: 66 } }]);

    describe("soak", [
        { key: "description.0", values: ["hold"] },
        { key: "description.3", values: [] },
        { key: "description.1", values: ["reach","tempo","aftercast"] },
        { key: "description.2", values: ["splash"] },
        { key: "flood.on", values: ["splash","recharge"], when: function (context) { return read(context.detail.values, ["flood"]) === true; } },
        { key: "flood.off", values: ["hold"], when: function (context) { return read(context.detail.values, ["flood"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
