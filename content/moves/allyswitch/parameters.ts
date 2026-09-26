/** Position exchange retains its range, resource and tempo tradeoffs. */
namespace PokemonSkills {
    export const allySwitchId = "allyswitch";
    export const allySwitchScene = "world_combat:move_allyswitch";
    export const allySwitchReadyText = "world_combat.move.allyswitch.text.ready";
    export const allySwitchSwapText = "world_combat.move.allyswitch.text.swap";
    export const allySwitchFizzleText = "world_combat.move.allyswitch.text.fizzle";

    actionParameters.define(allySwitchId, {
        /** 交换距离：够到多远的同伴。 */
        swapRange: formula(
            F.base(6).plus(F.stat("speed").times(0.01)).plus(F.level().times(0.03))
                .times(F.when(F.pref("tandem", text("worldcombat.skill.allyswitch.preference.tandem")), F.const(1.15), F.const(0.9)))
                .clamp(5, 10).round(2),
            "交换距离", {
                unit: " 格",
                description: "能与多远的同伴对调位置；速度与等级越高够得越远，同调式更远。它也是本招的实际射程。"
            }),
        /** 误导半径：多大范围内盯着两人的敌人目标对调。 */
        sweep: formula(
            F.base(3).plus(F.level().times(0.04)).plus(F.body("height").times(0.2))
                .times(F.when(F.pref("tandem", text("worldcombat.skill.allyswitch.preference.tandem")), F.const(1.2), F.const(1)))
                .clamp(2.5, 6).round(2),
            "误导半径", {
                unit: " 格",
                description: "对调后，这个半径内原本盯着我或同伴的向敌人请求把目标换到另一人身上；等级与体型越大、同调式越宽。"
            }),
        /** 折光时长：错位残影留多久（纯表现）。 */
        blink: seconds(
            F.base(4).plus(F.stat("speed").times(0.015)).plus(F.level().times(0.03)).clamp(4, 10).round(0),
            "折光时长", "成功换位后双端短折光的时长。"),
        /** 残影光点：一次对调迸出的念力光点。 */
        motes: formula(
            F.base(18).plus(F.stat("speed").times(0.08)).plus(F.stat("specialAttack").times(0.04)).clamp(14, 52).round(0),
            "残影光点", {
                unit: " 点",
                description: "一次对调迸出的念力光点数量；速度与特攻越高越多，粒子按它发射。"
            }),
        /** 起手：原生 +2 优先度，几乎瞬发。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").times(0.015)).clamp(2, 8).round(0),
            "起手", "折叠空间、把两人对调需要多久；速度越快越短（原生优先度 +2，几乎瞬发）。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(0.6)).clamp(4, 8).round(0),
            "收招", "对调落定后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：对调「连用不稳」的落地，同调式更长。 */
        wait: seconds(
            F.base(70).minus(F.level().times(0.3))
                .times(F.when(F.pref("tandem", text("worldcombat.skill.allyswitch.preference.tandem")), F.const(1.25), F.const(0.8)))
                .clamp(40, 110).round(0),
            "冷却", "两次对调之间的等待（原生连续使用会失手）；等级越高越短，同调式更长。")
    });

    describe(allySwitchId, [
        { key: "description.0", values: ["swapRange","sweep"] },
        { key: "tandem.on", values: [], when: function (context) { return read(context.detail.values, ["tandem"]) === true; } },
        { key: "tandem.off", values: [], when: function (context) { return read(context.detail.values, ["tandem"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
