/**
 * 流水旋舞 / aquastep 的参数与数值来源。
 *
 * 原生事实：水、物理、威力 80、命中 100、PP 10、接触、舞蹈（dance）；命中后自身速度 +1（100%）。
 * 翻译：把「以盈盈欲滴的轻快步伐戏耍对手并给予伤害、提高速度」翻成一支**绕着对手跳的水舞**——
 * 以几拍碎步在目标身边点踏、把它逗得转圈，最后旋身一击；踩在雨中步伐更盛（`F.world("rain")`）。
 *
 * 数值分散（每项依赖不同的精灵数据或现场事实）：
 *   spin   旋舞威力：物攻与速度共同打底；下雨时水面助力。
 *   steps  舞步数：基础 3，下雨时 +1，夹 2..4 拍。
 *   stride 每拍步伐距离：速度偏移。
 *   beat   拍子间隔：速度偏移，越快拍越急。
 *   reach  旋舞半径（判定半径）：碰撞箱高度偏移。
 *   spread 外围占比：非选定目标吃到的比例，随物攻微调。
 *   haste  提速级数：等级 60 起 +1。
 *   push   击退：速度偏移。
 *   splash 水花数量：速度与雨量派生，表现按它发射。
 *   bow/recover/cooldown 起手吃速度、收招固定、冷却固定（PP 10 的代价）。
 *
 * 配置 `twirl`（旋身）：开启＝几拍绕到目标背后收势，站位更刁；关闭＝在正面左右点踏，收得更快、更安全。
 */
namespace PokemonSkills {
    actionParameters.define("aquastep", {
        /** 旋舞威力：基础 80，物攻每比 60 多 1 加 0.13（夹 -20..28），速度每比 60 快 1 加 0.08（夹 -12..20）；下雨 ×(1+雨量×0.15)。 */
        spin: formula(
            F.base(80).plus(F.stat("attack").minus(60).times(0.13).clamp(-20, 28))
                .plus(F.stat("speed").minus(60).times(0.08).clamp(-12, 20))
                .times(F.const(1).plus(F.world("rain", text("worldcombat.skill.aquastep.value.rain")).times(0.15)))
                .clamp(52, 140).round(1),
            "旋舞威力", {
                unit: "威力",
                description: "最后旋身那一下的威力；物攻越重、拍子越快越猛，下雨时水面助力。对手防御、相性与暴击在命中时另算。"
            }),
        /** 舞步数：基础 3，下雨时 +1，夹 2..4。 */
        steps: formula(
            F.base(3).plus(F.when(F.world("rain", text("worldcombat.skill.aquastep.value.rain")).gte(0.2), F.const(1), F.const(0))).clamp(2, 4).round(0),
            "舞步数", {
                unit: "拍",
                description: "绕对手点踏几拍再收势；雨里水花更盛，多跳一拍。拍数越多绕得越开、出手越久。"
            }),
        /** 每拍步伐距离：基础 1.6 格，速度每比 60 快 1 加 0.012，夹 1.2..2.4。 */
        stride: formula(
            F.base(1.6).plus(F.stat("speed").minus(60).times(0.012)).clamp(1.2, 2.4).round(2),
            "步伐距离", {
                unit: "格",
                description: "每一拍迈出多远；腿快的个体绕得更开、把对手逗得更远。"
            }),
        /** 拍子间隔：基础 5 刻，速度每比 60 快 1 少 0.005，夹 3..6。 */
        beat: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.005)).clamp(3, 6).round(0),
            "拍子", "两拍之间隔多久；越快踩得越急。"),
        /** 旋舞半径：基础 1.8 格，碰撞箱每比 1.4 高 1 格加 0.3，夹 1.5..2.8。 */
        reach: formula(
            F.base(1.8).plus(F.body("height").minus(1.4).times(0.3)).clamp(1.5, 2.8).round(2),
            "旋舞半径", {
                unit: "格",
                description: "最后旋身扫到的半径，也是本招的判定半径；身板越大旋得越开。步伐距离会被收在它之内，保证目标在圈里。"
            }),
        /** 外围占比：基础 0.6，物攻每比 60 多 1 加 0.001，夹 0.45..0.75。 */
        spread: percent(
            F.base(0.6).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.15, 0.15)).clamp(0.45, 0.75),
            "外围占比", "旋身扫到、但不选定目标的人吃到的威力比例。"),
        /** 提速级数：等级 60 台阶 +1，夹 1..2。 */
        haste: formula(F.base(1).clamp(1, 2).round(0), "提速级数", {
            unit: "级",
            description: "命中后提高的速度等级；轻快的步伐顺着这一级发出来。脱战后同样消退。"
        }),
        /** 击退：基础 0.25 格，速度每比 60 快 1 加 0.003，夹 0.15..0.55。 */
        push: formula(
            F.base(0.25).plus(F.stat("speed").minus(60).times(0.003)).clamp(0.15, 0.55).round(2),
            "击退", {
                unit: "格",
                description: "旋身扫中后把目标带开的方向偏移。"
            }),
        /** 水花数量：基础 22，速度每比 60 快 1 加 0.4，再加雨量 15，夹 16..60。 */
        splash: formula(
            F.base(22).plus(F.stat("speed").minus(60).times(0.4).clamp(-8, 22))
                .plus(F.world("rain", text("worldcombat.skill.aquastep.value.rain")).times(15)).clamp(16, 60).round(0),
            "水花数量", {
                unit: "点",
                description: "每一拍与旋身激起的水花数量，随速度与雨量增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02，夹 5..9。 */
        bow: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 9).round(0),
            "起手", "屈膝行礼、水花绕脚的时长；速度越快越干脆。"),
        recover: seconds(F.base(7).round(0), "收招", "旋身后的收势。"),
        cooldown: seconds(F.base(46).round(0), "冷却", "再起一支舞前的间隔；PP 10 的代价。")
    });

    defineDamage("aquastep", "spin", {}, { contact: true });

    stages("aquastep", [
        { level: 42, values: { spin: 92 } },
        { level: 60, values: { spin: 106, haste: 2 } }
    ]);

    describe("aquastep", [
        { key: "description.0", values: ["spin", "steps", "stride", "beat"] },
        { key: "description.1", values: ["reach", "spread", "haste", "push", "splash"] },
        { key: "twirl.on", values: [], when: function (context) { return read(context.detail.values, ["twirl"]) === true; } },
        { key: "twirl.off", values: [], when: function (context) { return read(context.detail.values, ["twirl"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spin"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spin", "tier.1.haste"] }
    ]);
}
