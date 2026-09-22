/**
 * 蓄能焰袭 / flamecharge 的参数与数值来源。
 *
 * 原生事实：火、物理、威力 50、命中 100、PP 20、接触；命中后自身速度 +1（100%）。
 * 翻译：把「让火焰覆盖全身攻击对手、积蓄力量提高速度」翻成一次**裹火直线的蓄能冲锋**——
 * 起手把火焰收拢到全身、越跑越旺，低头沿直线撞过去；撞中后借着这股动量把自己的速度再抬一级。
 * 全身湿透的个体火焰打折扣（`F.state("wet")`），这是「当前处境」进入公式的一条。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   rush    冲锋威力：物攻与速度共同打底；贯穿式把力摊薄、湿身再打折。
 *   through 贯穿占比：后续目标吃到的比例，随物攻微调。
 *   sprint  冲锋距离：速度偏移；起步快的人一口气冲得更远。
 *   pace    每刻位移：速度偏移。
 *   cloak   火焰包身半径（判定半径）：碰撞箱高度偏移。
 *   haste   提速级数：等级 58 起 +1。
 *   push    击退：速度偏移。
 *   heat    火星数量：速度与威力派生，表现按它发射。
 *   flare/recover/trail 起手吃速度、收招固定、冷却固定（PP 20 的代价）。
 *
 * 配置 `pierce`（贯穿）：开启＝撞穿第一个目标并沿路把所有人都点着，但单体略轻、冷却更长；
 * 关闭＝在第一个目标身上停下，单体更重更快。两个方向对应清场与点杀。
 */
namespace PokemonSkills {
    actionParameters.define("flamecharge", {
        /** 冲锋威力：基础 50，物攻每比 60 多 1 加 0.14（夹 -18..32），速度每比 60 快 1 加 0.08（夹 -12..20）；贯穿 ×0.9，湿身 ×0.85。 */
        rush: formula(
            F.base(50).plus(F.stat("attack").minus(60).times(0.14).clamp(-18, 32))
                .plus(F.stat("speed").minus(60).times(0.08).clamp(-12, 20))
                .times(F.when(F.pref("pierce", text("worldcombat.skill.flamecharge.preference.pierce")), F.const(0.9), F.const(1)))
                .times(F.when(F.state("wet", text("worldcombat.skill.flamecharge.value.soaked")), F.const(0.85), F.const(1)))
                .clamp(30, 96).round(1),
            "冲锋威力", {
                unit: "威力",
                description: "撞上去那一下的威力；物攻越重、起步越快越猛。贯穿式把力摊薄，全身湿透时火焰打折。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贯穿占比：基础 0.7，物攻每比 60 多 1 加 0.001，夹 0.55..0.85。 */
        through: percent(
            F.base(0.7).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.1, 0.15)).clamp(0.55, 0.85),
            "贯穿占比", "贯穿式里，第一个目标之后的人吃到的威力比例。"),
        /** 冲锋距离：基础 3.6 格，速度每比 60 快 1 加 0.02，夹 2.8..5.2。 */
        sprint: formula(
            F.base(3.6).plus(F.stat("speed").minus(60).times(0.02)).clamp(2.8, 5.2).round(2),
            "冲锋距离", {
                unit: "格",
                description: "一口气冲出的距离；腿快的个体够得到更远的对手。它同时是本招的射程基准。"
            }),
        /** 每刻位移：基础 1.05 格/刻，速度每比 60 快 1 加 0.006，夹 0.85..1.6。 */
        pace: formula(
            F.base(1.05).plus(F.stat("speed").minus(60).times(0.006)).clamp(0.85, 1.6).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "冲锋时每刻移动的距离；越快越难被侧移躲开。"
            }),
        /** 火焰半径：基础 0.55 格，碰撞箱每比 1.4 高 1 格加 0.12，夹 0.45..0.95。 */
        cloak: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.45, 0.95).round(2),
            "火焰半径", {
                unit: "格",
                description: "裹在全身的火焰半径，也是本招的横向判定半径；身板越大包得越开。"
            }),
        /** 提速级数：等级 58 台阶 +1，夹 1..2。 */
        haste: formula(F.base(1).clamp(1, 2).round(0), "提速级数", {
            unit: "级",
            description: "命中后提高的速度等级；撞中的动量顺着这一级发出来。脱战后同样消退。"
        }),
        /** 击退：基础 0.3 格，速度每比 60 快 1 加 0.003，夹 0.2..0.6。 */
        push: formula(
            F.base(0.3).plus(F.stat("speed").minus(60).times(0.003)).clamp(0.2, 0.6).round(2),
            "击退", {
                unit: "格",
                description: "撞中后把目标带开的方向偏移；冲得快的个体推得更远。"
            }),
        /** 火星数量：基础 20，速度每比 60 快 1 加 0.4（夹 -8..24），物攻每比 60 多 1 加 0.2（夹 -6..10），夹 16..64。 */
        heat: formula(
            F.base(20).plus(F.stat("speed").minus(60).times(0.4).clamp(-8, 24))
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-6, 10)).clamp(16, 64).round(0),
            "火星数量", {
                unit: "个",
                description: "冲锋与命中扬起的火星数量，随速度与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 9 刻，速度每比 60 快 1 少 0.02，夹 6..12。 */
        flare: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02)).clamp(6, 12).round(0),
            "起手", "把火焰收拢到全身、压低身形的时长；速度越快越干脆。"),
        recover: seconds(F.base(8).round(0), "收招", "冲锋后的收势。"),
        trail: seconds(F.base(44).round(0), "冷却", "再次冲锋前的间隔；PP 20 的代价。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    /** 火星数量公式里把「本次冲锋威力」作为一个可读项：内部量，不进配置。 */
    defineFacts("flamecharge", function (context) {
        return { read: function (id: string) { return undefined; } };
    });

    defineDamage("flamecharge", "rush", {}, { contact: true });

    stages("flamecharge", [
        { level: 40, values: { rush: 62 } },
        { level: 58, values: { rush: 74, haste: 2 } }
    ]);

    describe("flamecharge", [
        { key: "description.0", values: ["rush", "sprint", "pace"] },
        { key: "description.1", values: ["through", "haste", "push", "cloak", "heat"] },
        { key: "pierce.on", values: [], when: function (context) { return read(context.detail.values, ["pierce"]) === true; } },
        { key: "pierce.off", values: [], when: function (context) { return read(context.detail.values, ["pierce"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rush", "tier.1.haste"] }
    ]);
}
