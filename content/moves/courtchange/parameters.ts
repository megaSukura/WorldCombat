/** Range, timing and presentation budgets for an explicit field ownership exchange. */
namespace PokemonSkills {
    export const courtChangeId = "courtchange";
    export const courtChangeScene = "world_combat:move_courtchange";
    export const courtChangeSwapText = "world_combat.move.courtchange.text.swap";
    export const courtChangeEmptyText = "world_combat.move.courtchange.text.empty";

    actionParameters.define(courtChangeId, {
        /** 换场半径：一次圈住多大一片领域。 */
        field: formula(
            F.base(4).plus(F.level().times(0.05)).plus(F.body("height").times(0.3))
                .times(F.when(F.pref("swift", text("worldcombat.skill.courtchange.preference.swift")), F.const(0.85), F.const(1.2)))
                .clamp(3.5, 8).round(2),
            "换场半径", {
                unit: " 格",
                description: "一次换场圈住多大一片领域；等级与体型越大圈得越广，速换式收窄、稳换式更宽。它也是指示圈与实际波及半径。"
            }),
        /** 施放距离：把法阵放到多远。 */
        reach: formula(
            F.base(6).plus(F.level().times(0.05)).clamp(5, 10).round(2),
            "施放距离", {
                unit: " 格",
                description: "能把换场法阵放到多远的地面；等级越高够得越远。它也是本招的实际射程。"
            }),
        /** 魔法光点：特攻越高越多。 */
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").times(0.1)).clamp(18, 60).round(0),
            "魔法光点", {
                unit: " 点",
                description: "一次换场迸出的念力光点数量；特攻越高越多，粒子按它发射。"
            }),
        /** 扫过圈数：等级越高多推几圈。 */
        waves: formula(
            F.base(2).plus(F.level().div(25)).clamp(2, 4).round(0),
            "扫过圈数", {
                unit: " 圈",
                description: "念力扫过战场推几圈；等级越高越多，画面按它一圈圈铺开。"
            }),
        /** 起手：速度决定念力多快成型，速换更快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("swift", text("worldcombat.skill.courtchange.preference.swift")), F.const(-2), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把念力铺成一场法阵需要多久；速度越快越短，速换更快。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(0.8)).clamp(5, 10).round(0),
            "收招", "换场落定后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越短，稳换更长。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("swift", text("worldcombat.skill.courtchange.preference.swift")), F.const(0.8), F.const(1.25)))
                .clamp(70, 170).round(0),
            "冷却", "两次换场之间的等待；等级越高越短，稳换更长。PP 10 的代价。")
    });

    describe(courtChangeId, [
        { key: "description.0", values: ["field","reach"] },
        { key: "description.additional", values: [] },
        { key: "swift.on", values: ["tempo", "wait"], when: function (context) { return read(context.detail.values, ["swift"]) === true; } },
        { key: "swift.off", values: [], when: function (context) { return read(context.detail.values, ["swift"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
