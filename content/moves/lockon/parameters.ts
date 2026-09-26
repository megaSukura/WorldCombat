/** Lock and control clocks remain independent; each caster spends only its own lock. */
namespace PokemonSkills {
    export const lockonId = "lockon";
    export const lockonScene = "world_combat:move_lockon";
    export const lockonFocusEffect = "world_combat:lockon_focus";
    export const lockonTrackEffect = "world_combat:lockon_track";
    export const lockonClampEffect = "world_combat:lockon_clamp";
    export const lockonMark = "world_combat:lockon_mark";
    export const lockonStatus = "lockon";
    export const lockonReadyText = "world_combat.move.lockon.text.ready";
    export const lockonStrikeText = "world_combat.move.lockon.text.strike";
    export const lockonFadeText = "world_combat.move.lockon.text.fade";

    actionParameters.define(lockonId, {
        lockTicks: seconds(
            F.base(140).plus(F.level().times(2)).plus(F.stat("attack").times(0.3))
                .times(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(1.5), F.const(0.8)))
                .clamp(90, 360).round(0),
            "锁定期", "准星咬住对手多久；等级与物攻延长它，钉死明显更长；兑现或走完即散。"),
        pinTicks: seconds(
            F.base(60).plus(F.level().times(1.2))
                .times(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(1.4), F.const(0.8)))
                .clamp(40, 200).round(0),
            "咬住时长", "目标被拖住多久；等级越高越久，钉死更长。"),
        motes: formula(
            F.base(14).plus(F.stat("attack").times(0.1))
                .times(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(1.15), F.const(1)))
                .clamp(10, 36).round(0),
            "准星量", {
                unit: " 点",
                description: "锁定线与目标准星的粒子数量；物攻越高越密，画面里的准星光点与它一致。"
            }),
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "把准星咬上去需要多久；速度越快越短，钉死多花两刻。"),
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.1)).clamp(3, 8).round(0),
            "收招", "锁上之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(88).minus(F.level().times(0.25))
                .plus(F.when(F.pref("hold", text("worldcombat.skill.lockon.preference.hold")), F.const(20), F.const(-8)))
                .clamp(55, 140).round(0),
            "冷却", "两次锁定之间的等待；等级越高越熟练，钉死更费力。PP 5。"),
        reach: formula(
            F.base(6).plus(F.body("height").times(0.8)).clamp(4, 10).round(1),
            "锁定距离", {
                unit: " 格",
                description: "能咬住对手的距离；身板越高够得越远，也是玩家瞄准能接受的范围。"
            })
    });

    describe(lockonId, [
        { key: "description.0", values: ["lockTicks","pinTicks"] },
        { key: "description.1", values: [] },
        { key: "hold.on", values: ["tempo","recharge"], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "description.2", values: ["reach", "tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
