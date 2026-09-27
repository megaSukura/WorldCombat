/**
 * 鳞片噪音 / clangingscales 的参数与伤害段。本族「拆甲换力」的环身声爆型。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Dragon／特殊／威力 110／命中 100／PP 5／优先度 0；
 *   flags 带 sound（声音招式）与 bypasssub；`selfBoost: { def: -1 }`；无次要效果；target allAdjacentFoes（自己周围所有敌人）。
 *   描述「摩擦全身鳞片，发出响亮的声音进行攻击。攻击后自己的防御会降低」。1 位学习者。
 *
 * 翻译：把「擦响鳞片、巨响伤敌、自己防御下降」翻成一记**擦身成钟**——把全身鳞片绷紧摩擦，一圈声波从身体
 *   炸开，震伤身周所有敌人并把它们沿离中心方向推开；响声过后鳞片松了，自身防御下降。它不看地面、
 *   没有飞行物，声压就是它的形状；是龙属性的巨响，与普通属性的爆音波不同。
 *
 * 与同族分开：蛮力是近身单体最重、鳞射是远距多段提速、火焰鞭是剥对手甲；
 *   鳞片噪音是**唯一环身范围**的招式，代价同样是自身的防御等级。一次巨响，没有第二圈。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   clang      声爆威力：特攻给共鸣强度、身高给共鸣腔体、等级拾级抬升。
 *   ringRadius 波及半径：身高与等级决定声波罩住多大一圈（也是本招射程与指示圈）。
 *   shock      震退：特攻与身高给冲量，**目标体重**把推开距离压下来。
 *   guardLoss  自身防御下降级：原生 1 级。
 *   tempo/aftercast/recharge：速度定节奏。
 *
 * 伤害段 `clang` 与参数同名，走共享换算（原始类别 Special）；sound 标记由本单元声明，让原生声音相关规则参与。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const clangingscalesMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("clangingscales", {
        /** 声爆威力：基础 110；特攻每比 60 多 1 加 0.5（夹 −20..60）；身高每比 1.4 高 1 格加 18（夹 −6..40）；
         *  等级每比 25 多 1 加 0.25（夹 0..14）；夹 90..250。 */
        clang: formula(
            F.base(110)
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-20, 60))
                .plus(F.body("height").minus(1.4).times(18).clamp(-6, 40))
                .plus(F.level().minus(25).times(0.25).clamp(0, 14))
                .clamp(90, 250).round(1),
            "声爆威力", {
                unit: "威力",
                description: "一圈声波对每个敌人结算的基础威力；特攻越高共鸣越强、体型越大腔体越响，等级越高越整。对手特防、相性与暴击在命中时另算。"
            }),
        /** 波及半径：基础 4.6 格；身高每比 1.4 高 1 格加 0.9（夹 −0.35..1.5）；等级每比 25 多 1 加 0.04（夹 0..1.4）；夹 3.0..7.4。 */
        ringRadius: formula(
            F.base(4.6)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.35, 1.5))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.4))
                .clamp(3.0, 7.4).round(2),
            "波及半径", {
                unit: "格", description: "声波从身体罩住身周多大一圈（空中地面一起算）；体型高、等级高的个体震得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 震退：基础 0.55 格；特攻每比 60 多 1 加 0.006（夹 −0.15..0.6）；身高每比 1.4 高 1 格加 0.05（夹 0..0.3）；
         *  目标体重每比 300hg 重 1hg 减 0.0007（最多减 0.6）；夹 0.2..1.5。 */
        shock: formula(
            F.base(0.55).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.6))
                .plus(F.body("height").minus(1.4).times(0.05).clamp(0, 0.3))
                .minus(clangingscalesMassNode.minus(300).times(0.0007).clamp(0, 0.6))
                .clamp(0.2, 1.5).round(2),
            "震退", {
                unit: "格", description: "被声波震中的人沿离中心方向被推开多远；特攻与身高越强推得越远，目标越重越推不动。"
            }),
        /** 自身防御下降级：原生 1 级；夹 1..6。 */
        guardLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身防御下降", {
                unit: "级", description: "巨响过后自身防御下降的能力等级；原生 1 级。已经到最低一档或不被允许时不会更强，浮字按实际变化显示。"
            }),
        /** 起手：基础 14 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；夹 8..20。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .clamp(8, 20).round(0),
            "起手", "把全身鳞片绷紧、嗡鸣起来的时间；速度越快越短。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 6..20。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5))
                .clamp(6, 20).round(0),
            "收招", "响完后让鳞片松弛、站稳的时间；速度越快越利落。"),
        /** 冷却：基础 44 刻；速度每比 55 快 1 减 0.08（夹 −4..8）；夹 30..70。 */
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(55).times(0.08).clamp(-4, 8))
                .clamp(30, 70).round(0),
            "冷却", "再擦响一次鳞片之前等待多久。")
    });

    stages("clangingscales", [
        { level: 45, values: { clang: 128 } },
        { level: 62, values: { clang: 142, ringRadius: 5.4 } }
    ]);

    defineDamage("clangingscales", "clang", {}, { sound: true });

    describe("clangingscales", [
        { key: "description.0", values: ["clang","ringRadius"] },
        { key: "description.1", values: ["shock","guardLoss"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.clang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.clang", "tier.1.ringRadius"] }
    ]);
}
