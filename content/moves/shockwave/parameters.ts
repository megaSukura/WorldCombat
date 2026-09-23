/**
 * 电击波 / shockwave 的参数与伤害段。
 *
 * 原生事实：Electric、特殊、威力 60、命中必定（accuracy true）、PP 20、单体、无次要效果（Cobblemon 1.8）。
 * 翻译：把“向对手快速发出电击，必定命中”翻成一道比反应更快的电流——它贴着地面窜到对手脚下，来不及躲。
 * 目标湿身或天在下雨时，电沿水传导得更狠；配置 ground（地导）让电流扫过身前的整条走廊，直击则单体更重。
 * 数据分散：特攻定直击与地导威力、湿身加成与折数，速度定传导速度，身高定走廊宽度与判定，等级定地导射程。
 * 配置 ground 经 resolve 改变射程与节奏：地导更远更广，但起手与冷却更长。
 *
 * 伤害段：jolt 是直击那一下，surge 是地导走廊里每个目标的那一下。
 */
namespace PokemonSkills {
    actionParameters.define("shockwave", {
        /** 直击威力：特攻每比 60 多 1 加 0.18，夹在 32..100。 */
        jolt: formula(
            F.base(58).plus(F.stat("specialAttack").minus(60).times(0.18)).clamp(32, 100).round(1),
            "直击威力", {
                unit: "威力",
                description: "直击形态下落在单体身上的威力；特攻越高越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 地导威力：特攻每比 60 多 1 加 0.14，夹在 26..80。 */
        surge: formula(
            F.base(46).plus(F.stat("specialAttack").minus(60).times(0.14)).clamp(26, 80).round(1),
            "地导威力", {
                unit: "威力",
                description: "地导形态下走廊里每个目标承受的威力；能量摊在一条线上，单点比直击轻。"
            }),
        /** 传导速度：基础 1.8 格/刻，速度每比 60 快 1 加 0.01，夹在 1.4..2.6。 */
        boltSpeed: formula(
            F.base(1.8).plus(F.stat("speed").minus(60).times(0.01)).clamp(1.4, 2.6).round(2),
            "传导速度", {
                unit: "格/刻",
                description: "电流沿地面推进的速度；越快目标越来不及躲开。"
            }),
        /** 折数：基础 5，特攻每比 60 多 1 加 0.03，夹在 4..8 并向下取整。 */
        jags: formula(
            F.base(5).plus(F.stat("specialAttack").minus(60).times(0.03)).clamp(4, 8).floor(),
            "折数", {
                unit: "折",
                description: "电流在施法者与目标之间炸开几处折点；特攻越高电流越暴烈。"
            }),
        /** 走廊半宽：基础 0.9 格，碰撞箱每比 1.4 高 1 格加 0.15，夹在 0.6..1.6。 */
        corridor: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.15)).clamp(0.6, 1.6).round(2),
            "走廊半宽", {
                unit: "格",
                description: "地导时电流走廊的一半宽度；大个子推开的电流更宽。"
            }),
        /** 湿身加成：基础 0.45，特攻每比 60 多 1 加 0.002，夹在 0.25..0.7。 */
        wetBonus: percent(
            F.base(0.45).plus(F.stat("specialAttack").minus(60).times(0.002)).clamp(0.25, 0.7),
            "湿身加成", "目标湿身或天在下雨时，电沿水传导，额外增加的威力幅度。"),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.1，夹在 0.4..0.8。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.4, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "电流的横向判定半径；大个子放出的电流更粗。"
            })
    });

    defineDamage("shockwave", "jolt", {});
    defineDamage("shockwave", "surge", {});

    stages("shockwave", [
        { level: 32, values: { jolt: 66, surge: 52 } },
        { level: 50, values: { wetBonus: 0.5 } }
    ]);

    describe("shockwave", [
        { key: "description.0", values: ["jolt", "wetBonus"] },
        { key: "description.1", values: ["surge", "corridor"] },
        { key: "description.2", values: ["boltSpeed"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jolt", "tier.0.surge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wetBonus"] }
    ]);
}
