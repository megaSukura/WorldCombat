/**
 * 雷电拳 / thunderpunch 的参数与伤害段。
 *
 * 原生事实：Electric、物理、威力 75、命中 100、PP 15、接触、拳类，命中后 10% 概率使目标麻痹
 *   （Cobblemon 1.8，全招 188 位学习者）。
 *
 * 翻译：把「充满电流的拳头」落成**一记快拳 + 一道沿地面追出去的电流**——拳本身只是出手的起点，
 * 真正有形状的是命中点炸开后电流追向旁边最近的另一个敌人，把它也电麻。它是本族唯一的**链式**招：
 * 单点爆发不高，但一次能点亮两个（超载式三个）目标，靠速度换覆盖面。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   volt       拳击威力：物攻定拳劲，速度定出拳多快多狠；超载式让每一拳更轻。
 *   spark      跃电威力：物攻与速度派生，超载式让跃电更重。
 *   chainRange 电弧跳跃距离：速度决定电流能追多远，等级再补一点；超载式更远。
 *   arcs       电弧目标数：速度与超载式决定一次能链到几个目标。
 *   numbChance 主目标麻痹概率：特攻定电流强度，等级再补；超载式略降。
 *   arcChance  跃电麻痹概率：特攻派生，超载式提高。
 *   jab        出拳延迟：速度决定提交到真正出拳的间隔。
 *   bolts      电弧数：速度派生，表现按它画出每道电弧的枝数。
 *   tempo/aftercast/recharge：速度决定起手、收招与冷却。
 *
 * 配置 `overcharge`（超载式）双向取舍：开启＝电弧跳得更远、可链到第三个目标、跃电麻痹概率更高，
 * 但主拳更轻（×0.88）、主目标麻痹概率略降、冷却更久；关闭（点穴式）＝主拳更重、麻痹更集中，链得更近。
 *
 * 伤害段 `volt`（主拳）与 `spark`（跃电）各走共享换算；麻痹经 `status: "paralysis"` 走共享状态路由。
 */
namespace PokemonSkills {
    actionParameters.define("thunderpunch", {
        /** 拳击威力：72 + 物攻偏移[−14,40] + 速度偏移[−5,14]；超载 ×0.88；夹 46..152。 */
        volt: formula(
            F.base(72).plus(F.stat("attack").minus(60).times(0.45).clamp(-14, 40))
                .plus(F.stat("speed").minus(60).times(0.15).clamp(-5, 14))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(0.88), F.const(1)))
                .clamp(46, 152).round(1),
            "拳击威力", {
                unit: "威力",
                description: "这一记快拳命中的基础威力；物攻定拳劲，速度定出拳的狠劲，超载式把每一拳摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 跃电威力：30 + 物攻偏移[−8,22] + 速度偏移[−4,10]；超载 ×1.15；夹 16..78。 */
        spark: formula(
            F.base(30).plus(F.stat("attack").minus(60).times(0.22).clamp(-8, 22))
                .plus(F.stat("speed").minus(60).times(0.1).clamp(-4, 10))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(1.15), F.const(1)))
                .clamp(16, 78).round(1),
            "跃电威力", {
                unit: "威力",
                description: "从命中点跳向其他目标的电弧威力；物攻与速度派生，超载式让跃电更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 电弧跳跃距离：3.0 + 速度偏移[−0.8,1.6] + 等级偏移[0,0.6]；超载 ×1.3；夹 2.2..6.0。 */
        chainRange: formula(
            F.base(3.0).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.8, 1.6))
                .plus(F.level().minus(30).times(0.01).clamp(0, 0.6))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(1.3), F.const(1)))
                .clamp(2.2, 6.0).round(2),
            "电弧跳跃距离", {
                unit: "格",
                description: "电流能从命中点追到多远的另一个目标；速度越快、等级越高追得越远，超载式更远。"
            }),
        /** 电弧目标数：1 + 速度偏移[0,1] + 超载式 +1；夹 1..3。 */
        arcs: formula(
            F.base(1).plus(F.stat("speed").minus(60).times(0.01).clamp(0, 1))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "电弧目标数", {
                unit: "个",
                description: "这一拳最多能再链到几个目标身上；速度越快链得越多，超载式额外 +1。"
            }),
        /** 主目标麻痹概率：0.14 + 特攻偏移[−0.06,0.20] + 等级偏移[0,0.12] − 超载 0.04；夹 0.08..0.50。 */
        numbChance: percent(
            F.base(0.14).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.06, 0.20))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.12))
                .minus(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(0.04), F.const(0)))
                .clamp(0.08, 0.50).round(3),
            "主目标麻痹概率", "被这一拳直接电中后陷入麻痹的概率；特攻越高电流越强，超载式力道分散、略降。"),
        /** 跃电麻痹概率：0.08 + 特攻偏移[−0.04,0.12] + 超载 0.06；夹 0.04..0.34。 */
        arcChance: percent(
            F.base(0.08).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.04, 0.12))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(0.06), F.const(0)))
                .clamp(0.04, 0.34).round(3),
            "跃电麻痹概率", "被电弧跳中后陷入麻痹的概率；特攻派生，超载式让跃电更麻。"),
        /** 出拳延迟：4 − 速度偏移[−1,2]；夹 2..7。 */
        jab: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2)).clamp(2, 7).round(0),
            "出拳延迟", "提交到真正出拳之间的引电时间；速度越快出拳越急。"),
        /** 起手：5 − 速度偏移[−1,2]；夹 3..9。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2)).clamp(3, 9).round(0),
            "起手", "拳面窜起电光、蓄到能提交的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1,2]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(3, 10).round(0),
            "收招", "打完这一拳后收势的时间；速度越快越短。"),
        /** 冷却：22 − 速度偏移[−4,6] + 超载 4；夹 14..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.thunderpunch.preference.overcharge")), F.const(4), F.const(0)))
                .clamp(14, 34).round(0),
            "冷却", "两拳之间的等待；速度越快回得越快，超载式要缓一拍。"),
        /** 拳面判定：0.45 + 身高偏移[−0.05,0.3]；夹 0.36..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3)).clamp(0.36, 0.8).round(2),
            "拳面判定", {
                unit: "格",
                description: "出拳时拳面能扫到多大范围；个子越大判定越宽。"
            }),
        /** 电弧数：4 + 速度偏移[−1,4]；夹 3..10。 */
        bolts: formula(
            F.base(4).plus(F.stat("speed").minus(60).times(0.04).clamp(-1, 4)).clamp(3, 10).round(0),
            "电弧数", {
                unit: "道",
                description: "每道电弧画出的分枝数量，随速度增长；表现按它发射，画面里的弧数与机制一致。"
            })
    });

    stages("thunderpunch", [
        { level: 32, values: { volt: 82 } },
        { level: 50, values: { volt: 94, chainRange: 3.8 } }
    ]);

    defineDamage("thunderpunch", "volt", {}, { contact: true, punch: true });
    defineDamage("thunderpunch", "spark", {});

    describe("thunderpunch", [
        { key: "description.0", values: ["volt","collisionRadius"] },
        { key: "description.1", values: ["numbChance"] },
        { key: "description.2", values: ["chainRange","arcs","spark","arcChance"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.volt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.volt", "tier.1.chainRange"] }
    ]);
}
