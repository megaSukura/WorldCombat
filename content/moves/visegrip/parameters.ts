/**
 * 夹住 / visegrip 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：一般、物理、威力 55、命中 100、PP 30、单目标、接触、无次要效果。
 *
 * 翻译：把「将对手从两侧夹住」翻成**两只钳子从两侧同时合上、往身前一带**——施法者扑上一步，两钳一左一右夹住
 *   目标碾一下，再顺势把它拽近；钳口相对目标越大，这一夹越实，越重越大的目标越难拽动。
 *   这是本组唯一会改变目标位置的一招：把目标从远处拽进近身，为下一记铺路。
 * 与同为擒抱/控制的招分开：
 *   贝壳夹击 —— 厚壳长时长碾磨，双方一起被钉住；
 *   缠绕     —— 青藤缠上、压低速度与定身，伤害极低；
 *   夹住     —— 一次干脆的双侧钳夹，伤害不低、把人拽近，不留持续状态。
 * 与同为接触物理的身体招分开：龙锤是自上而下的重砸，夹住是横向两侧的一夹一拽。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   squeeze 钳夹威力 34 + 物攻偏移 + 等级偏移 − 目标体型偏移（钳口相对越小，越夹不动大目标）。
 *   reach   钳夹距离 2.4 格 + 身高偏移 + 速度偏移（钳臂越长、出手越快够得越远）。
 *   lunge   扑身距离 0.9 格 + 速度偏移（快的人补得上一步）。
 *   drag    拽近距离 0.9 + 物攻偏移 − 目标质量偏移（越重的目标越拽不动）。
 *   motes   钳口碎屑数量 18 + 物攻偏移（同时驱动画面密度）。
 *   tempo/aftercast/recharge  速度决定起手／收招／冷却。
 *
 * 配置 haul（拖拽式）双向取舍：开＝拽近 ×1.35、距离略长，代价是威力 ×0.9；关（碾夹式）＝威力 ×1.18、
 *   拽近 ×0.65。两向各有局面（把人拖进近身 vs 原地碾一记重的）。
 *
 * 伤害段 squeeze 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    /** 目标质量（hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算；越大越难被钳口拽动。 */
    const visegripMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("visegrip", {
        /** 钳夹威力：34 + 物攻偏移[−8,30] + 等级(≥20)偏移[0,10] − 目标体型高度偏移[−3,10]；拖拽 ×0.9 / 碾夹 ×1.18；夹 20..80。 */
        squeeze: formula(
            F.base(34)
                .plus(F.stat("attack").minus(60).times(0.26).clamp(-8, 30))
                .plus(F.level().minus(20).times(0.22).clamp(0, 10))
                .minus(F.target("body.height").minus(1.4).times(2.2).clamp(-3, 10))
                .times(F.when(F.pref("haul", text("worldcombat.skill.visegrip.preference.haul")), F.const(0.9), F.const(1.18)))
                .clamp(20, 80).round(1),
            "钳夹威力", {
                unit: "威力",
                description: "两钳合上碾这一下的基础威力；物攻越高越狠，**目标体型越大越夹不动**（钳口相对更小）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 钳夹距离：2.4 + 身高偏移[−0.25,0.9] + 速度偏移[−0.15,0.35]；拖拽 ×1.05 / 碾夹 ×0.95；夹 2.0..4.0。 */
        reach: formula(
            F.base(2.4)
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.25, 0.9))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.35))
                .times(F.when(F.pref("haul", text("worldcombat.skill.visegrip.preference.haul")), F.const(1.05), F.const(0.95)))
                .clamp(2.0, 4.0).round(2),
            "钳夹距离", {
                unit: "格",
                description: "钳臂能从多远合上，也是本招的实际射程；个子高、出手快的个体够得更远，拖拽式略长。"
            }),
        /** 扑身距离：0.9 + 速度偏移[−0.2,0.5]；夹 0.5..1.8。 */
        lunge: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.5)).clamp(0.5, 1.8).round(2),
            "扑身距离", {
                unit: "格",
                description: "出手时朝目标补上的那一步；速度快的个体补得更远，更容易夹住擦身而过的目标。"
            }),
        /** 拽近距离：0.9 + 物攻偏移[−0.2,0.5] − 目标质量偏移；拖拽 ×1.35 / 碾夹 ×0.65；夹 0.2..1.8。 */
        drag: formula(
            F.base(0.9)
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.2, 0.5))
                .minus(visegripMassNode.minus(300).times(0.0015).clamp(-0.3, 0.6))
                .times(F.when(F.pref("haul", text("worldcombat.skill.visegrip.preference.haul")), F.const(1.35), F.const(0.65)))
                .clamp(0.2, 1.8).round(2),
            "拽近距离", {
                unit: "格",
                description: "夹住后把目标朝自己拽近的距离；物攻越高拽得越有力，**目标越重越拽不动**，拖拽式明显更远。"
            }),
        /** 钳口碎屑数量：18 + 物攻偏移[−5,14]；夹 10..44。同时驱动画面密度。 */
        motes: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.14).clamp(-5, 14)).clamp(10, 44).round(0),
            "钳口碎屑数量", {
                unit: "个",
                description: "钳口合上时迸出的碎屑数量；随物攻增长，粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：6 − 速度偏移[−1.5,2.5]；夹 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.5)).clamp(4, 10).round(0),
            "起手", "张开双钳、选准角度的起手时间；速度越快合得越快。"),
        /** 收招：7 − 速度偏移[−1.5,2.5]；夹 5..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.5)).clamp(5, 11).round(0),
            "收招", "松开钳口、收势站稳的时间。"),
        /** 冷却：22 − 速度偏移[−3,5]；拖拽 +2；夹 16..32。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("haul", text("worldcombat.skill.visegrip.preference.haul")), F.const(2), F.const(0)))
                .clamp(16, 32).round(0),
            "冷却", "两次钳夹之间的等待；速度越快回得越快。"),
        maxTargets: hidden(1)
    });

    defineDamage("visegrip", "squeeze", {}, { contact: true });

    stages("visegrip", [
        { level: 35, values: { squeeze: 42 } }
    ]);

    describe("visegrip", [
        { key: "description.0", values: ["squeeze","reach"] },
        { key: "description.1", values: ["drag","lunge"] },
        { key: "haul.on", values: [], when: function (context) { return read(context.detail.values, ["haul"]) === true; } },
        { key: "haul.off", values: [], when: function (context) { return read(context.detail.values, ["haul"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.squeeze"] }
    ]);
}
