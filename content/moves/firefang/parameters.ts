/**
 * 火焰牙 / firefang 的参数与伤害段。
 *
 * 原生事实：Fire／物理／威力 65／命中 95／PP 15／接触、咬击（bite）；两个独立掷签各 10%：灼伤与畏缩
 *   （Cobblemon 1.8，101 位学习者）。
 *
 * 翻译：把「用覆盖火焰的牙齿咬住对手」落成**咬穿护甲、把火种直接按进伤口**的一口——牙齿先咬穿，
 * 火不是"有时点着"，而是连火属性的身体也挡不住：命中掷签成功时先开一个免疫窗口再点火（共享身份
 * world_combat:status/burn，宝可梦同步为原生灼伤），因此它是本族唯一能烧穿火属性/免疫特性的牙。
 * 咬得够狠时那一口还会把目标咬懵（共享身份 world_combat:status/flinch）。它是本族里唯一**穿透**的一口。
 *
 * 与同族分开：火拳是拳、火会蔓延到邻居；火焰牙是牙，火种穿过免疫烧进肉里。咬住/必杀门牙/咬碎都不含元素状态。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   fang         咬合威力：物攻定咬合力，速度让口齿更快更实；焦焰式把每一口摊薄。
 *   reach/lunge  扑出距离与速度：速度派生；焦焰式收一点、扑得急。
 *   grip         獠牙判定：身高派生。
 *   scorchChance 灼伤几率：物攻（咬合力）与等级决定火种能不能扎进去；焦焰式更高。
 *   scorchTicks  灼伤时长：特攻（火候）与等级决定烧多久；焦焰式更久。
 *   pierceTicks  穿甲窗口：物攻决定免疫窗口撑多久；焦焰式更长。
 *   flinchChance 畏缩几率：速度派生；焦焰式略降。
 *   flinchTicks  畏缩持续：固定 9 刻，焦焰式 +2。
 *   embers       火星数：特攻派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定起手、收招与冷却。
 *
 * 配置 `sear`（焦焰式）双向取舍：开启＝灼伤几率 +12%%、灼伤 ×1.2、穿甲窗口 +15 刻，但咬合威力 ×0.90、
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
        /** 扑出距离：2.0 + 速度偏移[−0.35,1.0]；焦焰 ×0.9 / 快咬 ×1.06；夹 1.5..3.2。 */
        reach: formula(
            F.base(2.0).plus(F.stat("speed").minus(55).times(0.013).clamp(-0.35, 1.0))
                .times(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(0.9), F.const(1.06)))
                .clamp(1.5, 3.2).round(2),
            "扑出距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；腿快的个体扑得更远。焦焰式收得更短。"
            }),
        /** 扑咬速度：0.74 + 速度偏移[−0.12,0.3]；焦焰 ×0.92 / 快咬 ×1.06；夹 0.5..1.1。 */
        lunge: formula(
            F.base(0.74).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.3))
                .times(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(0.92), F.const(1.06)))
                .clamp(0.5, 1.1).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；焦焰式沉一点，快咬式起得更急。"
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
            "灼伤时长", "目标被烧穿后持续燃烧的时长；特攻越高、等级越高烧得越久，焦焰式更久。"),
        /** 穿甲窗口：30 + 物攻偏移[−8,25] + 焦焰 15；夹 20..70。 */
        pierceTicks: seconds(
            F.base(30).plus(F.stat("attack").minus(60).times(0.3).clamp(-8, 25))
                .plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(15), F.const(0)))
                .clamp(20, 70).round(0),
            "穿甲窗口", "牙齿咬穿后免疫失效的窗口；在这段时间里火种无视属性与特性免疫直接落进伤口，物攻越高窗口撑得越久。"),
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
                description: "点火与咬穿时迸出的火星数量，随特攻增长；表现按它发射，画面里的火星数与机制一致。"
            }),
        /** 起手：5 − 速度偏移[−2,1.5] + 焦焰 2；夹 3..11。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.018).clamp(-2, 1.5))
                .plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(2), F.const(0)))
                .clamp(3, 11).round(0),
            "起手", "牙间燃起火种、蓄到能扑出的时间；速度越快越短，焦焰式要多烧一拍。"),
        /** 收招：6 − 速度偏移[−2,1.5]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5)).clamp(3, 10).round(0),
            "收招", "咬完松口、退开半步的收势；速度越快越短。"),
        /** 冷却：16 − 速度偏移[−4,2] + 焦焰 4；夹 9..28。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("sear", text("worldcombat.skill.firefang.preference.sear")), F.const(4), F.const(0)))
                .clamp(9, 28).round(0),
            "冷却", "两口之间牙间火种重新聚起的时间；速度越快回得越快，焦焰式要缓一拍。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    stages("firefang", [
        { level: 26, values: { fang: 72 } },
        { level: 44, values: { fang: 82, scorchChance: 0.42 } }
    ]);

    defineDamage("firefang", "fang", { defenceCoefficient: 0.005,
        rationale: "覆火獠牙的接触咬合；防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("firefang", [
        { key: "description.0", values: ["fang", "grip"] },
        { key: "description.1", values: ["scorchChance", "scorchTicks"] },
        { key: "description.2", values: ["pierceTicks"] },
        { key: "description.3", values: ["flinchChance", "flinchTicks"] },
        { key: "sear.on", values: [], when: function (context) { return read(context.detail.values, ["sear"]) === true; } },
        { key: "sear.off", values: [], when: function (context) { return read(context.detail.values, ["sear"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "cooldown", "pp"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.scorchChance"] }
    ]);
}
