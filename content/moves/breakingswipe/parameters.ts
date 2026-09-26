/**
 * 广域破坏 / breakingswipe —— 参数与伤害段。本组「卸力一击」的扫场成员。
 *
 * 原生事实：Dragon／物理／威力 60／命中 100／PP 15／接触／allAdjacentFoes（周围所有敌人）；
 *   命中后 100% 使目标攻击下降 1 级（secondary.boosts.atk -1）。描述「用坚韧的尾巴猛扫对手进行攻击，
 *   从而降低对手的攻击。」（Cobblemon 1.8）。
 *
 * 翻译：把「用坚韧的尾巴猛扫」落成**从一侧扫向另一侧的一道宽弧**——身子不动，尾巴沿地面扫过一片扇形，
 *   尾巴扫到谁、谁才挨那一下：被掀开、各降一级攻击，不做地形改动。它是本组唯一一次能同时压低多人的一记，
 *   单体最轻；同族凭「向前重撞 / 原地宽扫 / 隔空怨念 / 低平侧踢」分开。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   sweep  扫击威力：**物攻**给扫的狠度，等级定发力；广域式 ×0.85 / 聚扫式 ×1.12。
 *   arc    扇形张角：**体宽**决定尾扫多开；广域式直接抬到 235°。它就是画面里那道扇形的角。
 *   radius 扫击半径：**体宽与身高**决定够到多远；广域式 ×1.12。它也是本招的实际射程。
 *   push   撞开距离：物攻派生，沿离心方向掀开。
 *   scales 龙鳞碎屑数：物攻与等级派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；广域式更慢更费。
 *
 * 配置 `wide`（广域式，默认关）双向取舍：开＝张角 235°、半径 ×1.12，一次罩住一片人，代价是威力 ×0.85、
 *   起手 +2、冷却 +8 刻；关（聚扫式）＝张角按体型、威力 ×1.12，打得更重但只扫到身前一道。
 *
 * 伤害段 `sweep` 与参数同名，标 contact（原生接触）。
 */
namespace PokemonSkills {
    actionParameters.define("breakingswipe", {
        /** 扫击威力：基础 58；物攻每比 60 多 1 加 0.26（夹 −12..32）；等级每比 30 高 1 加 0.3（夹 −4..10）；
         *  广域 ×0.85 / 聚扫 ×1.12；夹 34..120。 */
        sweep: formula(
            F.base(58)
                .plus(F.stat("attack").minus(60).times(0.26).clamp(-12, 32))
                .plus(F.level().minus(30).times(0.3).clamp(-4, 10))
                .times(F.when(F.pref("wide", text("worldcombat.skill.breakingswipe.preference.wide")), F.const(0.85), F.const(1.12)))
                .clamp(34, 120).round(1),
            "扫击威力", {
                unit: "威力",
                description: "尾巴扫中每个人时各结算一次的基础威力；物攻越高扫得越狠，等级越高发力越整。广域式把力摊到一大片人身上所以单发更轻，聚扫式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扇形张角：广域式固定 235°；聚扫式 130° + 体宽偏移[−20,60]（夹 90..190）；总夹 80..260。 */
        arc: formula(
            F.when(F.pref("wide", text("worldcombat.skill.breakingswipe.preference.wide")), F.const(235),
                F.base(130).plus(F.body("width").minus(0.9).times(70).clamp(-20, 60)).clamp(90, 190))
                .clamp(80, 260).round(0),
            "扇形张角", {
                unit: "°",
                description: "尾巴沿地面扫过多大一片扇形，扇里的敌人都会被扫到；身板越宽的个体聚扫时扫得更开，广域式直接拉到 235°。"
            }),
        /** 扫击半径：基础 3.0 + 体宽偏移[−0.3,1.2] + 身高偏移[−0.1,0.5]；广域 ×1.12；夹 2.2..5.0。 */
        radius: formula(
            F.base(3.0)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.3, 1.2))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.breakingswipe.preference.wide")), F.const(1.12), F.const(1)))
                .clamp(2.2, 5.0).round(2),
            "扫击半径", {
                unit: "格",
                description: "尾巴从身子够到多远；体宽与身高决定扫幅，广域式再放大一成。它也是本招的实际射程与扇形半径。"
            }),
        /** 撞开距离：基础 0.5 + 物攻偏移[−0.08,0.6]，沿离心方向；夹 0.15..1.4。 */
        push: formula(
            F.base(0.5)
                .plus(F.stat("attack").minus(60).times(0.005).clamp(-0.08, 0.6))
                .clamp(0.15, 1.4).round(2),
            "撞开距离", {
                unit: "格",
                description: "被扫到的人沿离中心的方向被掀开多远；物攻越高掀得越开。"
            }),
        /** 掉攻级数：原生固定 1 级，是这招的身份。 */
        stages: formula(
            F.const(1).clamp(1, 2).round(0),
            "掉攻级数", {
                unit: "级",
                description: "被扫中的目标攻击下降的能力等级；对宝可梦落到原生攻击等级，对其他战斗者落到攻击属性。原生固定 1 级。"
            }),
        /** 龙鳞碎屑数：基础 16 + 物攻偏移[−3,15] + 等级偏移[−2,8]；夹 10..40。 */
        scales: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-3, 15))
                .plus(F.level().minus(30).times(0.25).clamp(-2, 8))
                .clamp(10, 40).round(0),
            "龙鳞碎屑数", {
                unit: "点",
                description: "尾巴扫过时甩出的龙鳞碎屑数量，随物攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 − 速度偏移[−2,3]；广域 +2；夹 3..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.035).clamp(-2, 3))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.breakingswipe.preference.wide")), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "回身把尾巴甩起来的时间；速度越快越短，广域式多绕一拍。"),
        /** 收招：基础 7 − 速度偏移[−1.5,2.5]；夹 4..12。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "收招", "扫完把重心收住的时间；速度越快收得越利落。"),
        /** 冷却：基础 24 − 等级偏移[−3,6]；广域 +8；夹 14..42。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(20).times(0.15).clamp(-3, 6))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.breakingswipe.preference.wide")), F.const(8), F.const(0)))
                .clamp(14, 42).round(0),
            "冷却", "两次尾扫之间的等待；等级越高回气越快，广域式更费。PP 15 的代价。"),
        maxTargets: hidden(6)
    });

    defineDamage("breakingswipe", "sweep", {}, { contact: true });

    stages("breakingswipe", [
        { level: 34, values: { sweep: 68 } },
        { level: 50, values: { sweep: 78, radius: 3.4 } }
    ]);

    describe("breakingswipe", [
        { key: "description.0", values: ["sweep","maxTargets"] },
        { key: "description.1", values: ["radius", "arc"] },
        { key: "description.2", values: ["push","stages"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sweep", "tier.1.radius"] }
    ]);
}
