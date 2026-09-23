/**
 * 电光一闪 / quickattack —— 参数与伤害段。
 *
 * 原生事实：一般／物理／威力 40／命中 100／PP 30／优先度 +1／接触，无次要效果（Cobblemon 1.8，149 位学习者）。
 *   描述「以迅雷不及掩耳之势扑向对手。必定能够先制攻击」。
 *
 * 翻译：即时战斗里没有回合先手，本招把「必定先制」翻成**一道几乎不占时间的贴地直线冲**：
 *   起手短到对手还未摆出动作（tempo 最低可到 0 刻，提交即冲），沿瞄准方向射出一小段，
 *   撞上第一个非友方活体即结算 strike 接触伤害、把它顶开一点，然后立刻停住收势——点到为止。
 *   它全族最短、最便宜：距离短、冷却低、没有附带效果，是「先手点一下／起手技」而不是一记重撞。
 *   与最像的撞击分开：撞击是助跑后整个身体撞上去、顺着冲势从身侧滑过（有 carry、撞空冲到尽头）；
 *   电光一闪不滑过、不贯穿，撞上就停。与神速分开：神速距离约两倍、贯穿并停到身后、冲击重得多。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   strike          冲撞威力：攻击给狠度、速度给抢手；抢拍式 ×0.9。
 *   dash            冲刺距离：速度与等级决定能先到多远，也是射程来源；抢拍式 ×1.07。
 *   pace            每刻位移：速度决定这抹影子有多快。
 *   collisionRadius 判定半径：身高决定撞得多宽。
 *   push            顶开距离：攻击决定撞开后对方退多少。
 *   streak          速度线数量：速度与等级驱动，表现按它发射。
 *   tempo           起手：速度决定多快出手；抢拍式再减 1 刻（可到 0）。
 *   settle/recharge 速度决定收招与冷却；抢拍式冷却更久。
 *
 * 配置 `eager`（抢拍式）双向取舍：开启＝起手再快 1 刻（最低瞬发）、冲刺更远 7%，但这一下轻一成、
 *   冷却多 4 刻；关闭＝冲得扎实、冷却短。一个换「更快更远」，一个换「更重更省」，各有适用的局面。
 *
 * 伤害段 `strike` 与参数同名；接触标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const quickattackId = "quickattack";
    export const quickattackScene = "world_combat:move_quickattack";
    export const quickattackHitText = "world_combat.move.quickattack.text.hit";
    export const quickattackMissText = "world_combat.move.quickattack.text.miss";

    actionParameters.define(quickattackId, {
        /** 冲撞威力：40 +（物攻 − 55）× 0.20 [−9,22] +（速度 − 55）× 0.24 [−6,22]；抢拍 ×0.9；夹 26..96。 */
        strike: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.20).clamp(-9, 22))
                .plus(F.stat("speed").minus(55).times(0.24).clamp(-6, 22))
                .times(F.when(F.pref("eager", text("worldcombat.skill.quickattack.preference.eager")), F.const(0.9), F.const(1)))
                .clamp(26, 96).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "贴地冲上去撞实的那一下；物攻给狠度、速度给抢手。抢拍式冲得轻一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲刺距离：2.7 +（速度 − 55）× 0.018 [−0.35,1.1] +（等级 − 20）× 0.02 [0,0.7]；抢拍 ×1.07；夹 2.4..4.4。 */
        dash: formula(
            F.base(2.7).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.35, 1.1))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.7))
                .times(F.when(F.pref("eager", text("worldcombat.skill.quickattack.preference.eager")), F.const(1.07), F.const(1)))
                .clamp(2.4, 4.4).round(2),
            "冲刺距离", {
                unit: "格",
                description: "从起步到撞上最多冲多远，也是本招的实际射程来源；腿快的个体能从更远处先到。"
            }),
        /** 每刻位移：0.85 +（速度 − 55）× 0.005 [−0.1,0.42]；夹 0.65..1.45。 */
        pace: formula(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.1, 0.42)).clamp(0.65, 1.45).round(2),
            "冲刺速度", { unit: "格/刻", description: "冲起来每刻前进的距离；快到中间过程几乎看不见，这就是「先制」。" }),
        /** 判定半径：0.40 +（身高 − 1.4）× 0.10 [−0.06,0.24]；夹 0.34..0.70。 */
        collisionRadius: formula(
            F.base(0.40).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.06, 0.24)).clamp(0.34, 0.70).round(2),
            "判定半径", { unit: "格", description: "冲刺途中扫过活体的横向判定半径；身板越大扫得越宽。" }),
        /** 顶开距离：0.18 +（物攻 − 55）× 0.002 [−0.03,0.16]；夹 0.08..0.36。 */
        push: formula(
            F.base(0.18).plus(F.stat("attack").minus(55).times(0.002).clamp(-0.03, 0.16)).clamp(0.08, 0.36).round(2),
            "顶开距离", { unit: "格", description: "撞实后把目标沿冲刺方向顶开一点的距离；电光一闪以快为主，推得不多。" }),
        /** 速度线数量：16 +（速度 − 55）× 0.30 [−3,12] +（等级 − 20）× 0.20 [0,8]；夹 12..40。 */
        streak: formula(
            F.base(16).plus(F.stat("speed").minus(55).times(0.30).clamp(-3, 12))
                .plus(F.level().minus(20).times(0.20).clamp(0, 8)).clamp(12, 40).round(0),
            "速度线数量", {
                unit: "道",
                description: "身后拖出的速度线数量，也直接驱动画面的发射量；速度与等级越高拖得越密。"
            }),
        /** 起手：2 −（速度 − 55）× 0.02 [−0.8,1.4] − 抢拍 1；夹 0..4 刻。 */
        tempo: seconds(
            F.base(2).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.4))
                .minus(F.when(F.pref("eager", text("worldcombat.skill.quickattack.preference.eager")), F.const(1), F.const(0)))
                .clamp(0, 4).round(0),
            "起手", "从起念到冲出去之间的时间；极短，抢拍式再快 1 刻（最低瞬发）。对手看到的反应窗口就是它。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.8,1.5]；夹 3..8 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5)).clamp(3, 8).round(0),
            "收招", "撞上停住后站稳的时间；它点到为止，所以收得也快。"),
        /** 冷却：16 −（速度 − 55）× 0.10 [−2,4] + 抢拍 4；夹 10..28 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.10).clamp(-2, 4))
                .plus(F.when(F.pref("eager", text("worldcombat.skill.quickattack.preference.eager")), F.const(4), F.const(0)))
                .clamp(10, 28).round(0),
            "冷却", "这一下之后多久能再抢一次；全族最短。速度快的个体回得更快，抢拍式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(quickattackId, "strike", {}, { contact: true });

    stages(quickattackId, [
        { level: 18, values: { strike: 50 } },
        { level: 36, values: { strike: 62, dash: 3.2 } }
    ]);

    describe(quickattackId, [
        { key: "description.0", values: ["strike", "collisionRadius"] },
        { key: "description.1", values: ["dash","pace","push"] },
        { key: "eager.on", values: [], when: function (context) { return read(context.detail.values, ["eager"]) === true; } },
        { key: "eager.off", values: [], when: function (context) { return read(context.detail.values, ["eager"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.strike", "tier.1.dash"] }
    ]);
}
