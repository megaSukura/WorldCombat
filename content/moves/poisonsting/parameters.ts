/**
 * 毒针 / poisonsting —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／物理／威力 15／命中 100／PP 35／单体／**非接触**（无 contact flag）／30% 令目标中毒。
 *
 * 翻译：把「将有毒的针刺入对手」落成**一发廉价的远程细针**——飞得远、伤害极低、出手快、冷却短；针扎进身体后不立刻发作，
 *   毒在伤口里慢慢渗开（stick → seep 两拍），所以玩家会看到「中针」与「中毒」是两件事。它卖的是便宜与次数。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   tip          针尖威力：物攻（针有多利）；倒钩针更钝、光针更利。
 *   reach        射程：等级（出手距离感）＋特攻（控制）；也是本招实际射程。
 *   needleSpeed  飞行速度：速度（甩针的快慢）；倒钩针飞得慢、光针更快。
 *   needleRadius 判定半径：碰撞箱高度（针的粗细）。
 *   poisonChance 中毒概率：**特攻**（毒液分泌量）；倒钩针 ×1.3、光针 ×0.85。
 *   venomTicks   中毒时长：特攻＋等级；倒钩针 ×1.25、光针 ×0.85。
 *   seep         渗毒延迟：速度（代谢越快渗得越快）；让「中针」和「中毒」分成两拍。
 *   needles      毒滴数：物攻；同时是画面里针尾与溅出的毒滴数量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 配置 `barbed`（倒钩针，默认关）双向取舍：开启＝中毒概率 ×1.3、中毒时长 ×1.25，代价是针尖威力 ×0.85、飞行 ×0.85
 *   ——更容易留住毒，但更难打疼、更难追上走位；关闭＝光滑细针，飞得快、威力 ×1.1，但留毒更少更短。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("poisonsting", {
        /** 针尖威力：15 + 物攻偏移[−3,10]；倒钩 ×0.85 / 光针 ×1.1；夹 8..32。 */
        tip: formula(
            F.base(15).plus(F.stat("attack").minus(45).times(0.08).clamp(-3, 10))
                .times(F.when(F.pref("barbed"), F.const(0.85), F.const(1.1)))
                .clamp(8, 32).round(1),
            "针尖威力", {
                unit: "威力",
                description: "一发细针扎进去的基础威力；物攻越高越利，本族最轻的一记。倒钩针更钝、光针更锋利。对手物防、相性与暴击在命中时另算。"
            }),
        /** 射程：11 + 等级(≥20)偏移[0,3] + 特攻偏移[−1,2]；夹 8..15。 */
        reach: formula(
            F.base(11).plus(F.level().minus(20).times(0.08).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(50).times(0.02).clamp(-1, 2))
                .clamp(8, 15).round(1),
            "射程", {
                unit: "格",
                description: "能把针甩到多远；等级越高、控制越好的个体够得越远。它也是本招的实际射程，本族最远的持续消耗手段之一。"
            }),
        /** 飞行速度：1.9 + 速度偏移[−0.3,0.6]；倒钩 ×0.85 / 光针 ×1.1；夹 1.2..3.0。 */
        needleSpeed: formula(
            F.base(1.9).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.3, 0.6))
                .times(F.when(F.pref("barbed"), F.const(0.85), F.const(1.1)))
                .clamp(1.2, 3.0).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "细针脱手的速度；速度快的个体甩得更急、目标更难走位躲开。倒钩针飞得慢、光针更快。"
            }),
        /** 判定半径：0.14 + 高度偏移[−0.02,0.12]；夹 0.1..0.3。 */
        needleRadius: formula(
            F.base(0.14).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.02, 0.12)).clamp(0.1, 0.3).round(2),
            "判定半径", {
                unit: "格",
                description: "针在飞行与命中时的横向判定半径；大个子的针更粗。"
            }),
        /** 中毒概率：0.30 + 特攻偏移[−0.06,0.2]；倒钩 ×1.3 / 光针 ×0.85；夹 0.15..0.6。 */
        poisonChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(50).times(0.0016).clamp(-0.06, 0.2))
                .times(F.when(F.pref("barbed"), F.const(1.3), F.const(0.85)))
                .clamp(0.15, 0.6),
            "中毒概率", "针扎进去后按这个概率在伤口里渗下毒；原生 30% 起，特攻越高毒液越足。倒钩针更容易留住毒。"),
        /** 中毒时长：260 + 特攻偏移[−20,80] + 等级(≥20)偏移[0,80]；倒钩 ×1.25 / 光针 ×0.85；夹 180..520。 */
        venomTicks: seconds(
            F.base(260).plus(F.stat("specialAttack").minus(50).times(0.7).clamp(-20, 80))
                .plus(F.level().minus(20).times(2).clamp(0, 80))
                .times(F.when(F.pref("barbed"), F.const(1.25), F.const(0.85)))
                .clamp(180, 520).round(0),
            "中毒时长", "渗进伤口的毒持续多久；特攻与等级越高挂得越久，倒钩针更长。"),
        /** 渗毒延迟：8 − 速度偏移[−2,3]；夹 4..12；单位刻。 */
        seep: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(4, 12).round(0),
            "渗毒延迟", "中针之后隔多久毒才在伤口里发作；速度快的个体渗得更快，让「中针」和「中毒」分成两拍。"),
        /** 毒滴数：8 + 物攻偏移[−2,8]；夹 6..18。 */
        needles: formula(
            F.base(8).plus(F.stat("attack").minus(45).times(0.1).clamp(-2, 8)).clamp(6, 18).round(0),
            "毒滴数", {
                unit: "滴",
                description: "针尾拖出的毒滴数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−1,2]；夹 3..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 9).round(0),
            "起手", "举针瞄准再甩出的时间；速度越快越短，本族最便宜的一发。"),
        /** 收招：5 − 速度偏移[−1,1.5]；夹 3..8。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.015).clamp(-1, 1.5)).clamp(3, 8).round(0),
            "收招", "甩完收势的时间；速度越快收得越快。"),
        /** 冷却：8 − 等级(≥20)偏移[0,2]；夹 5..12。 */
        recharge: seconds(
            F.base(8).minus(F.level().minus(20).times(0.05).clamp(0, 2)).clamp(5, 12).round(0),
            "冷却", "再甩一针之间的等待；本族最短之一，配合 PP 35 可以连着点。")
    });

    defineDamage("poisonsting", "tip", {});

    stages("poisonsting", [
        { level: 25, values: { tip: 18 } },
        { level: 40, values: { tip: 22, venomTicks: 340, reach: 12 } }
    ]);

    describe("poisonsting", [
        { key: "description.0", values: ["tip", "reach", "needleSpeed", "needleRadius"] },
        { key: "description.1", values: ["poisonChance", "venomTicks", "seep"] },
        { key: "description.2", values: ["needles", "tempo", "settle", "recharge"] },
        { key: "barbed.on", values: [], when: function (context) { return read(context.detail.values, ["barbed"]) === true; } },
        { key: "barbed.off", values: [], when: function (context) { return read(context.detail.values, ["barbed"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tip"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.tip", "tier.1.venomTicks", "tier.1.reach"] }
    ]);
}
