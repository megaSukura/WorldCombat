/**
 * 换场 / Court Change —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 100、PP 10、优先度 0、目标 field；
 *   `onHitField` 把双方的场地效果（mist／lightscreen／reflect／spikes／safeguard／tailwind／toxicspikes／
 *   stealthrock／pledge／stickyweb／auroraveil 等 side condition）互换。
 *
 * 世界化：我们这里没有「一侧」这个概念，场地效果是留在世界上的**领域**（WorldEffects.field 铺出的地块：治疗之泉、
 *   漩涡、禁锢、尖刺……），谁铺的、为谁服务由该领域的**来源**决定（`world.friendly`）。于是「交换双方场地效果」
 *   翻成**把战场上已经铺开的领域对调归属**：敌方的领域过户到我方、我方的领域过户给对方，一次念力扫过战场完成。
 *   这是真正的双向取舍——你会失去自己的领域，同时接管对方的；原生「对所有场地效果一次性交换」保留，
 *   只是把「side」换成「来源阵营」，用共享的领域效果本身承载（不新造机制，也不改动共享库源码）。
 *   登记领域的人是各领域自己的招式，换场只搬归属；被搬动的领域保留规则、半径、时长与数据，并在新归属下重新扫描。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   field   换场半径：基础 4 格 + 等级×0.05 + 碰撞箱高×0.3；速换 ×0.85／稳换 ×1.2；夹 3.5..8。一次能圈住多大一片领域。
 *   reach   施放距离：基础 6 格 + 等级×0.05；夹 5..10。能把换场法阵放到多远（点选落点）。
 *   motes   魔法光点：基础 24 + 特攻×0.1；夹 18..60。一次换场迸出的念力光点，粒子按它发射。
 *   waves   扫过圈数：基础 2 + 等级÷25；夹 2..4。念力扫过战场推几圈。
 *   tempo   起手：基础 10 刻 − 速度×0.03，速换 −2；夹 6..16。
 *   aftercast 收招：基础 6 刻 + 碰撞箱高×0.8；夹 5..10。
 *   wait    冷却：基础 120 刻 − 等级×0.5，速换 ×0.8／稳换 ×1.25；夹 70..170。PP 10 的代价。
 * 配置 swift（速换）双向取舍：速换＝冷却 ×0.8、起手 −2，代价是半径 ×0.85（快而小）；稳换＝半径 ×1.2，代价是冷却 ×1.25
 *   （大而慢）。两个方向各有局面。
 */
namespace PokemonSkills {
    export const courtChangeId = "courtchange";
    export const courtChangeScene = "world_combat:move_courtchange";
    export const courtChangeReassign = "world_combat:courtchange/reassign";
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
