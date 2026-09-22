/**
 * 强力鞭打 / powerwhip 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：草、物理、威力 120、命中 85、PP 10、优先度 0、接触、无次要效果（40 位学习者）。
 * 翻译：保留「激烈地挥舞青藤或触手摔打对手」，把它落成即时战斗里的一道**长肢横扫**：青藤先盘起探高，
 * 再甩出一道覆盖身前大片区域的弧面，弧面扫过的地方就是被打到的范围。它是本族里**够得最远、覆盖最宽**的一招，
 * 但起手重、冷却久；命中 85 在这里落成「盘藤的起手能被看见」，对手有真实余地走出弧面。
 *
 * 与本族分开：藤鞭是短而快的单线一抽；缠绕是贴身绞缠减速；百万吨重踢是直线单体踢飞。
 * 强力鞭打凭「一道远而宽的横扫弧面」认出来，与藤鞭的短促一抽在画面上一眼可分。
 *
 * 数据分散（每项读不同的精灵数据；目标侧用目标事实）：
 *   lash       鞭击威力：物攻给挥击力，**身高**给藤/触手的长度与末端速度，等级拾级抬升。
 *   reach      触及距离：身高决定长肢有多长；速度给一点伸展，配置 extend／whirl 各加各减。
 *   arc        横扫弧度：配置 extend 的长鞭式是窄前弧，旋身式是整圈。
 *   maxTargets 同时能扫到几个：长鞭式收束到少数、旋身式放开到一圈。
 *   shove      击退：物攻给推力、**目标体重**把推开距离压下来。
 *   leaves     飞叶数量：物攻与身高派生，表现按它发射，画面里的飞叶数与机制一致。
 *   tempo/aftercast/recharge 起手／收招／冷却：速度决定快慢，旋身式多一圈收势与冷却。
 *
 * 配置 extend（长鞭式，默认开）双向取舍：开＝够得更远、把少数目标推得更开，但弧度窄、只扫身前一线；
 * 关（旋身式）＝原地整圈甩开、一次罩住四面八方，但够得更近、单发略轻、收招与冷却更久。两向各有局面
 * （远距离点杀 vs 被围住时破阵）。
 *
 * 伤害段 lash 与参数同名；属性与分类沿用原生 Grass／物理，对手防御、相性与暴击在命中时由共享结算乘入。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const powerwhipMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("powerwhip", {
        /** 鞭击威力：基础 120；物攻每比 60 多 1 加 0.9（上限 +62）；身高每比 1.4 高 1 格加 22（上限 +40）；等级每比 20 高 1 加 0.3（上限 +24）；长鞭 ×0.94 / 旋身 ×1.08；夹在 85..230。 */
        lash: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.9).clamp(-28, 62))
                .plus(F.body("height").minus(1.4).times(22).clamp(-8, 40))
                .plus(F.level().minus(20).times(0.3).clamp(0, 24))
                .times(F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(0.94), F.const(1.08)))
                .clamp(85, 230).round(1),
            "鞭击威力", {
                unit: "威力",
                description: "青藤甩中目标的基础威力；物攻给出挥击的力，**长长的肢体**让末端速度也进威力，旋身式收得更紧、单发更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 触及距离：基础 3.6 格；身高每比 1.4 高 1 格加 1.1（上限 +2.4）；速度每比 60 快 1 加 0.008（上限 +0.6）；长鞭 +1.1 / 旋身 −1.3；夹在 2.6..6.5。 */
        reach: formula(
            F.base(3.6).plus(F.body("height").minus(1.4).times(1.1).clamp(-0.6, 2.4))
                .plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.6))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(1.1), F.const(-1.3)))
                .clamp(2.6, 6.5).round(2),
            "触及距离", {
                unit: "格",
                description: "青藤或触手甩出去能够到多远，也是本招的射程与画面里那道弧面的半径；肢体越长够得越远。"
            }),
        /** 横扫弧度：长鞭式 96 度窄前弧 / 旋身式 360 度整圈；夹在 60..360。 */
        arc: formula(
            F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(96), F.const(360)).clamp(60, 360).round(0),
            "横扫弧度", {
                unit: "度",
                description: "青藤扫过的扇面张角；长鞭式是身前一道窄弧，旋身式是原地一整圈。画面里填出的弧面就是这个范围。"
            }),
        /** 同时命中数：长鞭式 2 / 旋身式 4；夹在 1..5。 */
        maxTargets: formula(
            F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(2), F.const(4)).clamp(1, 5).round(0),
            "同时命中数", {
                unit: "个",
                description: "一道弧面最多结算几个目标；长鞭式收束，旋身式放开，避免一刀扫穿整片战场。"
            }),
        /** 击退：基础 0.5 格；物攻每比 60 多 1 加 0.012（上限 +0.8）；目标体重每比 300hg 重 1hg 减 0.0006（最多减 0.6）；长鞭 ×1.25 / 旋身 ×0.8；夹在 0.2..1.8。 */
        shove: formula(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.012).clamp(-0.2, 0.8))
                .minus(powerwhipMassNode.minus(300).times(0.0006).clamp(0, 0.6))
                .times(F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(1.25), F.const(0.8)))
                .clamp(0.2, 1.8).round(2),
            "击退", {
                unit: "格",
                description: "被扫中的人被推开多远；物攻越强推得越远，目标越重越推不动，长鞭式把冲击集中在少数人身上。"
            }),
        /** 飞叶数量：基础 22；物攻每比 60 多 1 加 0.18（上限 +14）；身高每比 1.4 高 1 格加 8（上限 +14）；夹在 14..64。 */
        leaves: formula(
            F.base(22).plus(F.stat("attack").minus(60).times(0.18).clamp(-4, 14))
                .plus(F.body("height").minus(1.4).times(8).clamp(-3, 14))
                .clamp(14, 64).round(0),
            "飞叶数量", {
                unit: "片",
                description: "鞭击与命中处甩出的叶片数量，随物攻与身高增长；粒子按它发射，画面里的叶片数与机制一致。"
            }),
        /** 起手：基础 14 刻；速度每比 60 快 1 减 0.03 刻（上限 −5）；旋身 +2；夹在 9..20。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 5))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(0), F.const(2)))
                .clamp(9, 20).round(0),
            "起手", "先把青藤盘起探高的时间；盘得越久越像样，这段时间对手能看见并走出弧面。"),
        /** 收招：基础 12 刻；速度每比 60 快 1 减 0.03 刻（上限 −4）；旋身 +4；夹在 8..22。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-4, 5))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(0), F.const(4)))
                .clamp(8, 22).round(0),
            "收招", "把甩出去的青藤收回来、重新站稳的收势；旋身式多转半圈，收得更久。"),
        /** 冷却：基础 42 刻；速度每比 60 快 1 减 0.06 刻（上限 −10）；长鞭 +4；夹在 30..66。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.powerwhip.preference.extend")), F.const(4), F.const(0)))
                .clamp(30, 66).round(0),
            "冷却", "两次挥鞭之间的等待；长鞭式伸得更远，缓得也稍久。")
    });

    stages("powerwhip", [
        { level: 40, values: { lash: 136 } },
        { level: 60, values: { lash: 152, reach: 5.2 } }
    ]);

    defineDamage("powerwhip", "lash", {}, { contact: true });

    describe("powerwhip", [
        { key: "description.0", values: ["lash", "reach", "arc"] },
        { key: "description.1", values: ["maxTargets", "shove", "leaves"] },
        { key: "extend.on", values: [], when: function (context) { return read(context.detail.values, ["extend"]) !== false; } },
        { key: "extend.off", values: [], when: function (context) { return read(context.detail.values, ["extend"]) === false; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.reach"] }
    ]);
}
