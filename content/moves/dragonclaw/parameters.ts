/**
 * 龙爪 / dragonclaw 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：龙、物理、威力 80、命中 100、PP 15、优先度 0、接触、无追加效果（62 位学习者）。
 * 描述「用尖锐的巨爪劈开对手进行攻击」。它是本组单发最重的一记。
 *
 * 翻译：把「用巨爪劈开」翻成**站定、举双爪，朝身前一整片宽面同时划下两道交叉的巨爪带**——
 * 两道爪带同刻判定，被任一带扫到的敌人都结算原主伤；只有落在两带交叉中心、被双爪共同覆盖的目标**护甲被爪尖撕开、防御下降**
 * （能力等级，对所有战斗者同一条路径），边缘只被单爪蹭到的目标只受伤、不掉防。本组只有它会削弱护甲。
 *
 * 与同族分开：劈开是窄走廊、慢而期待要害的单点重劈；连斩是越接越多刀的攒节奏；啄、角撞、木枝突刺都是单点直线；
 * 龙爪凭「两条交叉爪带、中心撕甲、边缘只伤」认出来。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   rend       爪击威力：物攻定爪力、等级给狠劲；单爪式更重、交叉式把力摊到更宽的面。
 *   reach      爪程：身高给臂长与踏出的半步，速度给一点前探，也是实际射程。
 *   spread     两爪带夹角：体宽给臂展，交叉式把两条爪带拉得更开。
 *   depth      爪带垂直覆盖：身高决定这一扫覆盖到多高。
 *   claw       爪带半宽：体宽决定每条爪带多粗；它决定交叉中心的大小。
 *   rendStages 撕甲级别：配置决定交叉 2 级 / 单爪 1 级。
 *   marks      爪痕量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏，交叉式以更长的起手与冷却换面积与撕甲。
 *
 * 配置 `cross`（交叉式，默认关）双向取舍：开启＝扇面张角 ×1.67、撕甲 2 级、覆盖更广，代价是威力 ×0.9、
 * 起手 +3 刻、冷却 +6 刻；关闭（单爪式）＝正面更窄但每爪 ×1.06、撕甲 1 级、起手与循环更快。
 * 两向各有局面：面对一群贴身敌人用交叉式，面对单个目标用单爪式更划算。
 *
 * 伤害段 `rend` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("dragonclaw", {
        /** 爪击威力：78 + 物攻偏移[−16,40] ×0.5 + 等级偏移[−8,18] ×0.35；交叉 ×0.9 / 单爪 ×1.06；夹 58..156。 */
        rend: formula(
            F.base(78).plus(F.stat("attack").minus(65).times(0.5).clamp(-16, 40))
                .plus(F.level().minus(25).times(0.35).clamp(-8, 18))
                .times(F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(0.9), F.const(1.06)))
                .clamp(58, 156).round(1),
            "爪击威力", {
                unit: "威力",
                description: "巨爪扫过目标那一下的基础威力；物攻定爪力、等级给狠劲。交叉式把力摊到更宽的面，单爪式把力集中到正面。对手防御、相性与暴击在命中时另算。"
            }),
        /** 爪程：2.5 + 身高偏移[−0.3,1.0] ×0.5 + 速度偏移[−0.15,0.35] ×0.004；交叉 ×1.05；夹 2.2..3.4。 */
        reach: formula(
            F.base(2.5).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35))
                .times(F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(1.05), F.const(1)))
                .clamp(2.2, 3.4).round(2),
            "爪程", {
                unit: "格",
                description: "巨爪能扫到多远；身高给臂长与踏出的半步、速度给前探。它也是本招的实际射程来源。"
            }),
        /** 两爪带夹角：交叉 140° / 单爪 84°，再按体宽偏移[−6,12] ×10；夹 70..156。 */
        spread: formula(
            F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(140), F.const(84))
                .plus(F.body("width").minus(0.9).times(10).clamp(-6, 12))
                .clamp(70, 156).round(0),
            "两爪带夹角", {
                unit: "度",
                description: "两条爪带之间的夹角；身架越宽臂展越开、X 张得越宽。画面里那两道交叉爪带就是判定范围，不在带上就不会被抓到。"
            }),
        /** 扇面高度：1.6 + 身高偏移[−0.2,0.7] ×0.4；夹 1.3..2.4。 */
        depth: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.7)).clamp(1.3, 2.4).round(2),
            "扇面高度", {
                unit: "格",
                description: "两道爪带从脚上覆盖到多高；高大的个体扫得更高。"
            }),
        /** 爪带半宽：0.5 + 体宽偏移[−0.12,0.35] ×0.35；夹 0.36..0.9。 */
        claw: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.35).clamp(-0.12, 0.35)).clamp(0.36, 0.9).round(2),
            "爪带半宽", {
                unit: "格",
                description: "两道交叉爪带各自的横向半宽；身架越宽爪带越粗。两带在身前的交叉中心共同覆盖的目标会被撕甲，只被单带蹭到的边缘目标只受伤。"
            }),
        /** 撕甲级别：交叉 2 级 / 单爪 1 级；夹 1..2。 */
        rendStages: formula(
            F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "撕甲级别", {
                unit: "级",
                description: "爪尖撕开目标护甲、使其防御下降的能力等级；对宝可梦与对原版生物走同一条路径。等级随脱战自然消退。"
            }),
        /** 爪痕量：16 + 物攻偏移[−3,12] ×0.16；夹 12..40。 */
        marks: formula(
            F.base(16).plus(F.stat("attack").minus(65).times(0.16).clamp(-3, 12)).clamp(12, 40).round(0),
            "爪痕量", {
                unit: "道",
                description: "扫过时划出的爪痕与崩屑数量，由物攻换算；粒子按它发射，画面里的道数与机制一致。"
            }),
        /** 起手：9 − 速度偏移[−2,3] ×0.03 + 交叉 +3；夹 6..17。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(3), F.const(0)))
                .clamp(6, 17).round(0),
            "起手", "举双爪、让龙气沿臂线聚起的时间；速度越快越短，交叉式要多压一拍。"),
        /** 收招：8 − 速度偏移[−1.5,2.5] ×0.02 + 交叉 +2；夹 5..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "收招", "扫完把双爪收回、重新站定的收势；速度越快越短。"),
        /** 冷却：30 − 等级偏移[0,6] ×0.15 + 交叉 +6；夹 20..44。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(25).times(0.15).clamp(0, 6))
                .plus(F.when(F.pref("cross", text("worldcombat.skill.dragonclaw.preference.cross")), F.const(6), F.const(0)))
                .clamp(20, 44).round(0),
            "冷却", "两次巨爪扫击之间等多久；等级越高回得越快，交叉式额外更费。")
    });

    stages("dragonclaw", [
        { level: 32, values: { rend: 88 } },
        { level: 50, values: { rend: 98, reach: 2.8 } }
    ]);

    defineDamage("dragonclaw", "rend", {}, { contact: true, slice: true });

    describe("dragonclaw", [
        { key: "description.0", values: ["rend","reach","claw"] },
        { key: "description.1", values: ["spread","depth","rendStages"] },
        { key: "cross.on", values: ["spread","rendStages","rend"], when: function (context) { return read(context.detail.values, ["cross"]) === true; } },
        { key: "cross.off", values: ["spread","rendStages","rend"], when: function (context) { return read(context.detail.values, ["cross"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level","tier.0.rend"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.rend","tier.1.reach"] }
    ]);
}
