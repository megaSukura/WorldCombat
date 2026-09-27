/** Per-move range, duration and timing; the same duration owns both icon and Attack loss. */
namespace PokemonSkills {
    export const growlId = "growl";
    export const growlEffect = "world_combat:growl_hush";
    export const growlScene = "world_combat:move_growl";
    export const growlSpot = "world_combat:status/charmed";

    actionParameters.define(growlId, {
        drop: formula(
            F.base(1).plus(F.when(F.level().gte(45), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "攻击下降", {
                unit: " 级",
                description: "听见叫声者损失的攻击等级；等级达到 45 时从 1 级升到 2 级。"
            }),
        soundRadius: formula(
            F.base(3.5).plus(F.body("width").times(1.2))
                .times(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(1.5), F.const(1)))
                .clamp(2.5, 7).round(2),
            "叫声半径", {
                unit: " 格",
                description: "叫声能传到多远；体型越宽摊得越开，拖长音明显更远。"
            }),
        hushTicks: seconds(
            F.base(90).plus(F.individual("friendship").times(0.8))
                .times(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(1.4), F.const(1)))
                .clamp(60, 260).round(0),
            "分神时长", "被叫到的人分神多久；施法者越亲近留得越久，拖长音更长。"),
        notes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).max(0).times(0.3)).clamp(12, 40).round(0),
            "音符量", {
                unit: " 个",
                description: "一次叫声吐出的音符数量；心神越盛的施法者越多，画面里的音符也按它画出。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).max(0).times(0.03))
                .plus(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(4), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "把气吸满、叫出声需要多久；速度越快越早，拖长音要多花几刻。"),
        recharge: seconds(
            F.base(100).plus(F.level().minus(30).max(0).times(0.6))
                .plus(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(40), F.const(0)))
                .clamp(80, 180).round(0),
            "冷却", "两次叫声之间的等待；拖长音需要更久才能再次使用。")
    });

    describe(growlId, [
        { key: "description.0", values: ["drop","hushTicks"] },
        { key: "description.1", values: ["soundRadius"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "howl.off", values: [], when: function (context) { return read(context.detail.values, ["howl"]) !== true; } },
        { key: "howl.on", values: [], when: function (context) { return read(context.detail.values, ["howl"]) === true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
