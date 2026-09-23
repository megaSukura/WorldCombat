/**
 * 借力摔 / vitalthrow 的参数与伤害段。
 *
 * 原生事实：Fighting、物理、威力 70、命中必定（accuracy true）、PP 10、优先度 −1（在对手之后出手）、接触（Cobblemon 1.8）。
 * 翻译：把「会在对手之后进行攻击，但是自己的攻击必定命中」翻成一个**后发的反手摔**——施法者沉住气等对手先动
 * （起手很长，就是在等），等对手扑进来的那一刻借它的冲劲把它顺势摔出去；因为是在近身的一瞬抓住的，摔得实、躲不掉；
 * 对手没进来就扑空。分量在施法者身上：施法者越重，摔得越狠；对手越重、冲得越快，被甩得越远。
 * 数据分散：物攻与**施法者体重**定摔击威力、速度定起手快慢与抓握距离、体型高度定抓取半径、
 * 对手体重与速度定甩出的距离、等级定压制时长与成长。
 * 配置 bait（引手）在「等得更久、抓住扑击时更狠」与「快抓快摔、更省」之间取舍。
 *
 * 伤害段：throw 是这一摔。
 */
namespace PokemonSkills {
    actionParameters.define("vitalthrow", {
        /** 摔击威力：物攻每比 60 多 1 加 0.18，施法者体重每比 60 多 1 加 0.06，夹在 36..142。 */
        throwPower: formula(
            F.base(50).plus(F.stat("attack").minus(60).times(0.18)).plus(F.body("weight").minus(60).times(0.06))
                .clamp(36, 142).round(1),
            "摔击威力", {
                unit: "威力",
                description: "反手摔的威力；物攻与**施法者体重**共同决定分量（越重的摔跤手摔得越狠）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抓握距离：基础 2.6 格，碰撞箱每比 1.4 高 1 格加 0.12，速度每比 60 快 1 加 0.01，引手 ×1.15，夹在 2.2..4.0。 */
        catchRange: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.12)).plus(F.stat("speed").minus(60).times(0.01))
                .times(F.when(F.pref("bait"), F.const(1.15), F.const(1)))
                .clamp(2.2, 4.0).round(2),
            "抓握距离", {
                unit: "格",
                description: "能抓住多远的对手；也是射程。大个子手更长，速度快的个体出爪更远，引手张手更大。"
            }),
        /** 架势时长：基础 18 刻，速度每比 60 快 1 少 0.04，引手 +4，夹在 10..28。 */
        braceTicks: seconds(
            F.base(18).minus(F.stat("speed").minus(60).times(0.04))
                .plus(F.when(F.pref("bait"), F.const(4), F.const(0)))
                .clamp(10, 28).round(0),
            "架势时长", "沉住气等对手先动的时长；这就是「在对手之后出手」，也是这招被读出的代价。"),
        /** 借力加成：基础 0.28，物攻每比 60 多 1 加 0.001，引手 ×1.3，夹在 0.12..0.55。 */
        momentum: percent(
            F.base(0.28).plus(F.stat("attack").minus(60).times(0.001))
                .times(F.when(F.pref("bait"), F.const(1.3), F.const(1)))
                .clamp(0.12, 0.55),
            "借力加成", "对手正处在出手动作中（扑进来）时，这一摔额外增加的威力幅度。"),
        /** 甩出距离：基础 1.8 格，对手体重每比 60 多 1 加 0.02，施法者物攻每比 60 多 1 加 0.002，夹在 1.0..3.8。 */
        fling: formula(
            F.base(1.8).plus(F.target("body.weight").minus(60).times(0.02)).plus(F.stat("attack").minus(60).times(0.002))
                .clamp(1.0, 3.8).round(2),
            "甩出距离", {
                unit: "格",
                description: "把目标甩出去多远；**对手越重被甩得越远（质量换距离）**，物攻也帮着加力。非宝可梦目标没有体重数据，按基础值计算。"
            }),
        /** 压制时长：基础 24 刻，等级每比 30 高 1 加 0.3，夹在 16..52。 */
        pinTicks: seconds(
            F.base(24).plus(F.level().minus(30).times(0.3)).clamp(16, 52).round(0),
            "压制时长", "摔后把目标压在地上的时长；等级高的个体压得更久。")
    });

    defineDamage("vitalthrow", "throwPower", {}, { contact: true });

    stages("vitalthrow", [
        { level: 32, values: { throwPower: 58, pinTicks: 30 } },
        { level: 48, values: { throwPower: 72, fling: 2.6 } }
    ]);

    describe("vitalthrow", [
        { key: "description.0", values: ["throwPower","momentum"] },
        { key: "description.1", values: ["braceTicks","catchRange"] },
        { key: "description.2", values: ["fling","pinTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.throwPower", "tier.0.pinTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.throwPower", "tier.1.fling"] }
    ]);
}
