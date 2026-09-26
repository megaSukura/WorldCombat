/**
 * 火焰牙 / firefang 的参数与伤害段。
 *
 * 原生事实：Fire／物理／威力 65／命中 95／PP 15／接触、咬击（bite）；两个独立掷签各 10%：灼伤与畏缩
 *   （Cobblemon 1.8，101 位学习者）。
 *
 * 翻译：把「用覆盖火焰的牙齿咬住对手」落成**短咬一口、把火按进伤口**——不扑不冲，合牙的一刻就在口边结算；
 * 命中掷签成功时按共享身份 world_combat:status/burn 点着火（宝可梦同步为原生灼伤），但点火走原生免疫：
 * 火属性或免疫特性的身体点不着，火只在表面散开，不再穿甲。咬得够狠时那一口还会把目标咬懵
 * （共享身份 world_combat:status/flinch）。
 *
 * 与同族分开：火拳是拳、火会蔓延到邻居；火焰牙是牙，最短最直接，只对近敌生效。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   fang         咬合威力：物攻定咬合力，速度让口齿更快更实；焦焰式把每一口摊薄。
 *   reach        咬合距离：速度派生；焦焰式收一点。
 *   grip         獠牙判定：身高派生。
 *   scorchChance 灼伤几率：物攻（咬合力）与等级决定火种能不能扎进去；焦焰式更高。
 *   scorchTicks  灼伤时长：特攻（火候）与等级决定烧多久；焦焰式更久。
 *   flinchChance 畏缩几率：速度派生；焦焰式略降。
 *   flinchTicks  畏缩持续：固定 9 刻，焦焰式 +2。
 *   embers       火星数：特攻派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定起手、收招与冷却。
 *
 * 配置 `sear`（焦焰式）双向取舍：开启＝灼伤几率 +12%%、灼伤时长 ×1.2，但咬合威力 ×0.90、
 * 起手 +2 刻、冷却 +4 刻；关闭（快咬式）＝咬得更重、循环更快，但火种更难扎进去。两个方向各有局面。
 *
 * 伤害段 `fang` 与参数同名，走共享换算（原生类别 Physical，Fire 属性）；接触与咬合标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("firefang", {
        /** 咬合威力：64 + 物攻偏移[−12,34] + 速度偏移[−3,10]；焦焰 ×0.90 / 快咬 ×1.05；夹 46..140。 */
        fang: formula(
            F.base(64).plus(F.stat("attack").minus(60).times(0.32).clamp(-12, 34))
                .plus(F.stat("speed").minus(55).times(0.08).clamp(-3, 10))
                .times(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(0.90), F.const(1.05)))
                .clamp(46, 140).round(1),
            "咬合威力", {
                unit: "威力",
                description: "覆火獠牙咬合这一下的基础威力；物攻给出咬合力、速度让口齿更快更实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 咬合距离：1.6 + 速度偏移[−0.25,0.7]；焦焰 ×0.94 / 快咬 ×1.04；夹 1.1..2.4。 */
        reach: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.010).clamp(-0.25, 0.7))
                .times(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(0.94), F.const(1.04)))
                .clamp(1.1, 2.4).round(2),
            "咬合距离", {
                unit: "格",
                description: "从口边到合牙的最前距离，也是本招的实际射程来源；腿快的个体探得更前。焦焰式收得更短。"
            }),
        /** 獠牙判定：0.42 + 身高偏移[−0.07,0.3]；夹 0.32..0.78。 */
        grip: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.07, 0.3)).clamp(0.32, 0.78).round(2),
            "獠牙判定", {
                unit: "格",
                description: "这一口扫过的横向判定半径；口部越大咬得越宽，越不容易被侧身让开。"
            }),
        /** 灼伤几率：0.32 + 物攻偏移[−0.08,0.22] + 等级偏移[0,0.12] + 焦焰 0.12；夹 0.18..0.72。 */
        scorchChance: percent(
            F.base(0.32).plus(F.stat("attack").minus(60).times(0.0016).clamp(-0.08, 0.22))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.12))
                .plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(0.12), F.const(0)))
                .clamp(0.18, 0.72).round(3),
            "灼伤几率", "咬实后把火种按进伤口的概率（原生 10%）；物攻越高咬得越穿、火种越容易扎进去，焦焰式再抬一档。"),
        /** 灼伤时长：200 + 特攻偏移[−28,80] + 等级偏移[0,40]；焦焰 ×1.2；夹 120..360。 */
        scorchTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(60).times(0.55).clamp(-28, 80))
                .plus(F.level().minus(30).times(1).clamp(0, 40))
                .times(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(1.2), F.const(1)))
                .clamp(120, 360).round(0),
            "灼伤时长", "目标被点着后持续燃烧的时长；特攻越高、等级越高烧得越久，焦焰式更久。"),
        /** 畏缩几率：0.20 + 速度偏移[−0.05,0.12]；焦焰 ×0.85；夹 0.08..0.46。 */
        flinchChance: percent(
            F.base(0.20).plus(F.stat("speed").minus(55).times(0.0011).clamp(-0.05, 0.12))
                .times(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(0.85), F.const(1)))
                .clamp(0.08, 0.46).round(3),
            "畏缩几率", "咬实时的畏缩几率（原生 10%）；速度越快越容易一口气把对手咬懵，焦焰式力道分散、略降。"),
        /** 畏缩持续：9 刻，焦焰 +2；夹 6..16。 */
        flinchTicks: seconds(
            F.base(9).plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "畏缩持续", "被咬懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 火星数：6 + 特攻偏移[−1,6]；夹 5..14。 */
        embers: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.07).clamp(-1, 6)).clamp(5, 14).round(0),
            "火星数", {
                unit: "颗",
                description: "点火与散火时迸出的火星数量，随特攻增长；表现按它发射，画面里的火星数与机制一致。"
            }),
        /** 起手：5 − 速度偏移[−2,1.5] + 焦焰 2；夹 3..11。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.018).clamp(-2, 1.5))
                .plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(2), F.const(0)))
                .clamp(3, 11).round(0),
            "起手", "牙间燃起火种、蓄到能合牙的时间；速度越快越短，焦焰式要多烧一拍。"),
        /** 收招：6 − 速度偏移[−2,1.5]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5)).clamp(3, 10).round(0),
            "收招", "咬完松口、退开半步的收势；速度越快越短。"),
        /** 冷却：16 − 速度偏移[−4,2] + 焦焰 4；夹 9..28。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(4), F.const(0)))
                .clamp(9, 28).round(0),
            "冷却", "两口之间牙间火种重新聚起的时间；速度越快回得越快，焦焰式要缓一拍。")
    });

    stages("firefang", [
        { level: 26, values: { fang: 72 } },
        { level: 44, values: { fang: 82, scorchChance: 0.42 } }
    ]);

    defineDamage("firefang", "fang", { defenceCoefficient: 0.005,
        rationale: "覆火獠牙的接触咬合；防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("firefang", [
        { key: "description.0", values: ["fang", "grip"] },
        { key: "description.1", values: ["scorchChance","scorchTicks"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["flinchChance","flinchTicks"] },
        { key: "sear.on", values: [], when: function (context) { return read(context.detail.values, ["sear"]) === true; } },
        { key: "sear.off", values: [], when: function (context) { return read(context.detail.values, ["sear"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "cooldown", "pp"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.scorchChance"] }
    ]);
}
