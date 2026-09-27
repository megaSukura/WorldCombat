/**
 * 蛮力 / superpower 的参数与伤害段。本族「拆甲换力」的正面基准。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fighting／物理／威力 120／命中 100／PP 5／优先度 0／接触；
 *   self boosts { atk: -1, def: -1 }，无次要效果；target normal（单体）。169 位学习者。
 *   描述「发挥惊人的力量攻击对手。自己的攻击和防御会降低」。
 *
 * 翻译：把「用尽全力的一击、代价是自己松劲」翻成即时战斗里的一次**舍身突进**——沉肩扎马后沿锁定方向贴地
 *   短冲到真实首碰，撞中一记后重心散了，自身攻击与防御各降一级。只有撞中才付双降，撞墙或冲空只扬一蓬灰。
 *
 * 与同族分开：鳞射是远距多段、火焰鞭是长鞭剥对手甲、鳞片噪音是环身声爆；蛮力是**近身单体最重的一记**，
 *   并且是唯一让自身攻防一起下降的招式。玩家凭「贴身、一次、双降、坚持真实首碰」认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   ram        冲撞威力：物攻给力、身高给杠杆（压得更实）、等级拾级抬升。
 *   reach      冲距：速度决定起步多快、身高决定步幅，决定能冲多远（也是本招射程）。
 *   rush       冲速：速度决定每刻推进多少，快的个体冲刺更疾。
 *   girth      碰撞半径：体型宽高决定短冲时身体扫到多大的范围。
 *   jolt       撞飞：物攻给推力，**目标体重**把撞开距离压下来。
 *   attackLoss 自身攻击下降级：原生固定 1 级。
 *   guardLoss  自身防御下降级：原生 1 级。
 *   tempo/aftercast/recharge：速度定节奏。
 *
 * 落地为纯粹的单体舍身突进：一次真撞、命中后攻击与防御各降原生一级，没有范围选项。
 *
 * 伤害段 `ram` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const superpowerMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("superpower", {
        /** 冲撞威力：基础 120；物攻每比 60 多 1 加 0.9（夹 −26..60）；身高每比 1.4 高 1 格加 22（夹 −8..44）；
         *  等级每比 20 高 1 加 0.3（夹 0..24）；夹 85..235。 */
        ram: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.9).clamp(-26, 60))
                .plus(F.body("height").minus(1.4).times(22).clamp(-8, 44))
                .plus(F.level().minus(20).times(0.3).clamp(0, 24))
                .clamp(85, 235).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "贴地冲进对手怀里砸实的那一下；物攻给力、身高给压上去的杠杆，等级越高越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲距：基础 3.2 格；速度每比 55 快 1 加 0.012（夹 −0.3..0.9）；身高每比 1.4 高 1 格加 0.5（夹 −0.25..1.1）；夹 2.4..5.4。 */
        reach: formula(
            F.base(3.2)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.25, 1.1))
                .clamp(2.4, 5.4).round(2),
            "冲距", {
                unit: "格",
                description: "从起步到撞上对手能冲多远；快的个体起步早、高个子步幅大。它也是本招的实际射程与指示线长度。"
            }),
        /** 冲速：基础 0.5 格/刻；速度每比 55 快 1 加 0.004（夹 −0.1..0.35）；夹 0.3..1.0。 */
        rush: formula(
            F.base(0.5).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.35)).clamp(0.3, 1.0).round(2),
            "冲速", {
                unit: "格/刻",
                description: "冲刺时每刻推进的距离；速度快的个体更疾，越快贴上目标越难被走位甩掉。"
            }),
        /** 碰撞半径：基础 0.34 格；体型宽每比 0.9 宽 1 格加 0.4（夹 −0.06..0.5）；身高每比 1.4 高 1 格加 0.06（夹 0..0.12）；夹 0.3..1.0（原生 sweep 上限 1 格）。 */
        girth: formula(
            F.base(0.34)
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.06, 0.5))
                .plus(F.body("height").minus(1.4).times(0.06).clamp(0, 0.12))
                .clamp(0.3, 1.0).round(2),
            "碰撞半径", {
                unit: "格",
                description: "贴地冲撞时身体合并出的判定半径；体型越宽越高，扫到的第一条身体越容易撞上。原生 sweep 半径上限为 1 格。"
            }),
        /** 撞飞：基础 0.7 格；物攻每比 60 多 1 加 0.011（夹 −0.2..0.8）；目标体重每比 300hg 重 1hg 减 0.0007（最多减 0.7）；夹 0.25..2.0。 */
        jolt: formula(
            F.base(0.7).plus(F.stat("attack").minus(60).times(0.011).clamp(-0.2, 0.8))
                .minus(superpowerMassNode.minus(300).times(0.0007).clamp(0, 0.7))
                .clamp(0.25, 2.0).round(2),
            "撞飞", {
                unit: "格",
                description: "被这一记撞开多远；物攻越强推得越远，目标越重越推不动。"
            }),
        /** 自身攻击下降级：原生固定 1 级；夹 1..6。 */
        attackLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身攻击下降", {
                unit: "级",
                description: "舍身一击后自身攻击下降的能力等级；原生固定 1 级，是无法回避的代价。"
            }),
        /** 自身防御下降级：原生固定 1 级；夹 1..6。 */
        guardLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身防御下降", {
                unit: "级",
                description: "舍身一击后自身防御下降的能力等级；原生固定 1 级，是无法回避的代价。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；夹 7..17。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .clamp(7, 17).round(0),
            "起手", "沉肩扎马、把力气压进腿里的时间；速度越快越短。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 6..20。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5))
                .clamp(6, 20).round(0),
            "收招", "冲完把散掉的重心收回来、重新站稳的时间；快的个体更利落。"),
        /** 冷却：基础 40 刻；速度每比 55 快 1 减 0.08（夹 −4..8）；夹 28..64。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(55).times(0.08).clamp(-4, 8))
                .clamp(28, 64).round(0),
            "冷却", "两次舍身突进之间等待多久；快的个体回气更快。")
    });

    stages("superpower", [
        { level: 30, values: { ram: 132, jolt: 0.8 } },
        { level: 50, values: { ram: 150, reach: 4.0 } }
    ]);

    defineDamage("superpower", "ram", {}, { contact: true });

    describe("superpower", [
        { key: "description.0", values: ["ram","jolt"] },
        { key: "description.ground", values: [] },
        { key: "description.1", values: ["reach", "attackLoss", "guardLoss"] },
        { key: "description.2", values: ["tempo","rush"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram", "tier.0.jolt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.reach"] }
    ]);
}
