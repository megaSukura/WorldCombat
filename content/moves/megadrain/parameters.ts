/**
 * 超级吸取 / megadrain —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 40／命中 100／PP 15／吸取一半伤害（Cobblemon 1.8，92 位已实装学习者）。
 *
 * 核心念头：把一颗孢荚弹出去，撞在对手身上绽成一张吸盘根网，勾住它，再一股股把养分拉回来——
 * 它是本族里唯一**把东西送出去**的吸招：先看见一颗孢荚飞过去，才看见养分回来。
 * 翻译：飞行＋缠吸两幕；命中后先结算一口，再按 `pulses` 分若干拍追抽，每拍伤害的一半转为回复（共享 `drain`）。
 *
 * 与家族分开：吸取是藤不脱手的一啄、终极吸取从地里拱出大根三拍连抽、木角用身体撞；
 * 只有超级吸取先抛出一颗看得见的孢荚，落点由飞行决定。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   pod       孢荚威力 40 + 特攻偏移；爆荚式 ×1.25。
 *   sap       回血比例 0.50 + 特攻偏移；爆荚式 ×0.9（爆得散，收得少）。
 *   seed      孢荚飞行速度 1.5 + 速度偏移；腿快的个体抛得更直。
 *   latch     缠吸判定 0.5 + 体型身高偏移；爆荚式 ×1.35。个高的个体根网铺得更宽。
 *   pulses    追抽拍数 2 + 等级；爆荚式压成 1 拍。
 *   interval  拍间隔 7 − 速度偏移；爆荚式更慢。速度决定抽取的节奏。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却。
 *
 * 配置 `burst`（爆荚式）双向取舍：开＝一发爆得更重、根网更宽，但只抽一拍、回得更少、节奏更慢；
 * 关＝缠钩式，多拍连续抽取，总量与回血更高，但单发轻。两向各有局面（爆发 vs 续航）。
 *
 * 伤害段 `pod` 与参数同名，走共享换算（原生类别 Special，Grass 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("megadrain", {
        /** 孢荚威力：40 + 特攻偏移[−8,14]；爆荚式 ×1.25；夹 26..66。 */
        pod: formula(
            F.base(40).plus(F.stat("specialAttack").minus(45).times(0.22).clamp(-8, 14))
                .times(F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(1.25), F.const(1)))
                .clamp(26, 66).round(1),
            "孢荚威力", {
                unit: "威力",
                description: "孢荚绽开这一下的基础威力；特攻越高越重，爆荚式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 回血比例：0.50 + 特攻偏移[−0.02,0.04]；爆荚式 ×0.9；夹 0.42..0.58。 */
        sap: percent(
            F.base(0.50).plus(F.stat("specialAttack").minus(45).times(0.0005).clamp(-0.02, 0.04))
                .times(F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(0.9), F.const(1)))
                .clamp(0.42, 0.58),
            "汲取比例", "每一拍造成的伤害转为自身回复的比例（原生一半）；特攻高抽得更足，爆荚式爆得散、收得少。"),
        /** 抛程：8.5 + 特攻偏移[−1.5,2.2]；夹 7.0..11.5。 */
        reach: formula(
            F.base(8.5).plus(F.stat("specialAttack").minus(45).times(0.05).clamp(-1.5, 2.2)).clamp(7.0, 11.5).round(2),
            "抛程", {
                unit: "格",
                description: "孢荚能飞到多远的目标，也是本招的实际射程来源；特攻越高送得越远。"
            }),
        /** 飞行速度：1.5 + 速度偏移[−0.3,0.8]；夹 1.1..2.4。 */
        seed: formula(
            F.base(1.5).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.8)).clamp(1.1, 2.4).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "孢荚抛出去后每刻前进的距离；速度快的个体抛得更直、更难在半路被让开。"
            }),
        /** 缠吸判定：0.5 + 身高偏移[−0.06,0.3]；爆荚式 ×1.35；夹 0.4..0.9。 */
        latch: formula(
            F.base(0.5).plus(F.body("height").minus(1.2).times(0.14).clamp(-0.06, 0.3))
                .times(F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(1.35), F.const(1)))
                .clamp(0.4, 0.9).round(2),
            "缠吸判定", {
                unit: "格",
                description: "根网绽开的判定半径；个高、爆荚式铺得更宽，更不容易只擦到边。"
            }),
        /** 追抽拍数：2 + 等级 ≥ 40 追加 1；爆荚式压成 1；夹 1..3。 */
        pulses: formula(
            F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(1),
                F.base(2).plus(F.level().gte(40)).clamp(2, 3)).clamp(1, 3).round(0),
            "追抽拍数", {
                unit: "拍",
                description: "命中之后一共抽几拍（第一拍是孢荚绽开）；等级高的个体多追一拍，爆荚式只留一发。"
            }),
        /** 拍间隔：7 − 速度偏移[−1,3] + 爆荚式 3；夹 4..12。 */
        interval: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 1))
                .plus(F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(3), F.const(0)))
                .clamp(4, 12).round(0),
            "拍间隔", "两拍之间隔多久；速度越快抽得越密，爆荚式把节奏拖慢。"),
        /** 起手：8 − 速度偏移[−1,2]；夹 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(5, 13).round(0),
            "起手", "把孢荚在身前养到能弹出去的时间；速度越快越短。"),
        /** 收招：8 − 速度偏移[−1,2]；爆荚式 +2；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(2), F.const(0)))
                .clamp(5, 12).round(0),
            "收招", "抽完把根网收回来的收势；爆荚式收得慢。"),
        /** 冷却：34 − 速度偏移[−3,5] + 爆荚式 4；夹 22..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-5, 5))
                .plus(F.when(F.pref("burst", text("worldcombat.skill.megadrain.preference.burst")), F.const(4), F.const(0)))
                .clamp(22, 48).round(0),
            "冷却", "两次抛荚之间的等待；爆荚式回得更慢。")
    });

    stages("megadrain", [
        { level: 18, values: { pod: 46 } },
        { level: 34, values: { pod: 56, sap: 0.53, pulses: 3 } }
    ]);

    defineDamage("megadrain", "pod", { defenceCoefficient: 0.005,
        rationale: "孢荚根网的吸取，防御按默认系数减伤。" }, {});

    describe("megadrain", [
        { key: "description.0", values: ["pod"] },
        { key: "description.1", values: ["pulses","interval"] },
        { key: "description.2", values: ["reach","seed"] },
        { key: "description.3", values: ["sap"] },
        { key: "burst.on", values: [], when: function (context) { return read(context.detail.values, ["burst"]) === true; } },
        { key: "burst.off", values: [], when: function (context) { return read(context.detail.values, ["burst"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pod"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pod", "tier.1.sap", "tier.1.pulses"] }
    ]);
}
