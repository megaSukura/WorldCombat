/**
 * 抛物面充电 / paraboliccharge —— 参数与伤害段。
 *
 * 原生事实：Electric／特殊／威力 65／命中 100／PP 20／target allAdjacent（自己周围所有宝可梦）／吸取一半伤害
 *   （Cobblemon 1.8，仅 3 位已实装学习者——最少人学的一招，因此每个参数都尽量读不同的精灵数据把它分开）。
 *
 * 核心念头：身周张开一顶电的抛物面——电弧从身上甩出去、沿弧线下弯，再从四周收回自己身上；每命中一个目标，
 *   就把那份伤害的一半抽回自身。打中的人越多，收回来的能量越足。
 * 翻译：以自身为圆心的范围电击，圈内敌人各挨一记 `surge`，每一记各自把一半经共享 `drain` 转回自身——
 *   于是「回复总伤害的一半」自然成立，不需要额外累计，圈子越大、目标越多就回得越多。
 *
 * 与家族分开：放电是瞬时向外迸开、附麻痹、不回血；抛物面充电是**先甩出去再收回来的盘**，唯一以自己为中心
 *   范围吸收、且把圈内每个目标的伤害都变成回血；画面是一圈电盘往内收，不是向外炸。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   surge    每道电威力 65 + 特攻偏移 + 等级偏移；广角式 ×0.82 / 聚焦式 ×1.28。
 *   sap      汲取比例 0.50 + 特攻偏移；每个目标各自结算。
 *   dish     抛物面半径 3.4 + 特攻偏移 + 体型高度偏移；广角式 ×1.25 / 聚焦式 ×0.78；也是实际射程来源。
 *   arcs     同时甩出的电弧数 5 + 特攻偏移 + 等级偏移；广角式 ×1.2；驱动画面密度。
 *   focus    聚焦度 0.6 + 特攻偏移；越聚焦，单道越亮、盘越收（驱动回血与画面强度）。
 *   maxTargets 广角式 8 / 聚焦式 4（不可见，仅结算上限）。
 *   charge／settle／recharge 速度决定起手、收招与冷却。
 *
 * 配置 `wide`（广角抛物面）双向取舍：开＝盘 ×1.25、电弧更多、可同时吸更多目标，但每道威力 ×0.82（续航／铺场）；
 *   关（聚焦）＝盘 ×0.78、每道 ×1.28、单发更重（爆发／少目标）。两向各有局面。
 *
 * 伤害段 `surge` 与参数同名，走共享换算（原生类别 Special，Electric 属性）。
 */
namespace PokemonSkills {
    export const parabolicchargeId = "paraboliccharge";
    export const parabolicchargeScene = "world_combat:move_paraboliccharge";

    actionParameters.define(parabolicchargeId, {
        /** 每道电威力：65 + 特攻偏移[−14,40] + 等级(≥25)偏移[0,8]；广角 ×0.82 / 聚焦 ×1.28；夹 40..140。 */
        surge: formula(
            F.base(65)
                .plus(F.stat("specialAttack").minus(60).times(0.28).clamp(-14, 40))
                .plus(F.level().minus(25).times(0.08).clamp(0, 8))
                .times(F.when(F.pref("wide", text("worldcombat.skill.paraboliccharge.preference.wide")), F.const(0.82), F.const(1.28)))
                .clamp(40, 140).round(1),
            "每道电威力", {
                unit: "威力",
                description: "抛物面上每道电碰到一个目标时的基础威力；特攻与等级越高越强，聚焦式把能量拧到更少的道上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 汲取比例：0.50 + 特攻偏移[−0.03,0.06]；夹 0.44..0.62。 */
        sap: percent(
            F.base(0.50).plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.03, 0.06)).clamp(0.44, 0.62),
            "汲取比例", "每个被电到的目标，其伤害转为自身回复的比例（原生一半）；特攻越高抽得越足。"),
        /** 抛物面半径：3.4 + 特攻偏移[−0.4,1.0] + 高度偏移[−0.3,0.9]；广角 ×1.25 / 聚焦 ×0.78；夹 2.2..5.6。 */
        dish: formula(
            F.base(3.4)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.0))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.9))
                .times(F.when(F.pref("wide", text("worldcombat.skill.paraboliccharge.preference.wide")), F.const(1.25), F.const(0.78)))
                .clamp(2.2, 5.6).round(2),
            "抛物面半径", {
                unit: "格",
                description: "身周张开的电盘有多大；特攻高、体型大的个体张得更开，广角式更宽。它也是本招的实际射程与指示圈半径。"
            }),
        /** 电弧数：5 + 特攻偏移[−1,4] + 等级(≥25)偏移[0,3]；广角 ×1.2 / 聚焦 ×0.85；夹 3..14；驱动画面。 */
        arcs: formula(
            F.base(5)
                .plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-1, 4))
                .plus(F.level().minus(25).times(0.1).clamp(0, 3))
                .times(F.when(F.pref("wide", text("worldcombat.skill.paraboliccharge.preference.wide")), F.const(1.2), F.const(0.85)))
                .clamp(3, 14).round(0),
            "电弧数", {
                unit: "道",
                description: "一次张开的抛物面同时甩出几道电；特攻越高、等级越高越多，也决定画面的密集程度。"
            }),
        /** 聚焦度：0.6 + 特攻偏移[−0.15,0.35]；夹 0.45..1.0；聚焦式取上界方向。 */
        focus: formula(
            F.base(0.6).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.35))
                .times(F.when(F.pref("wide", text("worldcombat.skill.paraboliccharge.preference.wide")), F.const(0.8), F.const(1.15)))
                .clamp(0.45, 1.0).round(2),
            "聚焦度", {
                unit: "",
                description: "这一顶电盘收得多紧；特攻高的个体收得越紧，单道越亮，也影响画面里回光的强度。"
            }),
        /** 起手：9 − 速度偏移[−2,3]；夹 6..14。 */
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(6, 14).round(0),
            "起手", "把电盘在身周张开、蓄到能收的程度；速度越快越短。"),
        /** 收招：9 − 速度偏移[−2,3]；夹 5..14。 */
        settle: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(5, 14).round(0),
            "收招", "电盘收回身上后收势的时间。"),
        /** 冷却：30 − 速度偏移[−4,6]；夹 22..42。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 6)).clamp(22, 42).round(0),
            "冷却", "两次张盘之间的等待；速度快的个体回得更快。"),
        maxTargets: formula(F.when(F.pref("wide", text("worldcombat.skill.paraboliccharge.preference.wide")), F.const(8), F.const(4)).round(0), "", { visible: false })
    });

    defineDamage(parabolicchargeId, "surge", { defenceCoefficient: 0.005,
        rationale: "抛物面甩出的每一道电，防御按默认系数减伤。" }, {});

    stages(parabolicchargeId, [
        { level: 30, values: { surge: 78, dish: 3.8 } },
        { level: 46, values: { surge: 92, sap: 0.55, dish: 4.2, arcs: 8 } }
    ]);

    describe(parabolicchargeId, [
        { key: "description.0", values: ["surge","sap","maxTargets"] },
        { key: "description.1", values: ["dish"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge", "tier.0.dish"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.sap", "tier.1.dish"] }
    ]);
}
