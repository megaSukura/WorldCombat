/**
 * 爆音波 / boomburst 的参数与伤害段。
 *
 * 原生事实：Normal／特殊／威力 140／命中 100／PP 10／target allAdjacent（自己周围所有宝可梦）／
 *   flags 带 sound（声音招式）与 bypasssub（穿透替身）、无次要效果。它是全 Table 里威力最高的声音招式。
 *
 * 翻译：把「震耳欲聋的爆炸声产生的破坏力」翻成**一口气把声压整圈炸出去**——施法者先憋住一口气把空气
 *   压在身上，再猛地放开，一圈肉眼可见的声压球向外爆开：身周所有活体（空中地上一起）被轰中并被吹开，
 *   越靠近中心声压越密、挨得越重、被吹得越远；爆响留在每个人（包括施法者自己）耳里一阵耳鸣。
 *   与同族分开：
 *     地震       —— 只掀地面、把人向上抛，留下地缝；
 *     落英缤纷   —— 落花先收后放，瓣落地；
 *     同步干扰   —— 只打同属性的人；
 *     爆音波     —— 纯声压、不看属性不看地面，整圈一次轰开、冲量最大、中心最重，并留下耳鸣。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast        爆发威力 140 + 特攻偏移 + 等级偏移（声压越强，炸得越响）。
 *   falloff      边缘保留 0.62 − 特攻偏移（特攻越高，声压越均匀、衰减越小）。
 *   blastRadius  波及半径 4.8 格 + 碰撞箱高度偏移 + 等级偏移（身量大、等级高的个体炸得更开）。
 *   shock        向外击飞 0.6 格 + 特攻偏移（声压越强吹得越远）。
 *   deafenTicks  耳鸣停留 140 刻 + 特攻偏移 + 等级偏移。
 *   rings        余响环数 8 + 特攻偏移 + 等级偏移（同时驱动画面密度）。
 *
 * 配置 `concussive`（爆压式）：开启＝范围收到 0.72 倍、爆发 ×1.3、击飞 ×1.35、起手 +3 刻、冷却 +8 刻，
 *   把一圈人轰得更远；关闭（扩散式）＝范围 ×1.12、威力与击飞较小、出手更快，用来一次扫到更多人。
 *   两向各有适用局面：想把人从身边轰开、啃单个硬目标就爆压，想覆盖一片就扩散。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("boomburst", {
        /** 爆发威力：140 + 特攻偏移[−22,60] + 等级(≥25)偏移[0,12]；爆压 ×1.3 / 扩散 ×1.0；夹 90..260。 */
        blast: formula(
            F.base(140)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-22, 60))
                .plus(F.level().minus(25).times(0.22).clamp(0, 12))
                .times(F.when(F.pref("concussive"), F.const(1.3), F.const(1.0)))
                .clamp(90, 260).round(1),
            "爆发威力", {
                unit: "威力",
                description: "声压球在中心炸开时对每个敌人结算的基础威力；特攻越高、等级越高炸得越响。离中心越远声压越稀，按边缘保留系数衰减；对手特防、相性与暴击在命中时另算。"
            }),
        /** 边缘保留：0.62 − 特攻偏移[−0.1,0.16]；爆压 ×0.85 / 扩散 ×1.05；夹 0.4..0.8。 */
        falloff: percent(
            F.base(0.62).minus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.1, 0.16))
                .times(F.when(F.pref("concussive"), F.const(0.85), F.const(1.05))).clamp(0.4, 0.8).round(2),
            "边缘保留", "声压球推到最外圈时还剩多少威力；特攻越高的个体声压越均匀、衰减越小，爆压式中心更密、边缘更薄。"),
        /** 波及半径：4.8 + 高度偏移[−0.35,1.6] + 等级(≥25)偏移[0,1.5]；爆压 ×0.72 / 扩散 ×1.12；夹 3.0..7.6。 */
        blastRadius: formula(
            F.base(4.8)
                .plus(F.body("height").minus(1.4).times(1.0).clamp(-0.35, 1.6))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .times(F.when(F.pref("concussive"), F.const(0.72), F.const(1.12)))
                .clamp(3.0, 7.6).round(2),
            "波及半径", {
                unit: "格",
                description: "声压球罩住身周多大一圈（空中地面一起算）；体型高、等级高的个体炸得更开，爆压式收得更小。它也是本招的实际射程与指示圈半径。"
            }),
        /** 向外击飞：0.6 + 特攻偏移[−0.15,0.6]；爆压 ×1.35 / 扩散 ×0.9；夹 0.3..1.5。 */
        shock: formula(
            F.base(0.6).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.6))
                .times(F.when(F.pref("concussive"), F.const(1.35), F.const(0.9))).clamp(0.3, 1.5).round(2),
            "向外击飞", {
                unit: "格",
                description: "被声压轰中的人沿离中心的方向被吹开的距离，中心附近的人吹得更远；特攻越强吹得越狠，爆压式最狠。"
            }),
        /** 耳鸣停留：140 + 特攻偏移[−30,80] + 等级(≥25)偏移[0,15]；夹 100..300。 */
        deafenTicks: seconds(
            F.base(140).plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-30, 80))
                .plus(F.level().minus(25).times(0.5).clamp(0, 15)).clamp(100, 300).round(0),
            "耳鸣停留", "爆响在被轰到的人耳中留下的耳鸣停留多久；特攻越高、等级越高响得越久。施法者自己也一起耳鸣。"),
        /** 余响环数：8 + 特攻偏移[−1,5] + 等级(≥25)偏移[0,3]；夹 6..20。同时驱动画面密度。 */
        rings: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-1, 5))
                .plus(F.level().minus(25).times(0.08).clamp(0, 3)).clamp(6, 20).round(0),
            "余响环数", {
                unit: "环",
                description: "声压球炸开后身周荡开的余响环数；特攻越高、等级越高越多，也决定画面的密集程度。"
            }),
        maxTargets: hidden(8)
    });

    defineDamage("boomburst", "blast", {});

    stages("boomburst", [
        { level: 52, values: { blast: 175, blastRadius: 5.6, shock: 0.8 } }
    ]);

    describe("boomburst", [
        { key: "description.0", values: ["blast","falloff","maxTargets"] },
        { key: "description.1", values: ["blastRadius","shock"] },
        { key: "description.2", values: ["deafenTicks"] },
        { key: "concussive.on", values: [], when: function (context) { return read(context.detail.values, ["concussive"]) === true; } },
        { key: "concussive.off", values: [], when: function (context) { return read(context.detail.values, ["concussive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.blastRadius", "tier.0.shock"] }
    ]);
}
