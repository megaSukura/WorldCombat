/**
 * 流沙地狱 / sandtomb 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Ground、物理、威力 35、命中 85、PP 15、优先度 0、
 * flags protect/mirror/metronome、volatile partiallytrapped（4–5 回合，期间对手无法逃走）。
 *
 * 翻译：保留「把对手困在铺天盖地的沙暴里、持续攻击」，翻成即时战斗里**一片陷在目标脚下的流沙坑**：
 * 沙砾命中先结算一次物理伤害，随后在目标脚下塌出流沙坑，把**贴地**的目标钉住并往坑心、往下吞，
 * 每 `interval` 磨一次；目标越重，陷得越深、被拉得越紧。升到坑口以上（跳跃、飞行、被抬起、瞬移）就会滑脱——
 * 这是它唯一的天然反制；地面受冲击的痕迹以一片沙化的地面（沙岩）留在原地。
 * 与同族分开：
 *   流沙地狱 —— 只吃贴地目标，物理挤压、往下沉陷；腾空即脱身。
 *   潮旋     —— 水，不限制移动，只把圈内的人往回拽。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   grind       磨蚀威力 16 + 物攻偏移 + 等级偏移（物攻越高、等级越高磨得越重）。
 *   duration    沙坑持续 180 刻 + 物攻偏移 + 等级；沉陷式 ×1.15。
 *   interval    磨蚀间隔 22 刻 − 速度偏移（出手快的沙流更急）。
 *   pull        收拢强度 0.5 + 物攻偏移，再按**目标体重**放大（越重陷得越深、被拉得越紧）。
 *   sink        下陷幅度 0.05 + 目标体重偏移；沉陷式 ×1.4；总下陷有上限。
 *   escape      脱身距离 2.4 格 + 速度偏移 + **目标体型宽度**偏移。
 *   radius      沙坑半径 1.3 格 + 目标宽度偏移；沉陷式 ×1.2。
 *   speed       沙砾速度 0.85 + 速度偏移。
 *   reach       射程 10 格 + 物攻偏移。
 *   charge      起手 9 刻 − 速度偏移。
 *   grit        扬沙数量 12 + 物攻 ×0.14，同时驱动画面里的沙尘量。
 *
 * 配置 `deep`（沉陷式）：开启＝下陷 ×1.4、持续 ×1.15、半径 ×1.2、冷却 +8，但每次磨蚀 ×0.9，
 * 用更深的坑把目标埋得久；关闭＝收得更紧、磨得更重、更快结束。两向各有适用局面。
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
                description: "沙砾磨一下的基础威力；对手防御、相性与暴击在命中时另算。"
            }),
        /** 沙坑持续：180 + 物攻偏移[−30,80] + 等级(≥30)偏移[0,30]；沉陷 ×1.15；夹 100..300 刻。 */
        duration: seconds(
            F.base(180)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.level().minus(30).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(1)))
                .clamp(100, 300).round(0),
            "沙坑持续", "流沙坑存续多久；期间贴地的目标被钉住并持续下陷、被磨。"),
        /** 磨蚀间隔：22 − 速度偏移[−8,8]；夹 12..30 刻。 */
        interval: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8)).clamp(12, 30).round(0),
            "磨蚀间隔", "每隔多久磨一次；速度越快的个体沙流越急。"),
        /** 收拢强度：0.5 + 物攻偏移[−0.1,0.3]，再 ×(1 + 目标体重/240)；沉陷 ×1.15；夹 0.2..0.9 格/拍。 */
        pull: formula(
            F.base(0.5)
                .plus(F.stat("attack").minus(60).times(0.002).clamp(-0.1, 0.3))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(1)))
                .times(F.const(1).plus(F.target("body.weight").as("目标体重").div(240)))
                .clamp(0.2, 0.9).round(3),
            "收拢强度", {
                base: 0.5, unit: "格/拍",
                description: "每一拍把目标朝坑心收拢的距离；目标越重，陷得越深、被拉得越紧。"
            }),
        /** 下陷幅度：0.05 + 目标体重偏移[−0.01,0.06]；沉陷 ×1.4；夹 0.02..0.14 格/拍（总下陷有上限）。 */
        sink: formula(
            F.base(0.05)
                .plus(F.target("body.weight").as("目标体重").minus(80).times(0.00015).clamp(-0.01, 0.06))
                .times(F.when(F.pref("deep"), F.const(1.4), F.const(1)))
                .clamp(0.02, 0.14).round(3),
            "下陷幅度", {
                base: 0.05, unit: "格/拍",
                description: "每一拍把目标往坑里带下的深度；越重的目标沉得越快，但总下陷有上限。"
            }),
        /** 脱身距离：2.4 + 速度偏移[−0.4,0.6] + 目标宽度偏移[−0.2,1.0]；夹 2.0..4.0 格。 */
        escape: formula(
            F.base(2.4)
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.4, 0.6))
                .plus(F.target("body.width").as("目标体型宽度").minus(0.9).times(0.6).clamp(-0.2, 1.0))
                .clamp(2.0, 4.0).round(2),
            "脱身距离", {
                base: 2.4, unit: "格",
                description: "被拽离坑心超过这个距离，流沙就抓不住；被击退或冲刺都可能一步跨出去。"
            }),
        /** 沙坑半径：1.3 + 目标宽度偏移[−0.1,0.9]；沉陷 ×1.2；夹 1.0..2.6 格。 */
        radius: formula(
            F.base(1.3)
                .plus(F.target("body.width").as("目标体型宽度").minus(0.9).times(0.55).clamp(-0.1, 0.9))
                .times(F.when(F.pref("deep"), F.const(1.2), F.const(1)))
                .clamp(1.0, 2.6).round(2),
            "沙坑半径", {
                base: 1.3, unit: "格",
                description: "流沙坑的大小，也是画面里那片翻沙的半径；目标越宽，坑铺得越开。"
            }),
        /** 沙砾速度：0.85 + 速度偏移[−0.25,0.5]；夹 0.55..1.4 格/刻。 */
        speed: formula(
            F.base(0.85).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.25, 0.5)).clamp(0.55, 1.4).round(2),
            "沙砾速度", {
                base: 0.85, unit: "格/刻",
                description: "卷起的沙砾飞向目标的速度。"
            }),
        /** 射程：10 + 物攻偏移[−2,7]；夹 9..17 格。 */
        reach: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.04).clamp(-2, 7)).clamp(9, 17).round(1),
            "射程", {
                base: 10, unit: "格",
                description: "能把流沙甩到多远的目标脚下。"
            }),
        /** 起手：9 − 速度偏移[−2,3]；夹 6..13 刻。 */
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(6, 13).round(0),
            "起手", "把沙卷起来、埋向目标脚下的时间；速度越快起手越短。"),
        /** 扬沙数量：12 + 物攻 ×0.14；夹 10..40。同时驱动画面里的沙尘量。 */
        grit: formula(
            F.base(12).plus(F.stat("attack").times(0.14)).clamp(10, 40).round(0),
            "扬沙数量", {
                base: 12, unit: "个",
                description: "命中与每趟磨蚀时扬起的沙尘量；随物攻增长，也决定画面里的沙尘密度。"
            })
    });

    defineDamage("sandtomb", "grind", {}, {});

    stages("sandtomb", [
        { level: 30, values: { grind: 24, duration: 210, pull: 0.6 } }
    ]);

    describe("sandtomb", [
        { key: "description.0", values: ["grind"] },
        { key: "description.1", values: ["duration","interval","grind","pull","sink"] },
        { key: "description.2", values: ["escape","radius","reach","speed"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.grind", "tier.0.pull"] }
    ]);
}
