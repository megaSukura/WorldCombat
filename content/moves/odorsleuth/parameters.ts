/** Identification window, finite observation memory and original individual scaling. */
namespace PokemonSkills {
    export const odorsleuthId = "odorsleuth";
    export const odorsleuthScene = "world_combat:move_odorsleuth";
    export const odorsleuthMarkEffect = "world_combat:odorsleuth_mark";
    export const odorsleuthRecordEffect = "world_combat:odorsleuth_record";
    export const odorsleuthStatus = "odorsleuth";
    export const odorsleuthPickText = "world_combat.move.odorsleuth.text.pick";
    export const odorsleuthFadeText = "world_combat.move.odorsleuth.text.fade";
    export const odorsleuthBlockedText = "world_combat.move.odorsleuth.text.blocked";
    export const odorsleuthEmptyText = "world_combat.move.odorsleuth.text.empty";

    actionParameters.define(odorsleuthId, {
        window: seconds(
            F.base(180).plus(F.level().times(2.5)).plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.7), F.const(0.8)))
                .clamp(120, 480).round(0),
            "追踪窗口", "气味咬住对手多久：等级与亲密度延长它，敏锐明显更长；窗口里一般/格斗打得上幽灵。"),
        reveal: seconds(
            F.base(20).plus(F.level().times(.6))
                .times(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.3), F.const(1)))
                .clamp(20, 80).round(0),
            "位置记忆", "失视后记住最后已见位置的基础时长；等级与敏锐增加记忆，含经验加成后最多5秒。"),
        drag: percent(
            F.base(0.2).plus(F.level().times(0.005)).clamp(0.2, 0.5).round(3),
            "记忆经验加成", "等级带来的位置记忆时长加成；此参数作用于追踪者记忆。"),
        strips: formula(
            F.base(3).plus(F.level().times(0.05)).clamp(1, 6).round(0),
            "闪避剥离", {
                unit: " 级",
                description: "一次剥掉目标几级正闪避；实际剥离量受目标现有闪避封顶，窗口结束仅撤本次贡献。"
            }),
        motes: formula(
            F.base(14).plus(F.stat("attack").times(0.06))
                .times(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.15), F.const(1)))
                .clamp(10, 36).round(0),
            "气味点数", {
                unit: " 点",
                description: "气味团的粒子数量；物攻越高越密，画面里的气味点与它一致。"
            }),
        reach: formula(
            F.base(6).plus(F.body("height").times(0.7))
                .plus(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.5), F.const(0)))
                .clamp(4, 12).round(1),
            "嗅闻距离", {
                unit: " 格",
                description: "能闻到对手的距离；身板越高闻得越远，敏锐再远 1.5 格，也是玩家瞄准能接受的范围。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(4), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "认真闻一遍需要多久；速度越快越短，敏锐多花几刻。"),
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.1)).clamp(4, 9).round(0),
            "收招", "闻到之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(82).minus(F.level().times(0.25))
                .plus(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(20), F.const(-8)))
                .clamp(45, 130).round(0),
            "冷却", "两次气味侦测之间的等待；等级越高越熟练，敏锐更费力。PP 40。")
    });

    describe(odorsleuthId, [
        { key: "description.0", values: ["window","drag"] },
        { key: "description.1", values: ["reveal"] },
        { key: "keen.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["keen"]) === true; } },
        { key: "keen.off", values: [], when: function (context) { return read(context.detail.values, ["keen"]) !== true; } },
        { key: "description.2", values: ["strips","reach","tempo","aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
