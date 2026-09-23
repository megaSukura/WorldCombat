/**
 * 雷电囚笼 / thundercage 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Electric、特殊、威力 80、命中 90、PP 15、优先度 0、
 * flags protect/mirror、volatile partiallytrapped（4–5 回合，期间对手无法逃走）。它只有 1 个学习者，
 * 是这一族里最重的一记，也是唯一的电属性。
 *
 * 翻译：保留「把对手困在电流四溅的囚笼里、持续攻击」，翻成即时战斗里**一圈立在目标四周的电流栅栏**：
 * 电击命中先结算一次较重的特殊伤害（cage），随后在目标周围立起半径 `radius` 的电笼；目标被关在笼内，
 * 越想越过栅栏越会被电弧弹回（推回 `push` 格）并挨一记电击（arc）；笼内每 `interval` 也会劈落一次电击并
 * 有 `paralyzeChance` 概率麻痹（共享主异常 paralysis，会概率失手、减速）。它不钉住谁，但谁也别想从栅栏间走出去。
 * 与同族分开：
 *   雷电囚笼 —— 边界式围栏：只拦越界，越界即电；唯一的电属性、最重的一记。
 *   流沙地狱 —— 沉陷式，只吃贴地目标；火旋涡贴身跟随；潮旋锚定回拉。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   cage         初击威力 26 + 特攻偏移 + 等级偏移（特攻越高、等级越高电得越重）。
 *   arc          电击威力 14 + 特攻偏移 + 等级偏移（越界与每趟笼内电击共用）。
 *   duration     电笼持续 175 刻 + 特攻偏移 + 等级；广笼式 ×1.15。
 *   interval     笼内电击间隔 20 刻 − 速度偏移。
 *   radius       笼半径 1.6 格 + **目标体型宽度**偏移；广笼式 ×1.35。
 *   push         越界推回 0.6 格 + 特攻偏移（电栅把目标弹回笼内的距离）。
 *   bars         电栅根数 12 + 特攻 ×0.1，同时驱动画面里的笼柱数量。
 *   paralyzeChance 麻痹概率 0.18 + 特攻偏移；夹 0.08..0.45。
 *   speed        电矢速度 0.9 + 速度偏移。
 *   reach        射程 10 格 + 特攻偏移。
 *   charge       起手 9 刻 − 速度偏移。
 *
 * 配置 `wide`（广笼式）：开启＝笼半径 ×1.35、笼柱更多、持续 ×1.15、冷却 +8，但初击 ×0.9、电击 ×0.85，
 * 关得更宽更久；关闭＝更小更紧、电得更重。两向各有适用局面。
 *
 * 伤害段 `cage`（初击）与 `arc`（每趟电击）各自同名，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("thundercage", {
        /** 初击威力：26 + 特攻偏移[−10,18] + 等级(≥20)偏移[0,12]；广笼 ×0.9；夹 18..72。 */
        cage: formula(
            F.base(26)
                .plus(F.stat("specialAttack").minus(60).times(0.28).clamp(-10, 18))
                .plus(F.level().minus(20).times(0.3).clamp(0, 12))
                .times(F.when(F.pref("wide"), F.const(0.9), F.const(1)))
                .clamp(18, 72).round(1),
            "初击威力", {
                base: 26, unit: "威力",
                description: "电击命中那一下的基础威力；之后每趟电击按 `电击威力` 另算。对手防御、相性与暴击在命中时另算。"
            }),
        /** 电击威力：14 + 特攻偏移[−5,12] + 等级(≥20)偏移[0,8]；广笼 ×0.85；夹 8..34。 */
        arc: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-5, 12))
                .plus(F.level().minus(20).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1)))
                .clamp(8, 34).round(1),
            "电击威力", {
                base: 14, unit: "威力",
                description: "笼内每趟电击与越界电弧的基础威力。"
            }),
        /** 电笼持续：175 + 特攻偏移[−30,80] + 等级(≥30)偏移[0,30]；广笼 ×1.15；夹 100..300 刻。 */
        duration: seconds(
            F.base(175)
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-30, 80))
                .plus(F.level().minus(30).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("wide"), F.const(1.15), F.const(1)))
                .clamp(100, 300).round(0),
            "电笼持续", "电笼立多久；期间目标被围在笼内、越界就被电回。"),
        /** 电击间隔：20 − 速度偏移[−8,8]；夹 10..28 刻。 */
        interval: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8)).clamp(10, 28).round(0),
            "电击间隔", "笼内每隔多久劈一道电；速度越快电得越密。"),
        /** 笼半径：1.6 + 目标宽度偏移[−0.2,1.0]；广笼 ×1.35；夹 1.2..3.2 格。 */
        radius: formula(
            F.base(1.6)
                .plus(F.target("body.width").as("目标体型宽度").minus(0.9).times(0.7).clamp(-0.2, 1.0))
                .times(F.when(F.pref("wide"), F.const(1.35), F.const(1)))
                .clamp(1.2, 3.2).round(2),
            "笼半径", {
                base: 1.6, unit: "格",
                description: "电笼的半径，也是画面里那圈电栅的位置；目标越宽，笼子围得越大。"
            }),
        /** 越界推回：0.6 + 特攻偏移[−0.1,0.4]；夹 0.3..1.1 格。 */
        push: formula(
            F.base(0.6).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.1, 0.4)).clamp(0.3, 1.1).round(2),
            "越界推回", {
                base: 0.6, unit: "格",
                description: "目标越过电栅时被弹回笼内的距离；特攻越高，电弧弹得越狠。"
            }),
        /** 电栅根数：12 + 特攻 ×0.1；夹 8..28。同时驱动画面里的笼柱数量。 */
        bars: formula(
            F.base(12).plus(F.stat("specialAttack").times(0.1)).clamp(8, 28).round(0),
            "电栅根数", {
                base: 12, unit: "根",
                description: "围着目标的电栅根数；随特攻增长，也决定画面里竖起的电弧数量。"
            }),
        /** 麻痹概率：0.18 + 特攻偏移[−0.06,0.22]；夹 0.08..0.45。 */
        paralyzeChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).times(0.0035).clamp(-0.06, 0.22)).clamp(0.08, 0.45).round(4),
            "麻痹概率", "每趟电击把目标电到麻痹的概率；麻痹后按共享麻痹概率失手并减速。"),
        /** 电矢速度：0.9 + 速度偏移[−0.3,0.5]；夹 0.6..1.5 格/刻。 */
        speed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.3, 0.5)).clamp(0.6, 1.5).round(2),
            "电矢速度", {
                base: 0.9, unit: "格/刻",
                description: "甩出的电矢飞向目标的速度。"
            }),
        /** 射程：10 + 特攻偏移[−2,7]；夹 9..17 格。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-2, 7)).clamp(9, 17).round(1),
            "射程", {
                base: 10, unit: "格",
                description: "能把囚笼罩到多远的目标身上。"
            }),
        /** 起手：9 − 速度偏移[−2,3]；夹 6..13 刻。 */
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(6, 13).round(0),
            "起手", "把电聚成笼、对准目标的时间；速度越快起手越短。")
    });

    defineDamage("thundercage", "cage", {}, {});
    defineDamage("thundercage", "arc", {}, {});

    stages("thundercage", [
        { level: 30, values: { cage: 40, arc: 20, radius: 1.9 } }
    ]);

    describe("thundercage", [
        { key: "description.0", values: ["cage"] },
        { key: "description.1", values: ["duration","interval","arc","paralyzeChance"] },
        { key: "description.2", values: ["radius","reach","speed"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cage", "tier.0.radius"] }
    ]);
}
