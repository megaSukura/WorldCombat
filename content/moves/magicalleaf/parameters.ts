/**
 * 魔法叶 / magicalleaf —— 参数与伤害段。
 *
 * 原生事实：Grass、特殊、威力 60、命中必定（accuracy true）、PP 20、不接触、无次要效果（Cobblemon 1.8）。
 * 设计：一片接一片从身前发出的会拐弯的叶。每片发出时重新读取当刻准线，沿准线锁定第一个合法可见的敌人，
 *   有限度地拐弯追上去；没锁到就沿准线直飞。取消旧的合围／直取开关，只保留一种顺次连发。
 *
 * 数值来源（每项读不同的精灵数据）：
 *   leaf      单叶威力随特攻；
 *   leaves    叶数随特攻与等级；
 *   turn      转向随速度；
 *   leafSpeed 叶速随速度；
 *   leafRadius判定半径随体型高度；
 *   lockRange 锁定距离随等级与特攻；
 *   beat      连发间隔随速度（快者吐叶更急）；
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 *
 * 伤害段：leaf 是每一片叶的那一下。
 */
namespace PokemonSkills {
    actionParameters.define("magicalleaf", {
        /** 单叶威力：30 + 特攻每比 60 多 1 加 0.11，夹在 12..48。 */
        leaf: formula(
            F.base(30, "基础").plus(F.stat("specialAttack").minus(60).times(0.11).as("特攻")).clamp(12, 48).round(1),
            "单叶威力", {
                unit: "威力",
                description: "每一片叶造成的威力；特攻越高叶越利。对手防御、相性与暴击在命中时另算。"
            }),
        /** 叶数：基础 4，特攻每比 60 多 1 加 0.03，等级每比 30 高 1 加 0.03，夹在 3..10 并向下取整。 */
        leaves: formula(
            F.base(4, "基础").plus(F.stat("specialAttack").minus(60).times(0.03).as("特攻"))
                .plus(F.level().minus(30).times(0.03).as("等级")).clamp(3, 10).floor(),
            "叶数", {
                unit: "片",
                description: "一轮最多发出几片叶；特攻与等级越高越多。叶数同时决定画面里的叶量与一轮的时长。"
            }),
        /** 转向：基础 10 度/刻，速度每比 60 快 1 加 0.07 度，夹在 7..20。 */
        turn: formula(
            F.base(10, "基础").plus(F.stat("speed").minus(60).times(0.07).as("速度")).clamp(7, 20).round(1),
            "转向", {
                unit: "度/刻",
                description: "叶锁定后每刻朝目标转向的最大角度；速度快的个体拐得更急，追得更死。"
            }),
        /** 叶速：基础 1.05 格/刻，速度每比 60 快 1 加 0.004，夹在 0.6..1.5。 */
        leafSpeed: formula(
            F.base(1.05, "基础").plus(F.stat("speed").minus(60).times(0.004).as("速度")).clamp(0.6, 1.5).round(2),
            "叶速", {
                unit: "格/刻",
                description: "叶飞行的速度；越快接触来得越早。转向够快时，慢叶也能咬住移动的目标。"
            }),
        /** 判定半径：基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.05，夹在 0.25..0.5。 */
        leafRadius: formula(
            F.base(0.3, "基础").plus(F.body("height").minus(1.4).times(0.05).as("体型")).clamp(0.25, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "每片叶的横向判定半径；大个子散出的叶更大。"
            }),
        /** 锁定距离：基础 11 格，等级每比 30 高 1 加 0.06，特攻每比 60 多 1 加 0.02，夹在 9..16。 */
        lockRange: formula(
            F.base(11, "基础").plus(F.level().minus(30).times(0.06).as("等级"))
                .plus(F.stat("specialAttack").minus(60).times(0.02).as("特攻")).clamp(9, 16).round(1),
            "锁定距离", {
                unit: "格",
                description: "每片叶发出时沿准线能锁定并追到多远的敌人；等级高、特攻高的个体叶追得更远。它也是本招的实际射程。"
            }),
        /** 连发间隔：基础 4 刻，速度每比 60 快 1 短 0.015，夹在 3..5。 */
        beat: formula(
            F.base(4, "基础").minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 1).as("速度")).clamp(3, 5).round(0),
            "连发间隔", {
                unit: "刻",
                description: "一片叶发出后隔多久发下一片；速度快的个体吐叶更急。叶数与间隔共同决定一轮的时长。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 短 0.04，夹在 4..12。 */
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(60).times(0.04).as("速度")).clamp(4, 12).round(0),
            "起手", "叶在身周散开再开始逐片放出需要多久；快个体更早放手。"),
        /** 收招：基础 8 刻，夹在 4..14。 */
        settle: seconds(F.base(8, "基础").clamp(4, 14).round(0), "收招", "叶全部发出之后的收势时间。"),
        /** 冷却：基础 80 刻，等级每比 20 高 1 短 0.6，夹在 40..110。 */
        recharge: seconds(
            F.base(80, "基础").minus(F.level().minus(20).max(0).times(0.6).as("等级")).clamp(40, 110).round(0),
            "冷却", "两次散叶之间的等待；等级越高越熟练。")
    });

    defineDamage("magicalleaf", "leaf", {}, {});

    stages("magicalleaf", [
        { level: 34, values: { leaf: 32, leaves: 6 } },
        { level: 52, values: { leaf: 42, turn: 15 } }
    ]);

    describe("magicalleaf", [
        { key: "description.0", values: ["leaf", "leaves"] },
        { key: "description.1", values: ["turn", "leafSpeed", "lockRange"] },
        { key: "description.2", values: ["leafRadius"] },
        { key: "description.3", values: ["beat"] },
        { key: "description.chase", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.leaf", "tier.0.leaves"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.leaf", "tier.1.turn"] }
    ]);
}
