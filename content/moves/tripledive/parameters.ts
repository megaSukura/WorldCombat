/**
 * 三连钻 / tripledive 的参数与伤害段。
 *
 * 原生事实：水、物理、威力 30、命中 95、PP 10、优先度 0、接触、连续 3 次（`multihit: 3`）、无追加效果。
 * 全招 1 位学习者（轻身鳕 / Veluza）。
 *
 * 翻译：把「以默契的跳跃溅起水花击向对手、连续 3 次」翻成**三次利落的钻击**——每一次是一记落下的水花，
 *   不是三支箭同时离弦，也不是一根骨头去一回。三次的「默契」落在两处：一是节奏固定，三下之间的间隔由速度
 *   决定、连成一串；二是**水留在身上**——每一次命中都把目标打湿（共享身份 `world_combat:status/drenched`），
 *   已经湿透的目标被下一钻打得更重（`soakBonus`）。所以三下都落在同一个目标上时，第三下最重；中间任一下走空，
 *   后面的钻击就少一层加成。原生的固定 30×3 被翻成一次出手里三记可各躲的落点。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距因此能看出不同）：
 *   splash   每钻威力：物攻定落下的分量、速度定钻入的急。
 *   soakBonus 湿身加成：物攻决定水压，已经湿透的目标吃到的倍数。
 *   leap     跳跃高度：体重决定跳得多高（越重越低）。
 *   diveSpan 钻击距离：碰撞箱宽度决定够得多远。
 *   diveRadius 水花判定：身高决定一次钻击扫过的范围。
 *   interval 节拍：速度决定三钻连得多紧；配置的深潜更慢。
 *   drenchTicks 湿身时长：物攻与等级决定水留在身上多久。
 *   splashes 水花点数：物攻派生，表现按它发射。
 *   tempo/recover/recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `plunge`（深潜）双向取舍：开启＝跳得更高、每钻重 20%、水花判定更大、湿身更久，但节拍更慢、冷却更久
 *   ——更难躲、更痛，但给对手更长的窗口；关闭（连跳，默认）＝三钻更快、每钻轻 10%、循环更短，但水花更小、
 *   湿身更短——更稳更密，单下更轻。两个方向各有适用局面。
 *
 * 伤害段 `splash` 走共享换算（对手防御、相性、暴击在每钻命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("tripledive", {
        /** 每钻威力：14 + 物攻偏移[−3,12] + 速度偏移[−1,4]；深潜 ×1.2 / 连跳 ×0.9；夹 9..34。 */
        splash: formula(
            F.base(14)
                .plus(F.stat("attack").minus(45).times(0.09).clamp(-3, 12))
                .plus(F.stat("speed").minus(45).times(0.03).clamp(-1, 4))
                .times(F.when(F.pref("plunge", text("worldcombat.skill.tripledive.preference.plunge")), F.const(1.2), F.const(0.9)))
                .clamp(9, 34).round(1),
            "每钻威力", {
                unit: "威力",
                description: "一次钻击的威力；三下各结算一次，都命中时合计约等于一次完整三连钻。物攻定分量、速度定钻入的急。已经湿透的目标在这一项上再乘湿身加成。对手防御、相性与暴击在每钻命中时另算。"
            }),
        /** 湿身加成：1.12 + 物攻偏移[−0.02,0.12]；夹 1.05..1.3。 */
        soakBonus: percent(
            F.base(1.12).plus(F.stat("attack").minus(45).times(0.0015).clamp(-0.02, 0.12)).clamp(1.05, 1.3).round(3),
            "湿身加成", "目标已经带着「湿透」时，这一钻吃到的伤害倍数；物攻越高的水压越大。三钻都命中同一个目标时，第二、三钻自动拿到它。"),
        /** 跳跃高度：0.5 + 体重偏移[−0.18,0.22]；深潜 ×1.5；夹 0.35..1.1。 */
        leap: formula(
            F.base(0.5).plus(F.body("weight").minus(40).times(0.004).clamp(-0.18, 0.22))
                .times(F.when(F.pref("plunge", text("worldcombat.skill.tripledive.preference.plunge")), F.const(1.5), F.const(1)))
                .clamp(0.35, 1.1).round(2),
            "跳跃高度", {
                unit: "格",
                description: "每一钻起跳的高度；体重越轻跳得越高。深潜整体再抬高一档，从更高处落下。画面里起跳溅起的水点数量按它发射。"
            }),
        /** 钻击距离：2.8 + 碰撞箱宽度偏移[−0.15,0.6]；夹 2.6..3.4。 */
        diveSpan: formula(
            F.base(2.8).plus(F.body("width").minus(0.9).times(0.4).clamp(-0.15, 0.6)).clamp(2.6, 3.4).round(2),
            "钻击距离", {
                unit: "格",
                description: "一次钻击能够到多远；身体越宽够得越远。它加上一点出手余量就是本招的实际射程来源。"
            }),
        /** 水花判定：0.55 + 身高偏移[−0.06,0.35]；深潜 ×1.2；夹 0.45..1.0。 */
        diveRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.13).clamp(-0.06, 0.35))
                .times(F.when(F.pref("plunge", text("worldcombat.skill.tripledive.preference.plunge")), F.const(1.2), F.const(1)))
                .clamp(0.45, 1.0).round(2),
            "水花判定", {
                unit: "格",
                description: "一次钻击溅起的水花能扫到多大范围；大个子水花更大，深潜再放宽一档。"
            }),
        /** 节拍：5 − 速度偏移[−1,1.5]；深潜 +2；夹 3..9。 */
        interval: seconds(
            F.base(5).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("plunge", text("worldcombat.skill.tripledive.preference.plunge")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "节拍", "两钻之间隔多久；速度越快连得越紧，深潜更慢、给对手更长的躲闪窗口。"),
        /** 湿身时长：70 + 物攻偏移[−10,40] + 等级≥25偏移[0,30]；深潜 ×1.25；夹 60..220。 */
        drenchTicks: seconds(
            F.base(70)
                .plus(F.stat("attack").minus(45).times(0.4).clamp(-10, 40))
                .plus(F.level().minus(25).times(0.8).clamp(0, 30))
                .times(F.when(F.pref("plunge", text("worldcombat.skill.tripledive.preference.plunge")), F.const(1.25), F.const(1)))
                .clamp(60, 220).round(0),
            "湿身时长", "目标身上「湿透」留多久；物攻越高、等级越高留得越久。湿身期间再吃到本招的钻击会更重，也是一段可被别人消费的水属性身份。"),
        /** 水花点数：20 + 物攻偏移[−4,18]；夹 16..44。 */
        splashes: formula(
            F.base(20).plus(F.stat("attack").minus(45).times(0.14).clamp(-4, 18)).clamp(16, 44).round(0),
            "水花点数", {
                unit: "点",
                description: "每一钻溅起的水花数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：8 − 速度偏移[−1,2]；夹 5..11。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 2)).clamp(5, 11).round(0),
            "起手", "收身、屈膝到能起跳的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1,1.5]；夹 4..9。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(45).times(0.015).clamp(-1, 1.5)).clamp(4, 9).round(0),
            "收招", "三钻落地后收势的时间；速度越快收得越快。"),
        /** 冷却：28 − 速度偏移[−2,5]；深潜 +6；夹 18..42。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(45).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("plunge", text("worldcombat.skill.tripledive.preference.plunge")), F.const(6), F.const(0)))
                .clamp(18, 42).round(0),
            "冷却", "再起三钻前的等待；速度越快回得越快，深潜更久。PP 10 的代价。")
    });

    stages("tripledive", [
        { level: 26, values: { splash: 18 } },
        { level: 44, values: { splash: 23, drenchTicks: 110 } }
    ]);

    defineDamage("tripledive", "splash", {}, { contact: true });

    describe("tripledive", [
        { key: "description.0", values: ["splash", "diveSpan", "diveRadius"] },
        { key: "description.1", values: ["soakBonus","drenchTicks"] },
        { key: "description.2", values: ["interval"] },
        { key: "description.additional", values: ["diveSpan","diveRadius"] },
        { key: "plunge.on", values: [], when: function (context) { return read(context.detail.values, ["plunge"]) === true; } },
        { key: "plunge.off", values: [], when: function (context) { return read(context.detail.values, ["plunge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.splash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.splash", "tier.1.drenchTicks"] }
    ]);
}
