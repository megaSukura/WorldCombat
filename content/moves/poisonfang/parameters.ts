/**
 * 剧毒牙 / poisonfang 的参数与伤害段。
 *
 * 原生事实：Poison／物理／威力 50／命中 100／PP 15／接触、咬击（bite）；50% 概率使目标中剧毒，无畏缩
 *   （Cobblemon 1.8，27 位学习者）。
 *
 * 翻译：把「用有毒的牙齿咬住对手」落成**短咬咬住、压一小拍到毒进去**——本族里咬得最轻、最准的一口，没有畏缩，
 * 卖的完全是那管毒。不扑不冲，合牙的一刻就在口边结算；独有部分在**注毒**：咬中不立刻发作，隔 `pump` 刻毒液才在
 * 伤口里渗开，掷出则加重为剧毒（共享身份 world_combat:status/toxic，宝可梦同步为原生剧毒）；若伤口本来就带着毒，
 * 这一口会**确保**把它加深成剧毒。注毒时目标必须仍在口边且通视，挣脱或移开则毒滴落空、首咬伤保留。
 *
 * 与同族分开：毒针是甩出去的细针、毒击是不出身体只出肢体的重刺；剧毒牙是贴脸的快咬，毒在咬后渗入并加重。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   fang         咬合威力：物攻定咬合力；浓毒式把每一口摊薄。
 *   reach        咬合距离：速度派生；浓毒式收一点、注毒更慢。
 *   grip         獠牙判定：身高派生，也决定注毒时目标要留在多近的口边。
 *   toxicChance  剧毒几率：物攻与等级决定毒牙能不能扎进毒腺；浓毒式更高。
 *   venomTicks   中毒/剧毒时长：特攻（毒液分泌量）与等级决定挂多久；浓毒式更久。
 *   pump         注毒延迟：速度决定咬中到毒液渗开之间隔多久；浓毒式更慢。
 *   drops        毒滴数：特攻派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定起手、收招与冷却。
 *
 * 配置 `venom`（浓毒式）双向取舍：开启＝剧毒几率 +16%%、毒液时长 ×1.25，但咬合威力 ×0.92、注毒延迟 +2 刻、
 * 冷却 +4 刻；关闭（快毒式）＝咬得更重、毒渗得更快，但更难加重为剧毒。两个方向各有局面。
 *
 * 伤害段 `fang` 与参数同名，走共享换算；毒经共享状态路由落到任何战斗者身上（至少中毒，掷出则剧毒）。
 */
namespace PokemonSkills {
    actionParameters.define("poisonfang", {
        /** 咬合威力：50 + 物攻偏移[−10,26]；浓毒 ×0.92 / 快毒 ×1.08；夹 36..110。 */
        fang: formula(
            F.base(50).plus(F.stat("attack").minus(60).times(0.3).clamp(-10, 26))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(0.92), F.const(1.08)))
                .clamp(36, 110).round(1),
            "咬合威力", {
                unit: "威力",
                description: "有毒獠牙咬合这一下的基础威力；物攻给出咬合力。本族里咬得最轻——这一口的价值在毒不在咬。对手防御、相性与暴击在命中时另算。"
            }),
        /** 咬合距离：1.6 + 速度偏移[−0.25,0.7]；浓毒 ×0.94 / 快毒 ×1.05；夹 1.2..2.4。 */
        reach: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.010).clamp(-0.25, 0.7))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(0.94), F.const(1.05)))
                .clamp(1.2, 2.4).round(2),
            "咬合距离", {
                unit: "格",
                description: "从口边到合牙的最前距离，也是本招的实际射程来源；腿快的个体探得更前，也是注毒时目标要留在口边的范围参考。浓毒式收得更短。"
            }),
        /** 獠牙判定：0.40 + 身高偏移[−0.07,0.3]；夹 0.30..0.75。 */
        grip: formula(
            F.base(0.40).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.07, 0.3)).clamp(0.30, 0.75).round(2),
            "獠牙判定", {
                unit: "格",
                description: "这一口扫过的横向判定半径；口部越大咬得越宽，越不容易被侧身让开。"
            }),
        /** 剧毒几率：0.34 + 物攻偏移[−0.08,0.24] + 等级偏移[0,0.12] + 浓毒 0.16；夹 0.20..0.80。 */
        toxicChance: percent(
            F.base(0.34).plus(F.stat("attack").minus(60).times(0.0016).clamp(-0.08, 0.24))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.12))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(0.16), F.const(0)))
                .clamp(0.20, 0.80).round(3),
            "剧毒几率", "毒液渗开时加重为剧毒的概率（原生 50%）；物攻越高咬得越深，浓毒式再抬一档。没掷中则只留下普通中毒。"),
        /** 毒液时长：300 + 特攻偏移[−40,110] + 等级偏移[0,60]；浓毒 ×1.25；夹 200..560。 */
        venomTicks: seconds(
            F.base(300).plus(F.stat("specialAttack").minus(60).times(0.7).clamp(-40, 110))
                .plus(F.level().minus(30).times(1.5).clamp(0, 60))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(1.25), F.const(1)))
                .clamp(200, 560).round(0),
            "毒液时长", "伤口的毒持续多久；特攻（毒液分泌量）越高、等级越高挂得越久，浓毒式更久。"),
        /** 注毒延迟：5 − 速度偏移[−2,1.5] + 浓毒 2；夹 2..11。 */
        pump: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.018).clamp(-2, 1.5))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(2), F.const(0)))
                .clamp(2, 11).round(0),
            "注毒延迟", "咬中到毒液在伤口里渗开之间隔的时间；速度越快渗得越快，浓毒式要慢慢灌。"),
        /** 毒滴数：8 + 特攻偏移[−2,10]；夹 6..18。 */
        drops: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.1).clamp(-2, 10)).clamp(6, 18).round(0),
            "毒滴数", {
                unit: "滴",
                description: "伤口渗出的毒滴数量，随特攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：5 − 速度偏移[−2,1.5] + 浓毒 1；夹 3..10。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.018).clamp(-2, 1.5))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(1), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "毒牙蓄到能扑出的时间；速度越快越短，浓毒式多蓄半拍。"),
        /** 收招：6 − 速度偏移[−2,1.5]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5)).clamp(3, 10).round(0),
            "收招", "咬完松口、退开半步的收势；速度越快越短。"),
        /** 冷却：15 − 速度偏移[−4,2] + 浓毒 4；夹 9..27。 */
        recharge: seconds(
            F.base(15).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.poisonfang.preference.venom")), F.const(4), F.const(0)))
                .clamp(9, 27).round(0),
            "冷却", "两口之间毒腺重新蓄满的时间；速度越快回得越快，浓毒式要缓一拍。")
    });

    stages("poisonfang", [
        { level: 28, values: { fang: 57 } },
        { level: 46, values: { fang: 65, toxicChance: 0.46, venomTicks: 420 } }
    ]);

    defineDamage("poisonfang", "fang", { defenceCoefficient: 0.005,
        rationale: "有毒獠牙的接触咬合；防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("poisonfang", [
        { key: "description.0", values: ["fang", "grip"] },
        { key: "description.pounce", values: ["reach"] },
        { key: "description.1", values: ["pump","toxicChance","venomTicks"] },
        { key: "description.poison", values: [] },
        { key: "venom.on", values: [], when: function (context) { return read(context.detail.values, ["venom"]) === true; } },
        { key: "venom.off", values: [], when: function (context) { return read(context.detail.values, ["venom"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "cooldown", "pp"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.toxicChance"] }
    ]);
}
