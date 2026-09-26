/**
 * 终极吸取 / gigadrain —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 75／命中 100／PP 10／吸取一半伤害（Cobblemon 1.8，209 位已实装学习者）。
 *
 * 核心念头：按住技能键，从身边探出一根粗吸根照住瞄准方向；按固定拍数沿当刻准线各查一次真实首碰，
 * 只有照到有效敌人那一拍才结算伤害并把一半转为回复（共享 `drain`）。拍数多、单拍轻，正是"最多精灵
 * 能学、也最需要个体数据把它分开"的一招。
 *
 * 与家族分开：吸取是藤不脱手的一啄、超级吸取先抛孢荚、木角用身体撞；只有终极吸取是**一根可随时转向、
 * 按固定拍数照准抽取的粗根**——玩家能看见根连在真实的射线终点上，转向空处或墙后只会干抽。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   surge    每拍威力 24 + 特攻偏移；深灌式 ×1.45。
 *   sap      回血比例 0.50 + 特攻偏移；深灌式 ×1.05。
 *   root     吸根半径（也是射线粗度）0.9 + 体型身高偏移；深灌式 ×1.3。
 *   pulses   拍数 3 + 等级；深灌式压成 2 拍。拍数固定，不因按住更久而增加。
 *   cadence  拍间隔 8 − 速度偏移；深灌式更慢。
 *   reach    吸根够到多远 12 + 特攻 + 等级；也是实际射程与每拍 trace 长度的来源。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却。
 *
 * 配置 `deepPour`（深灌式）双向取舍：开＝两拍重抽、根更宽、抽得更凶，但慢、冷却长、更容易中途被打断；
 * 关＝三拍轻抽，总回血更高、节奏更快。两向各有局面（爆发 vs 续航）。
 *
 * 伤害段 `surge` 与参数同名，走共享换算（原生类别 Special，Grass 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("gigadrain", {
        /** 每拍威力：24 + 特攻偏移[−8,16]；深灌式 ×1.45；夹 16..40。 */
        surge: formula(
            F.base(24).plus(F.stat("specialAttack").minus(50).times(0.30).clamp(-8, 16))
                .times(F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(1.45), F.const(1)))
                .clamp(16, 40).round(1),
            "每拍威力", {
                unit: "威力",
                description: "吸根每一拍的基础威力；特攻越高抽得越重，深灌式把两拍拧成一记重的。对手防御、相性与暴击在每拍命中时分别结算。"
            }),
        /** 回血比例：0.50 + 特攻偏移[−0.02,0.05]；深灌式 ×1.05；夹 0.44..0.60。 */
        sap: percent(
            F.base(0.50).plus(F.stat("specialAttack").minus(50).times(0.0006).clamp(-0.02, 0.05))
                .times(F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(1.05), F.const(1)))
                .clamp(0.44, 0.60),
            "汲取比例", "每一拍造成的伤害转为自身回复的比例（原生一半）；特攻越高抽得越足。"),
        /** 吸根半径：0.9 + 身高偏移[−0.08,0.35]；深灌式 ×1.3；夹 0.7..1.6。 */
        root: formula(
            F.base(0.9).plus(F.body("height").minus(1.2).times(0.16).clamp(-0.08, 0.35))
                .times(F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(1.3), F.const(1)))
                .clamp(0.7, 1.6).round(2),
            "吸根半径", {
                unit: "格",
                description: "吸根的粗细：每拍沿瞄准方向检查首碰时，这条线就以它为半径；个高、深灌式更粗。它也是画面里粗根与指示线的范围。"
            }),
        /** 拍数：3 + 等级 ≥ 45 追加 1；深灌式压成 2；夹 2..4。 */
        pulses: formula(
            F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(2),
                F.base(3).plus(F.level().gte(45)).clamp(3, 4)).clamp(2, 4).round(0),
            "抽取拍数", {
                unit: "拍",
                description: "按住期间一共查几拍；等级高的个体多一拍，深灌式把拍数压成两记重的。拍数固定，按住更久也不会增加。"
            }),
        /** 拍间隔：8 − 速度偏移[−2,3] + 深灌式 4；夹 5..14。 */
        cadence: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 2))
                .plus(F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(4), F.const(0)))
                .clamp(5, 14).round(0),
            "拍间隔", "两拍之间隔多久；速度越快抽得越密，深灌式把节奏拖慢。"),
        /** 射程：12 + 特攻偏移[−2,3] + 等级(≥30)偏移[0,1.5]；夹 10..16。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(50).times(0.06).clamp(-2, 3))
                .plus(F.level().minus(30).times(0.02).clamp(0, 1.5)).clamp(10, 16).round(1),
            "吸根射程", {
                unit: "格",
                description: "吸根能从多远探出去，也是每拍检查首碰的那条线的长度；特攻与等级越高够得越远。"
            }),
        /** 起手：14 − 速度偏移[−2,4] + 深灌式 3；夹 9..20。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(3), F.const(0)))
                .clamp(9, 20).round(0),
            "起手", "把粗根养到能探出去、开始照准的时间；速度越快越短。"),
        /** 收招：13 − 速度偏移[−2,4]；夹 8..17。 */
        aftercast: seconds(
            F.base(13).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2)).clamp(8, 17).round(0),
            "收招", "抽完把根缩回身边的收势。"),
        /** 冷却：52 − 速度偏移[−5,8] + 深灌式 8；夹 34..68。 */
        recharge: seconds(
            F.base(52).minus(F.stat("speed").minus(55).times(0.06).clamp(-8, 5))
                .plus(F.when(F.pref("deepPour", text("worldcombat.skill.gigadrain.preference.deepPour")), F.const(8), F.const(0)))
                .clamp(34, 68).round(0),
            "冷却", "它是本族最长的冷却；深灌式回得更慢。")
    });

    stages("gigadrain", [
        { level: 24, values: { surge: 28 } },
        { level: 42, values: { surge: 34, sap: 0.54, pulses: 4 } }
    ]);

    defineDamage("gigadrain", "surge", { defenceCoefficient: 0.005,
        rationale: "吸根巨口的整片抽取，防御按默认系数减伤。" }, {});

    describe("gigadrain", [
        { key: "description.0", values: ["surge", "pulses", "cadence"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["sap"] },
        { key: "description.channel", values: [] },
        { key: "deepPour.on", values: [], when: function (context) { return read(context.detail.values, ["deepPour"]) === true; } },
        { key: "deepPour.off", values: [], when: function (context) { return read(context.detail.values, ["deepPour"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.sap", "tier.1.pulses"] }
    ]);
}
