/**
 * 增强拳 / poweruppunch 的参数与伤害段。
 *
 * 原生事实：格斗、物理、威力 40、命中 100、PP 20、优先度 0、接触、拳类；命中后 100% 令自身攻击 +1。
 * 全招 208 位学习者（本波里学习者最多的一招），是「打一下就硬一分」的起势拳。
 *
 * 翻译：把「反复击打使拳头变硬、打中攻击就提高」翻成一记**短促直拳**——拳本身不重，价值在于每一记都真的
 *   落上去，落上去就把拳头硬化一档（`NativeEffects.boost(...,"atk",gain)`，写入公共能力阶梯），并刷新
 *   共享身份 `world_combat:status/hardened` 的「拳硬」窗口。硬化不是文字：物攻等级提高后，下一记直拳经由
 *   共享伤害结算拿到更高的有效攻击，所以「越来越硬」直接发生在伤害上。原生的回合制永久 +1 被翻成即时
 *   交战窗口：只要还在打，硬化就续着；停手后窗口到期，这段升起的等级由 skill.ts 原样收回。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距因此能看出不同）：
 *   jab     拳威力：物攻定拳头的分量、速度定出拳的寸劲。
 *   gain    硬化级数：配置决定一记加 1 还是蓄劲一记加 2。
 *   window  拳硬窗口：物攻与等级决定这口气能撑多久；蓄劲更久。
 *   reach   拳程：实时碰撞箱宽度决定能探多远。
 *   radius  拳面判定：身高决定拳头的判定大小。
 *   knock   顶开：体重决定这一拳能把人推多远。
 *   sparks  拳火花数：物攻派生，表现按它发射（数量与机制一致）。
 *   tempo/aftercast/recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `charge`（蓄劲拳）双向取舍：开启＝起手更久、本拳更轻，但一记硬化 2 级、窗口 ×1.4、冷却更短——
 *   用时间换更陡的起势；关闭（速拳）＝出手快、本拳更重，但一记只硬 1 级、窗口更短、冷却更长——
 *   用起势换每一下的即时收益。两个方向各有适用局面。
 *
 * 伤害段 `jab` 走共享换算（对手防御、相性、暴击在命中时另算）；接触与拳类标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("poweruppunch", {
        /** 拳威力：18 + 物攻偏移[−4,14] + 速度偏移[−1,4]；蓄劲 ×0.8 / 速拳 ×1.12；夹 10..42。 */
        jab: formula(
            F.base(18)
                .plus(F.stat("attack").minus(45).times(0.10).clamp(-4, 14))
                .plus(F.stat("speed").minus(45).times(0.03).clamp(-1, 4))
                .times(F.when(F.pref("charge", text("worldcombat.skill.poweruppunch.preference.charge")), F.const(0.8), F.const(1.12)))
                .clamp(10, 42).round(1),
            "拳威力", {
                unit: "威力",
                description: "直拳本体的威力；物攻定拳头分量、速度定出拳寸劲。它不重，价值在每一记都算数——物攻等级抬起来后，这一拳经共享结算会更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 硬化级数：蓄劲 2 / 速拳 1；夹 1..2。 */
        gain: formula(
            F.when(F.pref("charge", text("worldcombat.skill.poweruppunch.preference.charge")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "硬化级数", {
                unit: " 级",
                description: "每一记命中抬高的攻击等级；蓄劲一记抬 2 级（最快三记到顶），速拳一记抬 1 级。物攻等级上限为 6。"
            }),
        /** 拳硬窗口：110 + 物攻偏移[−15,45] + 等级≥25偏移[0,30]；蓄劲 ×1.4；夹 90..320。 */
        window: seconds(
            F.base(110)
                .plus(F.stat("attack").minus(45).times(0.5).clamp(-15, 45))
                .plus(F.level().minus(25).times(0.8).clamp(0, 30))
                .times(F.when(F.pref("charge", text("worldcombat.skill.poweruppunch.preference.charge")), F.const(1.4), F.const(1)))
                .clamp(90, 320).round(0),
            "拳硬窗口", "「拳已变硬」这口气能撑多久；物攻越高、等级越高撑得越久。窗口内每次命中都会刷新它，停手后到期并收回这段等级。"),
        /** 拳程：2.2 + 碰撞箱宽度偏移[−0.1,0.5]；夹 2.0..2.8。 */
        reach: formula(
            F.base(2.2).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.5)).clamp(2.0, 2.8).round(2),
            "拳程", {
                unit: "格",
                description: "直拳能探到的距离；身体越宽够得越远。它加上一点出手余量就是本招的实际射程。"
            }),
        /** 拳面判定：0.5 + 身高偏移[−0.05,0.3]；夹 0.4..0.8。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.3)).clamp(0.4, 0.8).round(2),
            "拳面判定", {
                unit: "格",
                description: "拳头能打到多大范围；大个子拳面更大、更容易蹭到人。"
            }),
        /** 顶开：0.12 + 体重偏移[−0.04,0.25]；夹 0.06..0.36。 */
        knock: formula(
            F.base(0.12).plus(F.body("weight").minus(40).times(0.002).clamp(-0.04, 0.25)).clamp(0.06, 0.36).round(2),
            "顶开", {
                unit: "格",
                description: "拳头落下时把目标顶开多远；体重越大推得越实。"
            }),
        /** 拳火花数：16 + 物攻偏移[−4,20]；夹 12..40。 */
        sparks: formula(
            F.base(16).plus(F.stat("attack").minus(45).times(0.15).clamp(-4, 20)).clamp(12, 40).round(0),
            "拳火花数", {
                unit: "点",
                description: "拳面撞出的火花数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−1,2]；蓄劲 ×1.9；夹 4..20。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 2))
                .times(F.when(F.pref("charge", text("worldcombat.skill.poweruppunch.preference.charge")), F.const(1.9), F.const(1)))
                .clamp(4, 20).round(0),
            "起手", "收拳、拧腰到能打出这一记的时间；速度越快越短，蓄劲更久。"),
        /** 收招：7 − 速度偏移[−1,2]；夹 4..10。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "打完一记后收势的时间；速度越快收得越快。"),
        /** 冷却：26 − 速度偏移[−2,5]；蓄劲 ×0.8；夹 14..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(45).times(0.04).clamp(-2, 5))
                .times(F.when(F.pref("charge", text("worldcombat.skill.poweruppunch.preference.charge")), F.const(0.8), F.const(1)))
                .clamp(14, 40).round(0),
            "冷却", "再次出拳前的等待；速度越快回得越快，蓄劲循环更顺。PP 20 的代价。")
    });

    stages("poweruppunch", [
        { level: 25, values: { jab: 22 } },
        { level: 45, values: { jab: 28, window: 170 } }
    ]);

    defineDamage("poweruppunch", "jab", {}, { contact: true, punch: true });

    describe("poweruppunch", [
        { key: "description.0", values: ["jab","reach","radius"] },
        { key: "description.1", values: ["gain","window","knock"] },
        { key: "charge.on", values: [], when: function (context) { return read(context.detail.values, ["charge"]) === true; } },
        { key: "charge.off", values: [], when: function (context) { return read(context.detail.values, ["charge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jab", "tier.1.window"] }
    ]);
}
