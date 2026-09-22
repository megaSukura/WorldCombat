/**
 * 火焰拳 / firepunch 的参数与伤害段。
 *
 * 原生事实：Fire、物理、威力 75、命中 100、PP 15、接触、拳类，命中后 10% 概率使目标灼伤
 *   （Cobblemon 1.8，全招 160 位学习者）。
 *
 * 翻译：把「充满火焰的拳头」落成**一记把火种按进目标的拳**——拳本身不重，真正留下的是那点火：
 * 命中后目标被点燃（共享身份 world_combat:status/burn，持续掉血并因灼伤减攻），并且只要它真的烧起来，
 * 火就会顺势蔓延到旁边最近的一个敌人身上。它是本族唯一的**持续伤害**招：不追求一拳的爆发，
 * 追求打完很久还在烧；能不能点着、烧多久、烧到谁，都取决于施法者的特攻与火候。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   blaze       拳威：物攻定拳劲，特攻定火候；烈焰式让每一拳更轻。
 *   scorchChance 点燃概率：特攻定火种强度，等级再补；烈焰式更高。
 *   scorchTicks 灼伤时长：特攻与等级决定烧多久；烈焰式更久。
 *   spreadRange 火焰蔓延距离：身高决定火能舐到多远的邻敌；烈焰式更远。
 *   spreadTicks 蔓延灼伤时长：特攻派生，比主目标短。
 *   fistReach   拳程：身高与体宽决定拳头够多远。
 *   collisionRadius 拳面判定：身高派生。
 *   jab/tempo/aftercast/recharge：速度决定出拳延迟、起手、收招与冷却。
 *   embers      火星数：特攻派生，表现按它发射。
 *
 * 配置 `blazeUp`（烈焰式）双向取舍：开启＝点燃概率 +15%%、灼伤更长（×1.15）、蔓延更远（×1.25），
 * 但拳威 ×0.88、冷却 +5 刻；关闭（点火式）＝拳更重、循环更快，但火种更难点着、蔓延更近。
 *
 * 伤害段 `blaze` 走共享换算；灼伤经 `status: "burn"` 走共享状态路由（宝可梦同步为原生灼伤）。
 */
namespace PokemonSkills {
    actionParameters.define("firepunch", {
        /** 拳威：72 + 物攻偏移[−14,40] + 特攻偏移[−5,12]；烈焰 ×0.88；夹 48..152。 */
        blaze: formula(
            F.base(72).plus(F.stat("attack").minus(60).times(0.45).clamp(-14, 40))
                .plus(F.stat("specialAttack").minus(60).times(0.12).clamp(-5, 12))
                .times(F.when(F.pref("blazeUp", text("worldcombat.skill.firepunch.preference.blazeUp")), F.const(0.88), F.const(1)))
                .clamp(48, 152).round(1),
            "拳威", {
                unit: "威力",
                description: "这一记火拳命中的基础威力；物攻定拳劲，特攻定火候，烈焰式把每一拳摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 点燃概率：0.35 + 特攻偏移[−0.10,0.25] + 等级偏移[0,0.12] + 烈焰 0.15；夹 0.20..0.80。 */
        scorchChance: percent(
            F.base(0.35).plus(F.stat("specialAttack").minus(60).times(0.0018).clamp(-0.10, 0.25))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.12))
                .plus(F.when(F.pref("blazeUp", text("worldcombat.skill.firepunch.preference.blazeUp")), F.const(0.15), F.const(0)))
                .clamp(0.20, 0.80).round(3),
            "点燃概率", "命中后把目标点着的概率；特攻越高火种越烈，烈焰式更容易点着。"),
        /** 灼伤时长：180 + 特攻偏移[−30,80] + 等级偏移[0,50]；烈焰 ×1.15；夹 100..340。 */
        scorchTicks: seconds(
            F.base(180).plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-30, 80))
                .plus(F.level().minus(30).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("blazeUp", text("worldcombat.skill.firepunch.preference.blazeUp")), F.const(1.15), F.const(1)))
                .clamp(100, 340).round(0),
            "灼伤时长", "目标被点着后持续燃烧的时长；特攻越高、等级越高烧得越久，烈焰式更久。"),
        /** 火焰蔓延距离：2.4 + 身高偏移[−0.2,0.8]；烈焰 ×1.25；夹 1.8..4.2。 */
        spreadRange: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.8))
                .times(F.when(F.pref("blazeUp", text("worldcombat.skill.firepunch.preference.blazeUp")), F.const(1.25), F.const(1)))
                .clamp(1.8, 4.2).round(2),
            "火焰蔓延距离", {
                unit: "格",
                description: "目标烧起来后，火能舐到多远的另一个敌人；个子越高够得越远，烈焰式更远。"
            }),
        /** 蔓延灼伤时长：100 + 特攻偏移[−16,50]；夹 60..200。 */
        spreadTicks: seconds(
            F.base(100).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-16, 50)).clamp(60, 200).round(0),
            "蔓延灼伤时长", "被蔓延点着的邻居燃烧的时长，比主目标短一些；特攻越高越久。"),
        /** 拳程：2.2 + 身高偏移[−0.2,0.6] + 体宽偏移[−0.1,0.4]；夹 2.1..3.2。 */
        fistReach: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.2, 0.6))
                .plus(F.body("width").minus(0.9).times(0.35).clamp(-0.1, 0.4))
                .clamp(2.1, 3.2).round(2),
            "拳程", {
                unit: "格",
                description: "这一记火拳能探到的距离；臂展与身板越大够得越远。它也是本招的实际射程来源。"
            }),
        /** 拳面判定：0.45 + 身高偏移[−0.05,0.3]；夹 0.36..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3)).clamp(0.36, 0.8).round(2),
            "拳面判定", {
                unit: "格",
                description: "出拳时拳面能扫到多大范围；个子越大判定越宽。"
            }),
        /** 出拳延迟：4 − 速度偏移[−1,2]；夹 2..7。 */
        jab: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2)).clamp(2, 7).round(0),
            "出拳延迟", "提交到真正出拳之间的引火时间；速度越快出拳越急。"),
        /** 起手：6 − 速度偏移[−1.5,2.5] + 烈焰 2 / 点火 −1；夹 3..11。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("blazeUp", text("worldcombat.skill.firepunch.preference.blazeUp")), F.const(2), F.const(-1)))
                .clamp(3, 11).round(0),
            "起手", "拳头缠上火焰、蓄到能提交的时间；速度越快越短，烈焰式要多烧一拍。"),
        /** 收招：6 − 速度偏移[−1,2]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(3, 10).round(0),
            "收招", "打完这一拳后收势的时间；速度越快越短。"),
        /** 冷却：24 − 速度偏移[−4,6] + 烈焰 5；夹 15..36。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("blazeUp", text("worldcombat.skill.firepunch.preference.blazeUp")), F.const(5), F.const(0)))
                .clamp(15, 36).round(0),
            "冷却", "两拳之间的等待；速度越快回得越快，烈焰式要缓一拍。"),
        /** 火星数：6 + 特攻偏移[−1,6]；夹 5..14。 */
        embers: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-1, 6)).clamp(5, 14).round(0),
            "火星数", {
                unit: "颗",
                description: "点燃时迸出的火星数量，随特攻增长；表现按它发射，画面里的火星数与机制一致。"
            })
    });

    stages("firepunch", [
        { level: 32, values: { blaze: 82 } },
        { level: 50, values: { blaze: 94, scorchChance: 0.45 } }
    ]);

    defineDamage("firepunch", "blaze", {}, { contact: true, punch: true });

    describe("firepunch", [
        { key: "description.0", values: ["blaze", "fistReach"] },
        { key: "description.1", values: ["scorchChance", "scorchTicks"] },
        { key: "description.2", values: ["spreadRange", "spreadTicks"] },
        { key: "blazeUp.on", values: [], when: function (context) { return read(context.detail.values, ["blazeUp"]) === true; } },
        { key: "blazeUp.off", values: [], when: function (context) { return read(context.detail.values, ["blazeUp"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blaze"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blaze", "tier.1.scorchChance"] }
    ]);
}
