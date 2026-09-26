namespace PokemonSkills {
    export const naturepowerId = "naturepower";
    actionParameters.define(naturepowerId, {
        reach: formula(F.base(10).plus(F.stat("speed").minus(40).max(0).times(.05))
            .plus(F.when(F.pref("charged"), F.const(2), F.const(0))).clamp(9, 17).round(1),
            "借招距离", { unit: " 格", description: "同时受所借招式的实际射程限制。" }),
        windupTicks: seconds(F.base(10).minus(F.stat("speed").minus(40).max(0).times(.05))
            .plus(F.when(F.pref("charged"), F.const(6), F.const(0))).clamp(6, 20).round(0),
            "借力时长", "催发多准备片刻，使本次借招威力乘1.25；随后按所借招式的节奏释放。")
    });
    stages(naturepowerId, [{ level: 40, values: { cooldown: 26 } }, { level: 60, values: { cooldown: 22 } }]);
    describe(naturepowerId, [
        { key: "description.0", values: [] }, { key: "description.1", values: ["reach"] },
        { key: "stance.charged", values: ["windupTicks"], when: context => read(context.detail.values, ["charged"]) === true },
        { key: "stance.quick", values: [], when: context => read(context.detail.values, ["charged"]) !== true },
        { key: "timing", values: ["prepare", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] }, { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
