/**
 * 溶解液 / acid —— 参数与伤害段。
 *
 * 原生事实：Poison／特殊／威力 40／命中 100／PP 30／target allAdjacentFoes／10% 概率让目标特防下降 1 级。
 *
 * 翻译：把「将强酸泼向对手」落成一记低弧抛出的酸团——它落在目标身边炸开，溅到落点周围所有敌人身上，
 * 并在地面留下一滩腐蚀酸池；没走开的人会被反复咬掉一点血。它是磨防四式里唯一留东西在场上的那个：
 * 单发威力最低、冷却最短、PP 最多，靠酸池继续施压。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          泼溅威力：特攻定腐蚀强度，等级定酸液浓度。
 *   pool          酸池每跳威力：特攻定残留腐蚀性。
 *   globSpeed     投掷速度：速度定酸glob的初速。
 *   globRadius    判定半径：碰撞箱高度定酸glob大小。
 *   reach         射程：特攻定能泼多远。
 *   poolRadius    酸池半径：体型与特攻共同决定摊开的面积。
 *   poolTicks     酸池时长：等级与特攻决定腐蚀残留多久。
 *   poolPulse     酸池间隔：速度决定两跳之间隔多久。
 *   sunderChance  碾防概率：特攻与等级共同决定，基础 10% 取自原生。
 *   sunderStage   碾防级数：固定 1 级，与原生一致。
 *   drops         酸滴数：特攻与等级决定泼出的酸滴数量，也驱动表现。
 *   tempo         起手：速度决定鼓酸出手的快慢。
 *
 * 配置 `corrode`（腐蚀强化）：开启＝酸池更大更久更疼（半径 ×1.25、时长 +30 刻、每跳 ×1.4）、冷却 +6 刻、
 * 起手 +1 刻，但单发泼溅 ×0.85；关闭＝一发更痛的泼溅、酸池较小。两向各有适用局面（封地 vs 爆发）。
 *
 * 伤害段 `core`（泼溅）与 `pool`（酸池每跳）各自成段，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("acid", {
        core: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(50).times(0.2).clamp(-10, 22))
                .plus(F.level().minus(25).times(0.4).clamp(0, 10))
                .times(F.when(F.pref("corrode"), F.const(0.85), F.const(1)))
                .clamp(24, 78).round(1),
            "泼溅威力", {
                unit: "威力",
                description: "酸glob炸开时对落点周围每个敌人各结算一次的基础威力；特攻与等级越高咬得越疼。腐蚀强化把能量摊给酸池，这一下略轻。"
            }),
        pool: formula(
            F.base(8).plus(F.stat("specialAttack").minus(50).times(0.05).clamp(-3, 12)).clamp(4, 22).round(1),
            "酸池威力", {
                unit: "威力",
                description: "留下的酸池每跳一次对圈内每人造成的伤害；特攻越高残留腐蚀性越强。"
            }),
        globSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(50).times(0.005).clamp(-0.15, 0.4)).clamp(0.85, 1.6).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "酸glob脱手时的初速；速度快的个体泼得更急，目标更难走位躲开。"
            }),
        globGravity: hidden(0.05),
        globRadius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.05)).clamp(0.18, 0.4).round(2),
            "判定半径", {
                unit: "格",
                description: "酸glob飞行与落地判定的半径；体型越高酸团越大。"
            }),
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.05).clamp(-2, 4)).clamp(8, 14).round(1),
            "射程", {
                unit: "格",
                description: "能把酸泼到多远；特攻高泼得远。它也是本招的实际射程来源。"
            }),
        poolRadius: formula(
            F.base(2.2)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.9))
                .plus(F.stat("specialAttack").minus(50).times(0.006).clamp(-0.3, 0.7))
                .times(F.when(F.pref("corrode"), F.const(1.25), F.const(1)))
                .clamp(1.6, 4.4).round(2),
            "酸池半径", {
                unit: "格",
                description: "泼溅与酸池能够到的半径；大个子、特攻高、腐蚀强化形态铺得更开。它也是指示圈半径。"
            }),
        poolTicks: seconds(
            F.base(80)
                .plus(F.level().minus(25).times(1.0).clamp(0, 30))
                .plus(F.stat("specialAttack").minus(50).times(0.3).clamp(-6, 18))
                .plus(F.when(F.pref("corrode"), F.const(30), F.const(0)))
                .clamp(50, 170).round(0),
            "酸池时长", "落点那滩酸在地面停留多久；等级与特攻越高、腐蚀强化时留得越久。"),
        poolPulse: seconds(
            F.base(20).minus(F.stat("speed").minus(50).times(0.06).clamp(-2, 6)).clamp(12, 28).round(0),
            "酸池间隔", "酸池两跳之间隔多久；速度快的个体咬得更密。"),
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(50).times(0.0012).clamp(-0.03, 0.08))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .clamp(0.06, 0.24).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 10% 起，特攻与等级越高越容易咬软。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        drops: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(50).times(0.12))
                .plus(F.level().minus(25).times(0.3))
                .clamp(8, 36).round(),
            "酸滴数", {
                unit: "滴", visible: false,
                description: "泼出的酸滴数量，也驱动表现的密度；特攻与等级越高泼得越密。"
            }),
        tempo: seconds(
            F.base(10)
                .minus(F.stat("speed").minus(50).times(0.04))
                .plus(F.when(F.pref("corrode"), F.const(1), F.const(0)))
                .clamp(5, 14).round(),
            "起手", "鼓起酸囊再泼出的时间；速度越快越短，腐蚀强化多花一点。")
    });

    defineDamage("acid", "core", {});
    defineDamage("acid", "pool", {});

    stages("acid", [
        { level: 30, values: { core: 42, poolRadius: 2.5 } }
    ]);

    describe("acid", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["poolRadius"] },
        { key: "description.2", values: ["pool","poolTicks","poolPulse"] },
        { key: "description.3", values: ["sunderChance","sunderStage"] },
        { key: "corrode.note", values: [] },
        { key: "timing", values: ["reach","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.poolRadius"] }
    ]);
}
