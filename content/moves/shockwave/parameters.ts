/**
 * 电击波 / shockwave 的参数与伤害段。
 *
 * 原生事实：Electric、特殊、威力 60、命中必定（accuracy true）、PP 20、单体、无次要效果（Cobblemon 1.8）。
 * 翻译：把“向对手快速发出电击”翻成一道出手即到的电流——不显示飞行过程，电流沿施法者到目标的直线一瞬
 *       闪到身上，首个拦路的身体或方块就是真实终点；不做随机命中检定，空放也成立。目标湿身或在雨里时，
 *       电沿水传导得更狠。
 * 数据分散：特攻定威力、湿身加成与折数，身高定判定半径。
 *
 * 伤害段：jolt 是这一下直击。
 */
namespace PokemonSkills {
    actionParameters.define("shockwave", {
        /** 直击威力：特攻每比 60 多 1 加 0.18，夹在 32..100。 */
        jolt: formula(
            F.base(58).plus(F.stat("specialAttack").minus(60).times(0.18)).clamp(32, 100).round(1),
            "直击威力", {
                unit: "威力",
                description: "电流落在单体身上的威力；特攻越高越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 折数：基础 5，特攻每比 60 多 1 加 0.03，夹在 4..8 并向下取整。 */
        jags: formula(
            F.base(5).plus(F.stat("specialAttack").minus(60).times(0.03)).clamp(4, 8).floor(),
            "折数", {
                unit: "折",
                description: "电流在施法者与目标之间炸开几处折点；特攻越高电流越暴烈。"
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

    stages("shockwave", [
        { level: 32, values: { jolt: 66 } },
        { level: 50, values: { wetBonus: 0.5 } }
    ]);

    describe("shockwave", [
        { key: "description.0", values: ["jolt","wetBonus"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jolt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wetBonus"] }
    ]);
}
