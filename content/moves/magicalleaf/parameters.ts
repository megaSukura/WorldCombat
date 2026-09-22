/**
 * 魔法叶 / magicalleaf —— 参数与伤害段。
 *
 * 原生事实：Grass、特殊、威力 60、命中必定（accuracy true）、PP 20、不接触、无次要效果（Cobblemon 1.8）。
 * 翻译：把「散落可以追踪对手的神奇叶片，攻击必定会命中」翻成即时战斗里的**一片会拐弯的叶群**——
 *   叶片从施法者身上散开，各自划弧追向对手，从四面八方一起收拢；叶会追，所以躲不开，这就是「必中」的样子。
 * 数据分散（每个参数读不同的精灵数据）：
 *   leaf      单叶威力随特攻；
 *   leaves    叶数随特攻与等级；
 *   turn      转向随速度（快者拐得更急、追得更死）；
 *   leafSpeed 叶速随速度；
 *   leafRadius判定半径随体型高度；
 *   lockRange 锁定距离随等级与特攻；
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 * 配置 envelop（合围／直取）双向取舍：合围时叶从整圈散开再加 2 片、转向更强，四面一起收拢，但叶更慢更轻、起手多 2 刻；
 *   直取时叶从前方一个小锥面直插，来得更快、单叶更重，但合围面窄。
 *
 * 伤害段：leaf 是每一片叶的那一下。
 */
namespace PokemonSkills {
    actionParameters.define("magicalleaf", {
        /** 单叶威力：特攻每比 60 多 1 加 0.11，合围 ×0.85、直取 ×1.15，夹在 12..48。 */
        leaf: formula(
            F.base(26, "基础").plus(F.stat("specialAttack").minus(60).times(0.11).as("特攻"))
                .times(F.when(F.pref("envelop", text("worldcombat.skill.magicalleaf.preference.envelop")), F.const(0.85), F.const(1.15)).as("取叶方式"))
                .clamp(12, 48).round(1),
            "单叶威力", {
                unit: "威力",
                description: "每一片叶造成的威力；特攻越高叶越利。合围把力分摊到整圈，单叶更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 叶数：基础 4，特攻每比 60 多 1 加 0.03，等级每比 30 高 1 加 0.03，合围 +2，夹在 3..10 并向下取整。 */
        leaves: formula(
            F.base(4, "基础").plus(F.stat("specialAttack").minus(60).times(0.03).as("特攻"))
                .plus(F.level().minus(30).times(0.03).as("等级"))
                .plus(F.when(F.pref("envelop"), F.const(2), F.const(0)).as("取叶方式"))
                .clamp(3, 10).floor(),
            "叶数", {
                unit: "片",
                description: "一次散出几片叶；特攻与等级越高越多。叶数同时决定画面里的叶量与合围密度。"
            }),
        /** 转向：基础 10 度/刻，速度每比 60 快 1 加 0.07 度，合围 +2.5，夹在 7..20。 */
        turn: formula(
            F.base(10, "基础").plus(F.stat("speed").minus(60).times(0.07).as("速度"))
                .plus(F.when(F.pref("envelop"), F.const(2.5), F.const(0)).as("取叶方式"))
                .clamp(7, 20).round(1),
            "转向", {
                unit: "度/刻",
                description: "叶每刻朝对手转向的最大角度；速度快的个体拐得更急，追得更死。"
            }),
        /** 叶速：基础 0.95 格/刻，速度每比 60 快 1 加 0.004，合围 ×0.85、直取 ×1.12，夹在 0.6..1.5。 */
        leafSpeed: formula(
            F.base(0.95, "基础").plus(F.stat("speed").minus(60).times(0.004).as("速度"))
                .times(F.when(F.pref("envelop"), F.const(0.85), F.const(1.12)).as("取叶方式"))
                .clamp(0.6, 1.5).round(2),
            "叶速", {
                unit: "格/刻",
                description: "叶飞行的速度；越快接触来得越早。转向够快时，慢叶也能绕到人背后。"
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
                .plus(F.stat("specialAttack").minus(60).times(0.02).as("特攻"))
                .clamp(9, 16).round(1),
            "锁定距离", {
                unit: "格",
                description: "叶能锁定并追到多远的对手；等级高、特攻高的个体叶追得更远。它也是本招的实际射程。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 短 0.04，夹在 4..12。 */
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(60).times(0.04).as("速度")).clamp(4, 12).round(0),
            "起手", "叶在身周散开再放出去需要多久；快个体更早放手。"),
        /** 收招：基础 8 刻，夹在 4..14。 */
        settle: seconds(F.base(8, "基础").clamp(4, 14).round(0), "收招", "叶散出之后的收势时间。"),
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
        { key: "envelop.on", values: [], when: function (context) { return read(context.detail.values, ["envelop"]) === true; } },
        { key: "envelop.off", values: [], when: function (context) { return read(context.detail.values, ["envelop"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.leaf", "tier.0.leaves"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.leaf", "tier.1.turn"] }
    ]);
}
