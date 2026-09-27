namespace PokemonSkills {
    actionParameters.define("aerialace", {
        returnPower: {value:60,label:"回刀威力",unit:"威力",
            description:"回身反斩的总威力，随物攻与敏捷变化。每个目标在一次回刀中只受击一次。",
            evaluate:scope=>scope.read<number>("aerialace/slash")*scope.read<number>("aerialace/cuts")},
        slash: formula(
            F.base(30).plus(F.stat("attack").minus(60).times(0.1))
                .times(F.when(F.pref("skim"), F.const(0.82), F.const(1.16)))
                .clamp(18, 58).round(1),
            "基础刃力", {
                unit: "威力",visible:false,
                description: "反斩的刃力；物攻越高越锋利。低掠让刃路更宽而力量更轻。"
            }),
        cuts: formula(
            F.base(2).plus(F.stat("speed").minus(60).times(0.012)).clamp(2, 3).floor(),
            "敏捷倍率", {
                unit: "倍",visible:false,
                description: "敏捷对回刀总威力的倍率。"
            }),
        pursuit: formula(
            F.base(5.2).plus(F.stat("speed").minus(60).times(0.035)).plus(F.level().minus(30).times(0.03))
                .times(F.when(F.pref("skim"), F.const(0.85), F.const(1)))
                .clamp(3.6, 8.4).round(1),
            "掠袭距离", {
                unit: "格",
                description: "侧掠和短回身合计可走的距离。速度与等级越高，换位余地越大。"
            }),
        dashSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.8, 1.4).round(2),
            "掠袭速度", {
                unit: "格/刻",
                description: "每刻掠步的速度；越快越早到达折点并回刀。"
            }),
        laneWidth: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12))
                .times(F.when(F.pref("skim"), F.const(1.4), F.const(0.85)))
                .clamp(0.4, 0.95).round(2),
            "刀路宽度", {
                unit: "格",
                description: "回刀的展开幅度；身板较大时更宽。低掠以较轻威力换取更宽的刀路。"
            })
    });

    defineDamage("aerialace", "returnPower", {}, { contact: true, slice: true });

    stages("aerialace", [
        { level: 34, values: { slash: 36, cuts: 3 } },
        { level: 50, values: { slash: 46, pursuit: 7.2 } }
    ]);

    describe("aerialace", [
        { key: "description.0", values: ["returnPower"] },
        { key: "description.1", values: ["pursuit","dashSpeed","laneWidth"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
    ]);
}
