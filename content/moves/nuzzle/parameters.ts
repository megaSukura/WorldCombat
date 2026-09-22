/**
 * 蹭蹭脸颊 / nuzzle —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Electric／物理／威力 20／命中 100／PP 20／单体／接触／100% 令对手麻痹。
 * 翻译：把「把带电的脸颊蹭上对手」翻成一件**必须贴上去才能成立的事**——施法者先朝目标扑一截，够得着才蹭得上；
 *   蹭上只有极小的物理伤害，但**一定**把对手麻住（对电属性无效）。原生的接触 flag 在即时战里就是「得先贴身」，
 *   玩家的反制是别让它靠近。配置 `pounce`（猛扑式）扑得更远，但落地更慢、蹭的劲更小。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数（同一招在不同个体手里读起来不同）：
 *   nudge        蹭击威力：**物攻**（本族唯一走物攻的一招）决定蹭的劲；猛扑式略轻。
 *   lunge        前扑距离：速度（快个体扑得远）＋猛扑式 ×1.35。
 *   touchReach   接触半径：碰撞箱高度（大个子蹭得到更远）。
 *   numbTicks    麻痹时长：特攻决定静电的强弱（本招走物攻伤害、但麻痹强度看静电）；猛扑式略短。
 *   arcs         电弧条数：特攻；同时是画面里贴到对手身上的火花数量。
 *   reach        起手距离：等级（越熟练越能提早起步）＋猛扑式 ×1.3。
 *   tempo        起手：速度；猛扑式要多蹲一拍。
 *   settle       收招：猛扑式落地更慢。
 *   recharge     冷却：等级。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const nuzzleId = "nuzzle";

    actionParameters.define(nuzzleId, {
        /** 蹭击威力：18 + 物攻偏移[−6,14]；猛扑 ×0.9 / 短蹭 ×1.05；夹 8..34。 */
        nudge: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.12).clamp(-6, 14))
                .times(F.when(F.pref("pounce"), F.const(0.9), F.const(1.05)))
                .clamp(8, 34).round(1),
            "蹭击威力", {
                unit: "威力",
                description: "蹭上去那一下的基础威力；物攻越高越重，这是本族唯一走物攻的一招。猛扑式更轻。对手物防、相性与暴击在命中时另算。"
            }),
        /** 前扑距离：1.3 + 速度偏移[−0.3,0.9]；猛扑 ×1.35；夹 0.6..2.6。 */
        lunge: formula(
            F.base(1.3).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.9))
                .times(F.when(F.pref("pounce"), F.const(1.35), F.const(1)))
                .clamp(0.6, 2.6).round(2),
            "前扑距离", {
                unit: "格",
                description: "起手后朝目标扑出去多远；速度越快扑得越远，猛扑式再远三成。够不到就蹭空。"
            }),
        /** 接触半径：0.85 + 高度偏移[−0.1,0.35]；夹 0.6..1.4。 */
        touchReach: formula(
            F.base(0.85).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.35)).clamp(0.6, 1.4).round(2),
            "接触半径", {
                unit: "格",
                description: "脸颊够到多近才算蹭上；个子高的个体蹭得到更远，两个身体半径也计入。"
            }),
        /** 麻痹时长：180 + 特攻偏移[−30,80]；猛扑 ×0.9；夹 120..320。 */
        numbTicks: seconds(
            F.base(180).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-30, 80))
                .times(F.when(F.pref("pounce"), F.const(0.9), F.const(1)))
                .clamp(120, 320).round(0),
            "麻痹时长", "蹭上就必定麻住，这里是麻住多久；特攻决定静电强弱，猛扑式略短。"),
        /** 电弧条数：4 + 特攻偏移[0,5]；夹 3..10。 */
        arcs: formula(
            F.base(4).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(0, 5)).clamp(3, 10).round(0),
            "电弧条数", {
                unit: "条",
                description: "蹭上时贴到对手身上的火花条数；特攻越高越密，也是画面里火花与环的数量。"
            }),
        /** 起手距离：2.5 + 等级(≥25)偏移[0,0.6]；猛扑 ×1.3；夹 2.0..3.8。 */
        reach: formula(
            F.base(2.5).plus(F.level().minus(25).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("pounce"), F.const(1.3), F.const(1)))
                .clamp(2.0, 3.8).round(2),
            "起手距离", {
                unit: "格",
                description: "能锁定多远处的目标再扑出去；本族最短，必须贴到脸上。它也是本招的实际射程。"
            }),
        /** 起手：7 − 速度偏移[−2,3] + 猛扑 2；夹 3..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.025).clamp(-2, 3))
                .plus(F.when(F.pref("pounce"), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "蹲下攒电的时间；速度越快越短，猛扑式要多蹲一拍。"),
        /** 收招：7；猛扑 ×1.35 / 短蹭 ×0.85；夹 4..12。 */
        settle: seconds(
            F.base(7).times(F.when(F.pref("pounce"), F.const(1.35), F.const(0.85))).clamp(4, 12).round(0),
            "收招", "蹭完恢复架势的时间；猛扑式落地更慢，短蹭更快。"),
        /** 冷却：15 − 等级(≥25)偏移[0,4]；夹 7..26。 */
        recharge: seconds(
            F.base(15).minus(F.level().minus(25).times(0.1).clamp(0, 4)).clamp(7, 26).round(0),
            "冷却", "两次蹭之间的等待；这是本族最短的冷却之一，但每次都要重新贴身。")
    });

    defineDamage(nuzzleId, "nudge", {});

    stages(nuzzleId, [
        { level: 20, values: { nudge: 24 } },
        { level: 40, values: { numbTicks: 240, lunge: 1.8 } }
    ]);

    describe(nuzzleId, [
        { key: "description.0", values: ["nudge", "touchReach", "reach"] },
        { key: "description.1", values: ["lunge", "numbTicks", "arcs"] },
        { key: "description.2", values: ["tempo", "settle", "recharge"] },
        { key: "pounce.on", values: [], when: function (context) { return read(context.detail.values, ["pounce"]) === true; } },
        { key: "pounce.off", values: [], when: function (context) { return read(context.detail.values, ["pounce"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.nudge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.numbTicks", "tier.1.lunge"] }
    ]);
}
