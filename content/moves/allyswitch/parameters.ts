/**
 * 交换场地 / Ally Switch —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic、变化、威力 0、命中必中、PP 15、优先度 +2、目标 self；
 *   在双打／三打里与同伴互换场上位置（`swapPosition`）；连续使用成功概率按 1/3、1/9… 递减（counterMax 729）。
 *
 * 世界化：不是「换一个站位格」，而是**用念力把两人瞬间对调**——施法者与选定的同伴在同一瞬间交换所在位置，
 *   留下一小段错位残影；更关键的是，**原本盯着我或盯着同伴的敌人，会跟着对调目标**（原生「顶掉那一下」的忠实翻译：
 *   原本打向我的招式，换位后落到换上来的同伴身上，反之亦然）。这是一次瞬时的位移与误导，不留东西、不给等级。
 *   原生 +2 优先度落成很短的起手（2~8 刻）；「连用成功率下降」落成冷却：换一次后要等冷却才能再换。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   swapRange 交换距离：基础 6 格 + 速度×0.01 + 等级×0.03；同调 ×1.15／独行 ×0.9；夹 5..10。够到多远的同伴才能换。
 *   sweep     误导半径：基础 3 格 + 等级×0.04 + 碰撞箱高×0.2；同调 ×1.2；夹 2.5..6。把多大范围内盯着两人的敌人目标对调。
 *   blink     残影时长：基础 16 刻 + 速度×0.05 + 等级×0.2；夹 12..40。原地的错位残影留多久（纯表现）。
 *   motes     残影光点：基础 18 + 速度×0.08 + 特攻×0.04；夹 14..52。一次对调迸出的念力光点，粒子按它发射。
 *   tempo     起手：基础 4 刻 − 速度×0.015；夹 2..8。原生 +2 优先度：几乎瞬发。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高×0.6；夹 4..8。
 *   wait      冷却：基础 70 刻 − 等级×0.3；同调 ×1.25／独行 ×0.8；夹 40..110。两次对调之间要等多久（对调「连用不稳」的落地）。
 * 配置 tandem（同调）双向取舍：同调＝够得更远（×1.15）、误导圈更宽（×1.2），代价是冷却 ×1.25；独行＝够得近、误导窄，
 *   但冷却 ×0.8，适合频繁换位脱身。两个方向各有局面。
 */
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
                description: "对调后，这个半径内原本盯着我或同伴的敌人会把目标换到另一人身上；等级与体型越大、同调式越宽。"
            }),
        /** 残影时长：错位残影留多久（纯表现）。 */
        blink: seconds(
            F.base(16).plus(F.stat("speed").times(0.05)).plus(F.level().times(0.2)).clamp(12, 40).round(0),
            "残影时长", "换位后两处原地留下的错位残影留多久；速度与等级越高越久，只是画面，不影响判定。"),
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
        { key: "description.0", values: ["swapRange", "sweep"] },
        { key: "tandem.on", values: ["tempo", "wait"], when: function (context) { return read(context.detail.values, ["tandem"]) === true; } },
        { key: "tandem.off", values: [], when: function (context) { return read(context.detail.values, ["tandem"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
