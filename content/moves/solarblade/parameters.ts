/**
 * 日光刃 / solarblade —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Grass／物理／威力 125／命中 100／PP 10／优先度 0／接触／slicing／flags charge。
 * 第 1 回合收集日光，第 2 回合把力量集中在剑上攻击；强日光下立即出手；雨／沙暴／冰雹／雪中威力减半。
 *
 * 翻译：把「聚光成刃→斩」翻成一记贴身的突进横斩。提交前站在原地把日光在身侧凝成刀（可被打断，打断不花 PP），
 *   `charge` 由世界日光与速度决定——强日光直接跳过凝刃、当场斩出。提交后先向前突进 `dash` 格，
 *   再以自身为顶点朝目标方向扫出 `arc` 度的扇形，扇形内每个非友方各挨一记接触伤害并沿刀势推开。
 *
 * 数据分散（每个参数取不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   slash 斩击威力：攻击定分量、速度定刀势、等级定掌握；突刺形态 ×1.25、横扫 ×0.9；雨里 ×0.5（取自原生）。
 *   reach 斩击半径：碰撞箱高度决定刀锋够到多远；突刺略长。
 *   arc   张开角度：碰撞箱高度决定挥幅；突刺收成一条窄线、横扫铺得更开。
 *   dash  突进距离：速度决定这一步冲多远；突刺冲得更远、横扫更短。
 *   charge 凝刃时间：速度决定收束快慢；强日光直接为 0。
 *   blade 刃光点数：日光与攻击，驱动表现的密度。
 *   push  命中推开：攻击越高推得越远。
 *
 * 配置 `thrust`（突刺）双向取舍：开启＝突进更远（×1.5）、斩击更重（×1.25）、刀锋略长，但扇形收成窄线（×0.42）、
 * 只能砍到一条线上的目标，收招多 1 刻；关闭＝横扫铺开（×1.25 角度），一次扫到挤在面前的一排，但单发更轻、冲得更短。
 *
 * 伤害段 `slash`：刀锋扫过每个目标那一下，走共享换算（原生类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("solarblade", {
        /** 斩击威力：125 + (攻击−60)×0.8（夹 −24..64）+ (速度−50)×0.35（夹 −12..28）+ (等级−24)×0.4（夹 0..22）；突刺 ×1.25、横扫 ×0.9；雨天 ×0.5；夹 60..250。 */
        slash: formula(
            F.base(125)
                .plus(F.stat("attack").minus(60).times(0.8).clamp(-24, 64))
                .plus(F.stat("speed").minus(50).times(0.35).clamp(-12, 28))
                .plus(F.level().minus(24).times(0.4).clamp(0, 22))
                .times(F.when(F.pref("thrust", text("worldcombat.skill.solarblade.preference.thrust")), F.const(1.25), F.const(0.9)))
                .times(F.when(F.world("rain", text("worldcombat.skill.solarblade.value.rain")).gte(0.35), F.const(0.5), F.const(1)))
                .clamp(60, 250).round(1),
            "斩击威力", { base: 125,
                unit: "威力",
                description: "刀锋扫过每个目标的基础威力；攻击与速度越高越重。突刺形态更集中，横扫会摊薄单发，阴雨天再折半。对手防御、相性与暴击在命中时另算。"
            }),
        /** 斩击半径：3.2 + (碰撞箱高度−1.4)×0.35；突刺 ×1.15；夹 2.4..5.4 格。 */
        reach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(0.35))
                .times(F.when(F.pref("thrust", text("worldcombat.skill.solarblade.preference.thrust")), F.const(1.15), F.const(1)))
                .clamp(2.4, 5.4).round(2),
            "斩击半径", {
                unit: "格",
                description: "刀锋从突进终点向外够到多远；身板越大刀越长。它驱动本招的实际目标接受范围。"
            }),
        /** 张开角度：120 + (碰撞箱高度−1.4)×16；突刺 ×0.42、横扫 ×1.25；夹 34..190 度。 */
        arc: formula(
            F.base(120).plus(F.body("height").minus(1.4).times(16))
                .times(F.when(F.pref("thrust", text("worldcombat.skill.solarblade.preference.thrust")), F.const(0.42), F.const(1.25)))
                .clamp(34, 190).round(0),
            "张开角度", {
                unit: "度",
                description: "这一刀扫开的扇面角度；身板越大扫得越开，横扫形态能一次覆盖更多人，突刺收成一条窄线。"
            }),
        /** 突进距离：0.7 + (速度−50)×0.012（夹 0..1.3）；突刺 ×1.5、横扫 ×0.75；夹 0.4..2.4 格。 */
        dash: formula(
            F.base(0.7).plus(F.stat("speed").minus(50).times(0.012).clamp(0, 1.3))
                .times(F.when(F.pref("thrust", text("worldcombat.skill.solarblade.preference.thrust")), F.const(1.5), F.const(0.75)))
                .clamp(0.4, 2.4).round(2),
            "突进距离", {
                unit: "格",
                description: "凝刃之后向前踏出的距离；速度越快冲得越远，突刺形态把这一步拉得更长。"
            }),
        /** 凝刃时间：22 − (速度−50)×0.05（夹 0..12）刻；强日光直接为 0；夹 0..22 刻。 */
        charge: seconds(
            F.when(F.world("sunlight", text("worldcombat.skill.solarblade.value.sunlight")).gte(0.85),
                F.const(0),
                F.base(22).minus(F.stat("speed").minus(50).times(0.05).clamp(0, 12)))
                .clamp(0, 22).round(0),
            "凝刃时间", "站定把日光聚到身侧成刃的时间；强日光下直接跳过、当场斩出，速度快的收束更快。"),
        /** 刃光点数：12 + 日光×22 + (攻击−60)×0.12；夹 10..46 缕。 */
        blade: formula(
            F.base(12)
                .plus(F.world("sunlight", text("worldcombat.skill.solarblade.value.sunlight")).times(22))
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 10))
                .clamp(10, 46).round(0),
            "刃光点数", {
                unit: "缕",
                description: "凝刃与挥斩时迸出的光缕数，也驱动画面密度；日光越强、攻击越高越密。"
            }),
        /** 命中推开：0.25 + (攻击−60)×0.004（夹 0..0.4）；夹 0.15..0.7 格。 */
        push: formula(
            F.base(0.25).plus(F.stat("attack").minus(60).times(0.004).clamp(0, 0.4)).clamp(0.15, 0.7).round(2),
            "命中推开", {
                unit: "格",
                description: "被刀锋扫到时沿刀势推开的距离；攻击越高推得越远。"
            })
    });

    defineDamage("solarblade", "slash", { defenceCoefficient: 0.0054, rationale: "贴身的日光刃对防御压制略强，让攻击与速度的差距在场上更明显。" }, { contact: true, slice: true });

    stages("solarblade", [
        { level: 40, values: { slash: 100 } },
        { level: 60, values: { slash: 120 } },
        { level: 72, values: { cooldown: 36 } }
    ]);

    describe("solarblade", [
        { key: "description.0", values: ["slash"] },
        { key: "description.1", values: ["reach", "arc", "dash"] },
        { key: "description.2", values: ["charge", "push"] },
        { key: "stance.thrust", values: [], when: function (context) { return !!read(context.detail.values, ["thrust"]); } },
        { key: "stance.sweep", values: [], when: function (context) { return !read(context.detail.values, ["thrust"]); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"], when: function (context) { return context.pokemon.level() >= 40; } },
        { key: "growth.1", values: ["tier.1.level"], when: function (context) { return context.pokemon.level() >= 60; } },
        { key: "growth.2", values: ["tier.2.level", "tier.2.cooldown"], when: function (context) { return context.pokemon.level() >= 72; } }
    ]);
}
