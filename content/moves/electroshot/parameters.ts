/**
 * 电光束 / electroshot —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Electric／特殊／威力 130／命中 100／PP 10／优先度 0／非接触／flags charge。
 * 第 1 回合收集电力提高特攻，第 2 回合发射高压电力；下雨天气时立即发射（且提升照常结算）。
 *
 * 翻译：把「聚电→放」翻成一束笔直飞出的高压电矛。提交前站在地上把电荷从四周抽进身体（可被打断，打断不花 PP），
 *   `charge` 由天气与速度决定——下雨时直接从雨里取电，当场发射。提交后先结算特攻 +1，
 *   再射出一束会朝目标修正（homing）的高速电矛，命中处补一道纯视觉闪电（world.lightning 的 visualOnly）。
 *
 * 数据分散（每个参数取不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   lance   电矛威力：特攻定电压、等级定稳定；追踪形态 ×0.9、直射形态 ×1.15。
 *   charge  聚电时间：速度决定收束快慢；下雨直接为 0（原生规则）。
 *   boost   特攻提升：固定 1 级（原生规则）。
 *   velocity 电矛速度：速度定初速；追踪形态略慢、直射形态更快。
 *   homing  修正转向：特攻与配置共同决定，追踪形态拉得动、直射形态几乎不拐。
 *   reach   射程：特攻决定电矛能追多远。
 *   radius  判定半径：碰撞箱高度决定电矛多粗。
 *   arcs    电弧数：特攻与当前雨量，驱动表现的密度。
 *
 * 配置 `chase`（追踪）双向取舍：开启＝转向更强（×1.6）、射程更远，但单发威力 ×0.9、飞行略慢，
 *   目标走位更难摆脱；关闭＝直射更快更重（×1.15 威力），但几乎不修正，容易被侧移躲开。
 *
 * 伤害段 `lance`：电矛命中那一下，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("electroshot", {
        /** 电矛威力：130 + (特攻−60)×1.05（夹 −32..76）+ (等级−24)×0.4（夹 0..24）；追踪 ×0.9、直射 ×1.15；夹 72..250。 */
        lance: formula(
            F.base(130)
                .plus(F.stat("specialAttack").minus(60).times(1.05).clamp(-32, 76))
                .plus(F.level().minus(24).times(0.4).clamp(0, 24))
                .times(F.when(F.pref("chase", text("worldcombat.skill.electroshot.preference.chase")), F.const(0.9), F.const(1.15)))
                .clamp(72, 250).round(1),
            "电矛威力", { base: 130,
                unit: "威力",
                description: "电矛命中那一下的基础威力；特攻越高电压越高。追踪形态略轻、直射形态更重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 聚电时间：28 − (速度−50)×0.06（夹 0..14）刻；下雨直接为 0；夹 0..28 刻。 */
        charge: seconds(
            F.when(F.world("rain", text("worldcombat.skill.electroshot.value.rain")).gte(0.35),
                F.const(0),
                F.base(28).minus(F.stat("speed").minus(50).times(0.06).clamp(0, 14)))
                .clamp(0, 28).round(0),
            "聚电时间", "站定把电从四周抽进身体的时间；下雨时直接从雨里取电、当场发射（原生规则），速度快的收束更快。"),
        /** 特攻提升：固定 1 级（原生规则）。 */
        boost: formula(
            F.base(1).clamp(1, 1).round(0),
            "特攻提升", {
                unit: "级",
                description: "聚电完成时提升的特攻能力等级（原生 +1）；雨里立刻发射时同样结算。"
            }),
        /** 电矛速度：2.1 + (速度−50)×0.008（夹 −0.3..0.7）；追踪 ×0.92、直射 ×1.1；夹 1.4..3.2 格/刻。 */
        velocity: formula(
            F.base(2.1).plus(F.stat("speed").minus(50).times(0.008).clamp(-0.3, 0.7))
                .times(F.when(F.pref("chase", text("worldcombat.skill.electroshot.preference.chase")), F.const(0.92), F.const(1.1)))
                .clamp(1.4, 3.2).round(2),
            "电矛速度", {
                unit: "格/刻",
                description: "电矛飞行的速度；速度快的个体放得更急。直射形态更快，追踪形态略慢一点。"
            }),
        /** 修正转向：7 + (特攻−60)×0.06（夹 −2..6）；追踪 ×1.6、直射 ×0.35；夹 2..18。 */
        homing: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-2, 6))
                .times(F.when(F.pref("chase", text("worldcombat.skill.electroshot.preference.chase")), F.const(1.6), F.const(0.35)))
                .clamp(2, 18).round(0),
            "修正转向", {
                unit: "",
                description: "电矛每刻朝目标修正的转向强度；特攻越高瞄得越稳，追踪形态几乎甩不掉，直射形态几乎不拐。"
            }),
        /** 射程：15 + (特攻−60)×0.05（夹 −2..5）；追踪 ×1.15；夹 11..24 格。 */
        reach: formula(
            F.base(15).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 5))
                .times(F.when(F.pref("chase", text("worldcombat.skill.electroshot.preference.chase")), F.const(1.15), F.const(1)))
                .clamp(11, 24).round(1),
            "射程", {
                unit: "格",
                description: "电矛能飞多远；特攻高、追踪形态飞得更远。它驱动本招的实际目标接受范围。"
            }),
        /** 判定半径：0.26 + (碰撞箱高度−1.4)×0.07；夹 0.2..0.45 格。 */
        radius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).times(0.07)).clamp(0.2, 0.45).round(2),
            "判定半径", {
                unit: "格",
                description: "电矛飞行途中的判定半径；体型越大电矛越粗，越不容易被侧移让开。"
            }),
        /** 电弧数：14 + (特攻−60)×0.25（夹 −5..16）+ 雨量×20（夹 0..20）；夹 12..52 道。 */
        arcs: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-5, 16))
                .plus(F.world("rain", text("worldcombat.skill.electroshot.value.rain")).times(20).clamp(0, 20))
                .clamp(12, 52).round(0),
            "电弧数", {
                unit: "道",
                description: "聚电与命中时迸出的电弧数，也驱动画面密度；特攻越高、雨越大越密。"
            })
    });

    defineDamage("electroshot", "lance", { defenceCoefficient: 0.005, rationale: "高压电矛对特殊防御压制略强，让特攻差距在场上更明显。" }, {});

    stages("electroshot", [
        { level: 36, values: { lance: 128 } },
        { level: 58, values: { lance: 148 } },
        { level: 72, values: { cooldown: 38 } }
    ]);

    describe("electroshot", [
        { key: "description.0", values: ["lance"] },
        { key: "description.1", values: ["charge", "boost"] },
        { key: "description.2", values: ["velocity", "reach", "radius"] },
        { key: "description.3", values: ["homing", "arcs"] },
        { key: "stance.chase", values: [], when: function (context) { return !!read(context.detail.values, ["chase"]); } },
        { key: "stance.direct", values: [], when: function (context) { return !read(context.detail.values, ["chase"]); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"], when: function (context) { return context.pokemon.level() >= 36; } },
        { key: "growth.1", values: ["tier.1.level"], when: function (context) { return context.pokemon.level() >= 58; } },
        { key: "growth.2", values: ["tier.2.level", "tier.2.cooldown"], when: function (context) { return context.pokemon.level() >= 72; } }
    ]);
}
