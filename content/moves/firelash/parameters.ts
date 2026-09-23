/**
 * 火焰鞭 / firelash 的参数与伤害段。本族「拆甲换力」的剥甲型——唯一让对手付防御代价的一招。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fire／物理／威力 80／命中 100／PP 15／优先度 0／接触；
 *   secondary: { chance: 100, boosts: { def: -1 } }（命中必然让目标防御下降 1 级）；target normal（单体）。4 位学习者。
 *   描述「用燃烧的鞭子抽打对手。受到攻击的对手防御会降低」。
 *
 * 翻译：把「用燃烧的鞭子抽打、对手防御下降」翻成一条**渐次亮起的长火鞭**——先在手边点起火苗、把鞭梢拉长，
 *   再甩出去抽在目标身上；命中必然把目标的护甲烧软（防御 −1），鞭痕在落点留一小簇余火。它不让自己付代价，
 *   而是把对手的甲剥下来给后续攻击开路，是本族里唯一的「投资型」招式。
 *
 * 与同族分开：蛮力/鳞射/鳞片噪音都是自己付防御；火焰鞭**剥对手的甲**。与强力鞭打分开：强力鞭打是草色、
 *   一道远而宽的横扫弧面；火焰鞭是火色、单目标的一条长鞭，鞭梢缠住落点把甲烧软。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   lash   鞭击威力：物攻给鞭劲、速度给甩鞭的末端速度、等级拾级抬升；缠卷式收薄。
 *   reach  鞭长：身高给长肢长度、速度给一点伸展（也是本招射程）；缠卷式略短。
 *   melt   剥甲级：原生 1 级；缠卷式两级。
 *   drag   拖拽距离：物攻给拉力，**目标体重**把拖拽距离压下来；只有缠卷式有。
 *   slowTicks 减速时长：缠卷式命中后目标被拖住多久；只有缠卷式有。
 *   tempo/aftercast/recharge：速度定节奏，缠卷式更慢更长。
 *
 * 配置 `entangle`（缠卷式，默认关）双向取舍：
 *   开＝命中后把目标朝自己拖 `drag` 格并短暂减速、剥甲两级；代价是威力 ×0.82、射程 ×0.85、起手 +3 刻、收招 +2 刻、冷却 +6 刻。
 *   关（鞭挞式）＝更远、更重的一记，剥甲一级，出手更快。
 *
 * 伤害段 `lash` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const firelashMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("firelash", {
        /** 鞭击威力：基础 80；物攻每比 55 多 1 加 0.5（夹 −14..34）；速度每比 55 快 1 加 0.18（夹 −5..14）；
         *  等级每比 25 多 1 加 0.35（夹 0..14）；缠卷 ×0.82 / 鞭挞 ×1.0；夹 52..150。 */
        lash: formula(
            F.base(80)
                .plus(F.stat("attack").minus(55).times(0.5).clamp(-14, 34))
                .plus(F.stat("speed").minus(55).times(0.18).clamp(-5, 14))
                .plus(F.level().minus(25).times(0.35).clamp(0, 14))
                .times(F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")), F.const(0.82), F.const(1.0)))
                .clamp(52, 150).round(1),
            "鞭击威力", {
                unit: "威力",
                description: "燃烧的长鞭抽在目标身上的基础威力；物攻给鞭劲、速度给甩出末端的抽击力，等级越高火越旺。缠卷式把能量分给拖拽，单发略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 鞭长：基础 4.2 格；身高每比 1.4 高 1 格加 0.8（夹 −0.4..1.8）；速度每比 55 快 1 加 0.008（夹 −0.2..0.5）；
         *  缠卷 ×0.85；夹 3.4..6.4。 */
        reach: formula(
            F.base(4.2)
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.4, 1.8))
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5))
                .times(F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")), F.const(0.85), F.const(1.0)))
                .clamp(3.4, 6.4).round(2),
            "鞭长", {
                unit: "格",
                description: "火鞭甩出去能够到多远，也是本招的射程与画面里那道鞭身的长度；肢体越长够得越远，缠卷式收短。"
            }),
        /** 剥甲级：基础 1 级；缠卷式 +1；夹 1..6。 */
        melt: formula(
            F.const(1).plus(F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")), F.const(1), F.const(0))).clamp(1, 6).round(0),
            "剥甲级", {
                unit: "级",
                description: "命中必然把目标防御下降几级；原生 1 级，缠卷式缠得更死、剥两级。这是本招给后续攻击的投资。"
            }),
        /** 拖拽距离：缠卷式 = 1.0 + 物攻偏移[0,0.9] − 目标体重抵扣[0,0.8] / 鞭挞式 = 0；夹 0..2.0。 */
        drag: formula(
            F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")),
                F.base(1.0).plus(F.stat("attack").minus(55).times(0.014).clamp(0, 0.9))
                    .minus(firelashMassNode.minus(300).times(0.0008).clamp(0, 0.8)), F.const(0))
                .clamp(0, 2.0).round(2),
            "拖拽距离", {
                unit: "格",
                description: "缠卷式命中后把目标朝自己拖近多少；物攻越强拉得越紧，目标越重越拉不动。只有缠卷式有。"
            }),
        /** 减速时长：缠卷式 = 40 + 等级偏移[0,20] / 鞭挞式 = 0；夹 0..80。 */
        slowTicks: seconds(
            F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")),
                F.base(40).plus(F.level().minus(25).times(0.7).clamp(0, 20)), F.const(0))
                .clamp(0, 80).round(0),
            "减速时长", "缠卷式缠住目标后它被拖慢多久；等级越高缠得越久。只有缠卷式有。"),
        /** 起手：基础 11 刻；速度每比 55 快 1 减 0.035（夹 −1.5..2.5）；缠卷 +3；夹 6..16。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.035).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "在手边点起火苗、把鞭梢拉长的时间；速度越快越短，缠卷式要多绕一圈。"),
        /** 收招：基础 9 刻；速度每比 55 快 1 减 0.03（夹 −1..2）；缠卷 +2；夹 5..15。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "收招", "把甩出去的火鞭收回来的时间；缠卷式还要把目标拖稳，收得稍久。"),
        /** 冷却：基础 34 刻；速度每比 55 快 1 减 0.07（夹 −4..7）；缠卷 +6 / 鞭挞 −2；夹 22..50。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.07).clamp(-4, 7))
                .plus(F.when(F.pref("entangle", text("worldcombat.skill.firelash.preference.entangle")), F.const(6), F.const(-2)))
                .clamp(22, 50).round(0),
            "冷却", "再甩一鞭之前等待多久；鞭挞式更利落，缠卷式更久。")
    });

    stages("firelash", [
        { level: 30, values: { lash: 90 } },
        { level: 50, values: { lash: 102, reach: 5.0 } }
    ]);

    defineDamage("firelash", "lash", {}, { contact: true });

    describe("firelash", [
        { key: "description.0", values: ["lash","melt"] },
        { key: "description.1", values: ["reach", "tempo"] },
        { key: "entangle.on", values: ["drag","slowTicks"], when: function (context) { return read(context.detail.values, ["entangle"]) === true; } },
        { key: "entangle.off", values: [], when: function (context) { return read(context.detail.values, ["entangle"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.reach"] }
    ]);
}
