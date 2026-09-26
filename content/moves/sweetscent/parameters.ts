/** Finite scent and cloud budgets; exposure is a temporary evasion loss, not a damage multiplier. */
namespace PokemonSkills {
    export const sweetscentId = "sweetscent";
    export const sweetscentEffect = "world_combat:sweet_scent";
    export const sweetscentScene = "world_combat:move_sweetscent";
    export const sweetscentSpot = "world_combat:status/scented";
    export const sweetscentField = "world_combat:field/sweetscent";

    actionParameters.define(sweetscentId, {
        reach: formula(F.base(7).plus(F.level().minus(30).times(0.06)).clamp(5, 11).round(1), "喷香距离", {
            unit: " 格",
            description: "香气能送到的最远点；等级越高送得越远。"
        }),
        cloudRadius: formula(
            F.base(2.2).plus(F.body("weight").minus(60).times(0.01).clamp(-0.4, 1.0))
                .times(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(0.8), F.const(1.2)))
                .clamp(1.4, 3.6).round(2),
            "香气半径", {
                unit: " 格",
                description: "甜云在地面上的覆盖半径；体重越大摊得越开，馥郁取向收得更紧。"
            }),
        cloudTicks: seconds(
            F.base(140).plus(F.individual("friendship").times(0.6))
                .times(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(1.35), F.const(0.85)))
                .clamp(100, 340).round(0),
            "甜云时长", "一片甜云在世界上停留多久；馥郁留得更久。"),
        scentTicks: seconds(
            F.base(120).plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-20, 120))
                .times(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(1.25), F.const(1)))
                .clamp(100, 260).round(0),
            "留香时长", "离开甜云后香气还挂在身上多久；特攻越高留得越久。"),
        exposure: formula(
            F.stat("specialAttack").minus(50).div(45).floor().plus(1)
                .plus(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(1), F.const(0)))
                .clamp(1, 3),
            "浸透等级", {
                unit: " 级",
                description: "本次最多降低几级闪避，走原生能力变化政策；同时保留实际移动留下的香点。"
            }),
        maxTargets: formula(F.base(3).plus(F.level().minus(30).max(0).times(0.05)).clamp(3, 6).round(0), "留香人数", {
            unit: " 人",
            description: "每次扫描最多让几个人留香；等级越高罩得越多。"
        }),
        tempo: seconds(F.base(10).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(8, 14), "起手",
            "吐出香气需要多久；速度越快越早。"),
        recharge: seconds(F.base(80).plus(F.level().minus(30).max(0).times(0.5)).clamp(70, 110), "冷却",
            "两次喷香之间的等待；等级越高越熟练。")
    });
    describe(sweetscentId, [
        { key: "description.0", values: ["exposure", "scentTicks"] },
        { key: "description.1", values: ["cloudRadius", "cloudTicks", "maxTargets"] },
        { key: "description.additional", values: [] },
        { key: "description.2", values: ["reach", "tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
