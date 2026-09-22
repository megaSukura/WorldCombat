/**
 * 藤鞭 / vinewhip 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：草、物理、威力 45、命中 100、PP 25、优先度 0、接触、无次要效果（28 位学习者）。
 * 翻译：保留「用如同鞭子般弯曲而细长的藤蔓摔打对手」，把它落成即时战斗里**最快、最省、也最轻**的一记短抽：
 * 细藤绷直、朝目标快抽一道窄线，命中率 100 在这里意味着几乎没有起手破绽——它是这一族里唯一可以频繁连抽的招。
 *
 * 与本族分开：强力鞭打是一道远而宽的横扫、缠绕是贴身绞缠减速、百万吨重踢是直线单体踢飞；
 * 藤鞭凭「短促、快、可以连着抽」认出来，画面是一道细而亮的线性鞭痕，而不是铺开的弧面。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   lash    鞭击威力：物攻给抽击力，**速度**给鞭梢的干脆（快抽更疼），等级拾级抬升；双抽式把总伤摊成两记。
 *   reach   触及距离：身高给藤的长度，速度给一点前探。
 *   width   鞭线宽度：身高；身架越大，细藤扫出的线越粗。
 *   strokes 抽击次数：配置 double 的双抽式是两记，单抽式是一记。
 *   interval 两抽间隔：速度决定快慢。
 *   notes   叶片数量：物攻与速度派生，表现按它发射。
 *   tempo/aftercast/recharge 起手／收招／冷却：速度决定快慢，双抽式收得更久。
 *
 * 配置 double（双抽式，默认关）双向取舍：开＝一次动作里快抽两记（总伤略高、更容易在对方让位前补上第二记），
 * 但收招与冷却更久、单记更轻；关（单抽式）＝一记更快更重、回气更短的干脆抽击。两向各有局面（粘人 vs 节奏）。
 *
 * 伤害段 lash 与参数同名；属性与分类沿用原生 Grass／物理，对手防御、相性与暴击在命中时由共享结算乘入。
 */
namespace PokemonSkills {
    actionParameters.define("vinewhip", {
        /** 鞭击威力：基础 45；物攻每比 60 多 1 加 0.5（上限 +34）；速度每比 60 快 1 加 0.25（上限 +20）；等级每比 20 高 1 加 0.22（上限 +16）；双抽 ×0.6 / 单抽 ×1.06；夹在 32..105。 */
        lash: formula(
            F.base(45)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-14, 34))
                .plus(F.stat("speed").minus(60).times(0.25).clamp(-8, 20))
                .plus(F.level().minus(20).times(0.22).clamp(0, 16))
                .times(F.when(F.pref("double", text("worldcombat.skill.vinewhip.preference.double")), F.const(0.6), F.const(1.06)))
                .clamp(32, 105).round(1),
            "鞭击威力", {
                unit: "威力",
                description: "细藤抽中目标的基础威力；物攻给出抽击力，**速度**让鞭梢更快更疼。双抽式把总伤摊成两记，单记更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 触及距离：基础 2.6 格；身高每比 1.4 高 1 格加 0.55（上限 +1.2）；速度每比 60 快 1 加 0.006（上限 +0.4）；夹在 2.2..3.8。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.55).clamp(-0.3, 1.2))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.4))
                .clamp(2.2, 3.8).round(2),
            "触及距离", {
                unit: "格",
                description: "细藤绷直后能抽到多远，也是本招的射程；肢体越长、出手越快够得越远。"
            }),
        /** 鞭线宽度：基础 0.45 格；身高每比 1.4 高 1 格加 0.16（上限 +0.4）；夹在 0.3..0.95。 */
        width: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.16).clamp(-0.1, 0.4)).clamp(0.3, 0.95).round(2),
            "鞭线宽度", {
                unit: "格",
                description: "抽出的窄线有多粗（判定到线两侧各多少格）；身架越大线越粗，越容易顺带扫到沿线的人。"
            }),
        /** 抽击次数：双抽式 2 记 / 单抽式 1 记；夹在 1..2。 */
        strokes: formula(
            F.when(F.pref("double", text("worldcombat.skill.vinewhip.preference.double")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "抽击次数", {
                unit: "记",
                description: "一次动作里抽几记；双抽式连着抽两下，画面里的鞭痕也是两条。"
            }),
        /** 两抽间隔：基础 5 刻；速度每比 60 快 1 减 0.02 刻（上限 −2）；夹在 3..9。 */
        interval: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(3, 9).round(0),
            "两抽间隔", "双抽式里两记之间隔多久；越快的个体两下越连。"),
        /** 叶片数量：基础 14；物攻每比 60 多 1 加 0.12（上限 +10）；速度每比 60 快 1 加 0.06（上限 +6）；夹在 10..34。 */
        notes: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.12).clamp(-3, 10))
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-2, 6))
                .clamp(10, 34).round(0),
            "叶片数量", {
                unit: "片",
                description: "每次抽击甩出的叶片数量，随物攻与速度增长；粒子按它发射，画面里的叶片数与机制一致。"
            }),
        /** 起手：基础 5 刻；速度每比 60 快 1 减 0.04 刻（上限 −2）；夹在 3..8。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(3, 8).round(0),
            "起手", "把细藤绷直、朝目标甩出的时间；这一招几乎没有起手破绽。"),
        /** 收招：基础 5 刻；速度每比 60 快 1 减 0.03 刻（上限 −2）；双抽 +3；夹在 4..11。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("double", text("worldcombat.skill.vinewhip.preference.double")), F.const(3), F.const(0)))
                .clamp(4, 11).round(0),
            "收招", "把藤收回来、重新站稳的收势；双抽式还多收一下。"),
        /** 冷却：基础 14 刻；速度每比 60 快 1 减 0.08 刻（上限 −4）；双抽 +5；夹在 9..26。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.08).clamp(-4, 4))
                .plus(F.when(F.pref("double", text("worldcombat.skill.vinewhip.preference.double")), F.const(5), F.const(0)))
                .clamp(9, 26).round(0),
            "冷却", "两轮抽击之间的等待；PP 有 25，这一招本就该频繁用。")
    });

    stages("vinewhip", [
        { level: 30, values: { lash: 52 } },
        { level: 45, values: { lash: 60, reach: 3.2 } }
    ]);

    defineDamage("vinewhip", "lash", {}, { contact: true });

    describe("vinewhip", [
        { key: "description.0", values: ["lash", "reach", "width"] },
        { key: "description.1", values: ["strokes", "interval", "notes"] },
        { key: "double.on", values: [], when: function (context) { return read(context.detail.values, ["double"]) === true; } },
        { key: "double.off", values: [], when: function (context) { return read(context.detail.values, ["double"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.reach"] }
    ]);
}
