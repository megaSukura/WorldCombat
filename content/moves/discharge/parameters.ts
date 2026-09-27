/**
 * 放电 / discharge 的参数与伤害段。
 *
 * 原生事实：Electric／特殊／威力 80／命中 100／PP 15／target allAdjacent（自己周围所有宝可梦）／30% 麻痹。
 * 翻译：把「用耀眼的电击」做成**从身上同时迸出电弧**——它不走地面，空中地上一起打，瞬间扫过身周球域；
 * 每一次真正的命中都牵出一条从自己到该目标的电弧。删除旧的第二次余电，把整次伤害与麻痹折算为一次结算。
 * 与同族分开：重踏是贴地向前推的地裂、喷烟是向上竖喷的烟柱、污泥波是近身一次三维泼洒，
 * 只有放电是逐目标连线的瞬时电接触。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   surge        单次放电威力 68 + 特攻偏移 + **速度偏移**，广域式再折算原余电的一半；反应快的人电得更利落。
 *   fieldRadius  电环半径 3.6 格 + 特攻偏移 + 碰撞箱高度偏移。
 *   arcs         同时迸出的电弧数 5 + 特攻偏移 + 等级偏移（同时驱动画面密度）。
 *   numbChance   麻痹几率 0.22 + 特攻偏移 + 等级偏移。
 *   crackleTicks 电弧噼啪残留 12 刻 + 等级（只驱动画面）。
 *
 * 配置 `overcharge`（过载式）：开启＝电环收到 0.72 倍、威力 ×1.28、麻痹几率 ×1.35、最多打 3 个目标，起手 +2、冷却 +8；
 * 关闭（广域式）＝更广的电环、最多打 8 个目标，并把原第二次余电的一半折进这一发。两向各有适用局面。
 *
 * 伤害段 `surge`：唯一的那一次放电。
 */
namespace PokemonSkills {
    actionParameters.define("discharge", {
        /** 单次放电威力：68 + 特攻偏移[−14,40] + 速度偏移[−4,12]；过载 ×1.28 / 广域 ×0.92，广域再折算原余电的一半（10 + 特攻偏移[−2.5,7]）；夹 44..132。 */
        surge: formula(
            F.base(68)
                .plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-14, 40))
                .plus(F.stat("speed").minus(60).times(0.03).clamp(-4, 12))
                .times(F.when(F.pref("overcharge"), F.const(1.28), F.const(0.92)))
                .plus(F.when(F.pref("overcharge"), F.const(0),
                    F.base(10).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-2.5, 7)).as("原余电折算")))
                .clamp(44, 132).round(1),
            "放电威力", {
                unit: "威力",
                description: "身周一次放电那一下的基础威力；特攻越高越强，反应快的个体电得更利落。广域式把原本第二次余电的一半并进这一发，过载式则窄而更重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 电环半径：3.6 + 特攻偏移[−0.4,1.1] + 高度偏移[−0.3,0.9]；过载 ×0.72 / 广域 ×1.0；夹 2.4..5.6。 */
        fieldRadius: formula(
            F.base(3.6)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.1))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.9))
                .times(F.when(F.pref("overcharge"), F.const(0.72), F.const(1)))
                .clamp(2.4, 5.6).round(2),
            "电环半径", {
                unit: "格",
                description: "放电罩住身周多大一圈（按身体中心算的球域）；特攻高、体型大的个体电得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 电弧数：5 + 特攻偏移[−1,4] + 等级(≥25)偏移[0,3]；过载 ×0.6；夹 3..14。同时驱动画面密度。 */
        arcs: formula(
            F.base(5)
                .plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-1, 4))
                .plus(F.level().minus(25).times(0.1).clamp(0, 3))
                .times(F.when(F.pref("overcharge"), F.const(0.6), F.const(1)))
                .clamp(3, 14).round(0),
            "电弧股数", {
                unit: "股",
                description: "每次命中牵出的那条电弧上同时迸出的股数；特攻越高、等级越高越多，也决定画面的密集程度。"
            }),
        /** 麻痹几率：0.22 + 特攻偏移[−0.05,0.16] + 等级(≥20)偏移[0,0.08]；过载 ×1.35 / 广域 ×1.0；夹 0.10..0.52。 */
        numbChance: percent(
            F.base(0.22)
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.05, 0.16))
                .plus(F.level().minus(20).times(0.0015).clamp(0, 0.08))
                .times(F.when(F.pref("overcharge"), F.const(1.35), F.const(1)))
                .clamp(0.10, 0.52).round(3),
            "麻痹几率", "被这次放电打到的每个目标陷入麻痹的几率，每人只掷一次；特攻越高、等级越高越容易麻住。"),
        /** 噼啪残留：12 + 等级 ×0.2；夹 10..24。 */
        crackleTicks: seconds(
            F.base(12).plus(F.level().times(0.2)).clamp(10, 24).round(0),
            "噼啪残留", "电弧在地面与空气里残留的时间；它只驱动画面，不再造成伤害。"),
        maxTargets: formula(F.when(F.pref("overcharge"), F.const(3), F.const(8)).round(0), "", { visible: false })
    });

    defineDamage("discharge", "surge", {});

    stages("discharge", [
        { level: 44, values: { surge: 88, fieldRadius: 4.0, numbChance: 0.32 } }
    ]);

    describe("discharge", [
        { key: "description.0", values: ["surge", "maxTargets"] },
        { key: "description.1", values: ["fieldRadius"] },
        { key: "description.2", values: ["numbChance"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge", "tier.0.fieldRadius", "tier.0.numbChance"] }
    ]);
}
