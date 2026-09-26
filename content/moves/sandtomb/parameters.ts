/**
 * 流沙地狱 / sandtomb 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Ground、物理、威力 35、命中 85、PP 15、优先度 0、
 * flags protect/mirror/metronome、volatile partiallytrapped（4–5 回合，期间对手无法逃走）。
 *
 * 翻译：保留「把对手困在铺天盖地的沙暴里、持续攻击」，翻成即时战斗里**在瞄准地面预置的一片短命流沙坑**：
 * 沿瞄准射线取一块真实可达的支撑面，先在原地裂开细沙 6 刻作预告，随后沙坑张开、沙粒朝坑心翻流。
 * 只有**贴地、且脚踩在这层地面**的敌人会被逐步拖住：从轻减速到约 12 刻的完整束缚，每 `interval` 磨一次，
 * 并每一拍朝坑心收拢。离地、走出坑沿或地面被毁都立刻解除；回到坑里要重新渐陷，不叠永久状态。
 * 与同族分开：
 *   流沙地狱 —— 只吃贴地目标，物理磨蚀、向心收拢；腾空即脱身。
 *   潮旋     —— 水，不限制移动，只把圈内的人往回拽。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   grind      磨蚀威力 16 + 物攻偏移 + 等级偏移（物攻越高、等级越高磨得越重）。
 *   duration   沙坑存续 180 刻 + 物攻偏移 + 等级；沉陷式 ×1.15。
 *   interval   磨蚀间隔 22 刻 − 速度偏移（出手快的沙流更急）。
 *   pull       收拢强度 0.5 + 物攻偏移，再按**目标体重**放大（越重被拉得越紧）；沉陷式 ×1.2。
 *   grip       陷足时间 12 刻 − **目标体重**偏移（越重的目标下陷越快、越快被拖住）；夹 8..18 刻。
 *   radius     沙坑半径 1.2 格 + 施法者体型宽度偏移 + 物攻偏移；沉陷式 ×1.2。
 *   reach      射程 10 格 + 物攻偏移。
 *   charge     起手/裂纹 6 刻 − 速度偏移（速度越快起手越短）。
 *   grit       扬沙数量 12 + 物攻 ×0.14，同时驱动画面里的沙尘量。
 *
 * 配置 `deep`（沉陷式）：开启＝持续 ×1.15、半径 ×1.2、收拢 ×1.2、冷却 +8，但每次磨蚀 ×0.9，
 * 用更深的坑把目标埋得久；关闭＝磨得更重、收得更快。两向各有适用局面。
 *
 * 伤害段 `grind` 与参数同名，走共享换算（原生类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("sandtomb", {
        /** 磨蚀威力：16 + 物攻偏移[−8,14] + 等级(≥20)偏移[0,10]；沉陷 ×0.9；夹 12..54。 */
        grind: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-8, 14))
                .plus(F.level().minus(20).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("deep"), F.const(0.9), F.const(1)))
                .clamp(12, 54).round(1),
            "磨蚀威力", {
                base: 16, unit: "威力",
                description: "沙砾每磨一下的基础威力；对手防御、相性与暴击在命中时另算。"
            }),
        /** 沙坑存续：180 + 物攻偏移[−30,80] + 等级(≥30)偏移[0,30]；沉陷 ×1.15；夹 100..300 刻。 */
        duration: seconds(
            F.base(180)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.level().minus(30).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(1)))
                .clamp(100, 300).round(0),
            "沙坑持续", "预置的流沙坑存续多久；期间踏入的贴地目标被逐步拖住并持续受磨。"),
        /** 磨蚀间隔：22 − 速度偏移[−8,8]；夹 12..30 刻。 */
        interval: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8)).clamp(12, 30).round(0),
            "磨蚀间隔", "同一个目标每隔多久被磨一次；速度越快的个体沙流越急。"),
        /** 收拢强度：0.5 + 物攻偏移[−0.1,0.3]，再 ×(1 + 目标体重/240)；沉陷 ×1.2；夹 0.2..0.9 格/拍。 */
        pull: formula(
            F.base(0.5)
                .plus(F.stat("attack").minus(60).times(0.002).clamp(-0.1, 0.3))
                .times(F.when(F.pref("deep"), F.const(1.2), F.const(1)))
                .times(F.const(1).plus(F.target("body.weight").as("目标体重").div(240)))
                .clamp(0.2, 0.9).round(3),
            "收拢强度", {
                base: 0.5, unit: "格/拍",
                description: "每一拍把坑内目标朝坑心收拢的距离；目标越重，被拉得越紧。"
            }),
        /** 陷足时间：12 − 目标体重偏移[−2,6]；夹 8..18 刻。 */
        grip: seconds(
            F.base(12)
                .minus(F.target("body.weight").as("目标体重").minus(80).times(0.02).clamp(-2, 6))
                .clamp(8, 18).round(0),
            "陷足时间", "从踏入时的轻微减速到完全被拖住所需的时间；越重的目标下陷越快。"),
        /** 沙坑半径：1.2 + 施法者体型宽度偏移[−0.1,0.7] + 物攻偏移[−0.1,0.6]；沉陷 ×1.2；夹 1.0..2.6 格。 */
        radius: formula(
            F.base(1.2)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.1, 0.7))
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.6))
                .times(F.when(F.pref("deep"), F.const(1.2), F.const(1)))
                .clamp(1.0, 2.6).round(2),
            "沙坑半径", {
                base: 1.2, unit: "格",
                description: "流沙坑铺开的半径，也是画面里那片翻沙的范围；体型更大的施法者撑得更开。"
            }),
        /** 射程：10 + 物攻偏移[−2,7]；夹 9..17 格。 */
        reach: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.04).clamp(-2, 7)).clamp(9, 17).round(1),
            "射程", {
                base: 10, unit: "格",
                description: "能把流沙甩到多远的可达地面上。"
            }),
        /** 起手：6 − 速度偏移[−1,2]；夹 4..10 刻。 */
        charge: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(4, 10).round(0),
            "起手", "地面的细沙裂纹提前多久出现；速度越快，沙坑张开得越早。"),
        /** 扬沙数量：12 + 物攻 ×0.14；夹 10..40。同时驱动画面里的沙尘量。 */
        grit: formula(
            F.base(12).plus(F.stat("attack").times(0.14)).clamp(10, 40).round(0),
            "扬沙数量", {
                base: 12, unit: "个",
                description: "沙坑翻涌与磨蚀时扬起的沙尘量；随物攻增长，也决定画面里的沙尘密度。"
            })
    });

    defineDamage("sandtomb", "grind", {}, {});

    stages("sandtomb", [
        { level: 30, values: { grind: 24, duration: 210, pull: 0.6 } }
    ]);

    describe("sandtomb", [
        { key: "description.0", values: ["radius", "reach", "charge", "grip"] },
        { key: "description.1", values: ["grind", "interval", "pull", "duration"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.grind", "tier.0.pull"] }
    ]);
}
