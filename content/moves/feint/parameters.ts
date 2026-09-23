/**
 * 佯攻 / feint —— 参数与伤害段。本组「旋身破缚」的破守·轻快成员。
 *
 * 原生事实：Normal／物理／威力 30／命中 100／PP 10／优先度 +2／breaksProtect（掀起守住、看穿这类守护），
 *   flags: mirror/noassist/failcopycat，无 contact、无次要效果（Cobblemon 1.8 / Showdown）。88 位学习者。
 *   描述「能够攻击正在使用守住或看穿等招式的对手。解除其守护效果。」
 *
 * 翻译：把「佯攻」翻成一次**故意的假动作**——身体一矮、虚晃一记，逼对手把守护用出去，随后一戳把它掀掉并
 *   真正落进去。它是本组最便宜、最快的破守手段：守护被掀掉的层数越多，这一下越重。没有守护时它只是一记
 *   极快的戳击。优先度 +2 翻成很短的起手。
 *
 * 与同族分开：强力钻是压上全部重量的直线凿穿；佯攻是**先掀后戳**的轻快探路——玩家凭「快、轻、把罩掀掉」
 *   认出它。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距才在场上看得出来）：
 *   jab        戳击威力：物攻不参与，**速度**给准头与出手的狠度，等级定老练；实招式 ×1.35。
 *   expose     破绽加成：每掀掉一层守护的额外倍率，由**速度与等级**决定；实招式更会抓破绽。
 *   wardBreak  掀护层数：**速度**与等级决定一次能掀几层；实招式 +1。夹 1..3。
 *   reach/rush 突进：**速度**决定起步与每刻推进，身高决定步幅；实招式冲得更远。
 *   radius     判定半径：体型（碰撞箱高度）。
 *   push       撞开：物攻。
 *   sparks     碎光数量：速度与物攻派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；实招式更慢更费。
 *
 * 配置 `commit`（实招，默认关）双向取舍：开＝把假动作收掉真打——威力 ×1.35、每层破绽 +0.1、掀护 +1 层、
 *   突进 ×1.1，代价是起手 +3 刻、收招 +2 刻、冷却 +10 刻；关（佯攻）＝出手极快、冷却短，掀掉守护是它唯一
 *   的重心，伤害很轻。两向各有适用局面（抢在对手重击前掀罩 vs 趁罩空档补一记）。
 *
 * 伤害段 `jab` 与参数同名；原生无接触，故不标 contact。
 */
namespace PokemonSkills {
    actionParameters.define("feint", {
        /** 戳击威力：基础 30；速度每比 60 快 1 加 0.12（夹 −4..14）；等级每比 25 高 1 加 0.15（夹 −3..8）；
         *  实招 ×1.35 / 佯攻 ×0.92；夹 18..72。 */
        jab: formula(
            F.base(30)
                .plus(F.stat("speed").minus(60).times(0.12).clamp(-4, 14))
                .plus(F.level().minus(25).times(0.15).clamp(-3, 8))
                .times(F.when(F.pref("commit", text("worldcombat.skill.feint.preference.commit")), F.const(1.35), F.const(0.92)))
                .clamp(18, 72).round(1),
            "戳击威力", {
                unit: "威力",
                description: "掀掉守护之后那一下的基础威力；速度快的个体戳得准也戳得狠，等级高更老练。对手防御、相性与暴击在命中时另算。实招式收掉假动作、真打出去，威力更高。"
            }),
        /** 破绽加成：基础 0.25；速度每比 60 快 1 加 0.0015（夹 −0.05..0.15）；等级每比 30 高 1 加 0.002（夹 0..0.1）；
         *  实招 +0.1；夹 0.12..0.6。 */
        expose: formula(
            F.base(0.25)
                .plus(F.stat("speed").minus(60).times(0.0015).clamp(-0.05, 0.15))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.1))
                .plus(F.when(F.pref("commit", text("worldcombat.skill.feint.preference.commit")), F.const(0.1), F.const(0)))
                .clamp(0.12, 0.6).round(2),
            "破绽加成", {
                unit: "倍/层",
                description: "每掀掉一层守护，这一戳额外增加的倍率：掀得越干净，露出的破绽越大。速度与等级越高越会抓这个空档。"
            }),
        /** 掀护层数：基础 1；速度每比 70 快 1 加 0.02（夹 0..1.5）；等级每比 40 高 30 级 +1（夹 0..1）；
         *  实招 +1；夹 1..3 并向下取整。 */
        wardBreak: formula(
            F.base(1)
                .plus(F.stat("speed").minus(70).times(0.02).clamp(0, 1.5))
                .plus(F.level().minus(40).div(30).clamp(0, 1))
                .plus(F.when(F.pref("commit", text("worldcombat.skill.feint.preference.commit")), F.const(1), F.const(0)))
                .clamp(1, 3).floor(),
            "掀护层数", {
                unit: "层",
                description: "一次佯攻最多能掀掉目标身上几层守护（守住、看穿、广域防守、硬化都是同一套守护机制，GuardEffects）；守护层不够时有多少掀多少。速度快、等级高的个体一次掀得更多。"
            }),
        /** 突进距离：基础 1.9；速度每比 60 快 1 加 0.006（夹 −0.2..0.7）；身高每比 1.4 高 1 格加 0.25（夹 −0.1..0.5）；
         *  实招 ×1.1；夹 1.4..3.4。 */
        reach: formula(
            F.base(1.9)
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.7))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.5))
                .times(F.when(F.pref("commit"), F.const(1.1), F.const(1)))
                .clamp(1.4, 3.4).round(2),
            "突进距离", {
                unit: "格",
                description: "虚晃之后向前扑进去的距离，也是本招的实际射程来源；速度决定起步、身高决定步幅，实招式扑得更远。"
            }),
        /** 突进速度：基础 0.55 + 速度偏移[−0.08,0.25]；夹 0.4..0.9。 */
        rush: formula(
            F.base(0.55).plus(F.stat("speed").minus(60).times(0.003).clamp(-0.08, 0.25)).clamp(0.4, 0.9).round(2),
            "突进速度", {
                unit: "格/刻",
                description: "向前扑的每刻推进距离；快的个体扑得更急，一气呵成的佯攻更难被走位甩开。"
            }),
        /** 判定半径：基础 0.5 + 高度偏移[−0.06,0.3]；夹 0.4..0.9。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.16).clamp(-0.06, 0.3)).clamp(0.4, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "扑到目标身前时能碰到多大一圈；身板越高大判得越宽。"
            }),
        /** 撞开距离：基础 0.2 + 物攻偏移[−0.04,0.3]；夹 0.05..0.5。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(50).times(0.004).clamp(-0.04, 0.3)).clamp(0.05, 0.5).round(2),
            "撞开距离", {
                unit: "格",
                description: "戳中时把目标顶开一点；物攻越高顶得越远，把露出的空档也推开一点。"
            }),
        /** 碎光数量：基础 12；速度偏移[−2,8] + 物攻偏移[−2,6]；夹 8..30。 */
        sparks: formula(
            F.base(12)
                .plus(F.stat("speed").minus(60).times(0.12).clamp(-2, 8))
                .plus(F.stat("attack").minus(50).times(0.08).clamp(-2, 6))
                .clamp(8, 30).round(0),
            "碎光数量", {
                unit: "点",
                description: "假动作带起的碎光与风痕数量，随速度与物攻增长；粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：基础 4 − 速度偏移[−1,2]；实招 +3；夹 3..10。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2))
                .plus(F.when(F.pref("commit"), F.const(3), F.const(0))).clamp(3, 10).round(0),
            "起手", "虚晃到扑出去之间的时间；速度快的个体起手更短，这一拍就是原生优先度 +2 的对位。实招式先收势再打，多花三刻。"),
        /** 收招：基础 5 − 速度偏移[−1.5,2]；实招 +2；夹 3..10。 */
        recover: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("commit"), F.const(2), F.const(0))).clamp(3, 10).round(0),
            "收招", "扑完把重心收回来的时间；速度越快收得越利落。"),
        /** 冷却：基础 22 − 等级偏移[−2,6]；实招 +10；夹 14..40。 */
        recharge: seconds(
            F.base(22).minus(F.level().minus(20).times(0.15).clamp(-2, 6))
                .plus(F.when(F.pref("commit"), F.const(10), F.const(0))).clamp(14, 40).round(0),
            "冷却", "两次佯攻之间的等待；等级越高越熟练，实招式更费。PP 10 的代价。")
    });

    defineDamage("feint", "jab", {});

    stages("feint", [
        { level: 40, values: { jab: 40, wardBreak: 2 } },
        { level: 58, values: { jab: 50, reach: 2.8 } }
    ]);

    describe("feint", [
        { key: "description.0", values: ["jab","expose"] },
        { key: "description.1", values: ["wardBreak","reach"] },
        { key: "description.2", values: ["radius","push"] },
        { key: "commit.on", values: [], when: function (context) { return read(context.detail.values, ["commit"]) === true; } },
        { key: "commit.off", values: [], when: function (context) { return read(context.detail.values, ["commit"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab", "tier.0.wardBreak"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jab", "tier.1.reach"] }
    ]);
}
