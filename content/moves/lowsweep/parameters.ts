/**
 * 下盘踢 / lowsweep 的参数与伤害段。
 *
 * 原生事实：Fighting、物理、威力 65、命中 100、PP 20、接触，命中后必定降低 1 级速度（Cobblemon 1.8 / Showdown，127 位学习者）。
 *
 * 翻译：把「以敏捷的动作瞄准对手的脚」落成一次**原地旋身的低扫**——施法者压低重心一拧腰，一条低平的弧线扫过脚踝，
 * 弧线里所有敌人的小腿都被削到，正在快速移动的目标重心最难收回，掉的速度也最多（`slowStages` 读**目标当前移动速度**）。
 * 与踢倒（lowkick）分开：踢倒是一次**直线突进**、按**目标体重**决定威力并把人扫倒；下盘踢**不位移**、按**双方速度**
 * 决定威力与掉速，也不绊倒，只在高速目标上顺带把腿别住一瞬。
 *
 * 数据分散（每项读不同的精灵数据，落到不同参数上）：
 *   cut         扫踢威力：物攻定腿劲、速度定扫击的干脆；旋身扫把力道摊到更大的弧上所以单点更轻。
 *   sweepArc    扫击张角：速度决定弧线多开；旋身扫扩得更大，是「一次削到几个人」的来源。
 *   reach       扫击半径：速度与体型高度决定腿够多远。
 *   slowStages  掉速等级：读**目标当前移动速度**——越快被削得越深（1..3 级）。
 *   hobbleTicks 腿伤时长：等级与施法者速度决定 hobbled 身份挂多久。
 *   rootTicks   别腿时长：只有被削到两级以上、或旋身扫时才把腿别住一瞬。
 *   spark       火星/尘点数量：速度与物攻驱动，表现按它发射。
 *   pivot       起手：速度决定拧腰多快。
 * 配置 whirl（旋身扫）双向取舍：开＝弧线更开、能把高速目标的腿别住更久，但单点更轻、收招与冷却更久；
 * 关＝一记更快更重的小弧点切。两向各有局面（一次削一片 / 点掉一个）。
 *
 * 伤害段 `cut` 与参数同名；属性与分类沿用原生 Fighting／物理，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    actionParameters.define("lowsweep", {
        /** 扫踢威力：50 + 物攻偏移[−8,30] + 速度偏移[−6,24]；旋身 ×0.82；夹 32..116。 */
        cut: formula(
            F.base(50).plus(F.stat("attack").minus(55).times(0.26).clamp(-8, 30))
                .plus(F.stat("speed").minus(55).times(0.16).clamp(-6, 24))
                .times(F.when(F.pref("whirl", text("worldcombat.skill.lowsweep.preference.whirl")), F.const(0.82), F.const(1)))
                .clamp(32, 116).round(1),
            "扫踢威力", {
                unit: "威力",
                description: "扫中小腿那一下的基础威力；物攻给出腿劲、速度给出扫击的干脆，旋身扫把力道摊到更宽的弧上。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扫击张角：120 + 速度偏移[−20,60]；旋身 ×1.6；夹 110..260。 */
        sweepArc: formula(
            F.base(120).plus(F.stat("speed").minus(55).times(0.6).clamp(-20, 60))
                .times(F.when(F.pref("whirl", text("worldcombat.skill.lowsweep.preference.whirl")), F.const(1.6), F.const(1)))
                .clamp(110, 260).round(0),
            "扫击张角", {
                unit: "度",
                description: "低扫弧线在身前的张角；速度越快扫得越开，旋身扫几乎划出一个半圆。弧线里的敌人都会被削到。"
            }),
        /** 扫击半径：2.3 + 速度偏移[−0.2,0.6] + 体型高度偏移[−0.1,0.35]；夹 2.1..3.0。 */
        reach: formula(
            F.base(2.3).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.6))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.35))
                .clamp(2.1, 3.0).round(2),
            "扫击半径", {
                unit: "格",
                description: "低扫能够到多远的小腿；速度与身板决定腿的长度。它同时是本招的射程基准。"
            }),
        /** 掉速等级：1 + 目标移动速度 ≥ 0.11 + 目标移动速度 ≥ 0.16；夹 1..3。 */
        slowStages: formula(
            F.base(1).plus(F.target("actor.movementSpeed").gte(0.11)).plus(F.target("actor.movementSpeed").gte(0.16))
                .clamp(1, 3).round(0),
            "掉速等级", {
                unit: "级",
                description: "被削中小腿后下降的速度能力等级；**目标当时移动得越快，重心越难收回，掉得越多**（对其他战斗者落到移动速度属性）。"
            }),
        /** 腿伤时长：45 + 等级(≥25)偏移[0,30] + 速度偏移[−15,20]；夹 35..140。 */
        hobbleTicks: seconds(
            F.base(45).plus(F.level().minus(25).times(0.9).clamp(0, 30))
                .plus(F.stat("speed").minus(55).times(0.6).clamp(-15, 20)).clamp(35, 140).round(0),
            "腿伤时长", "hobbled 身份挂多久；等级与施法者速度越高削得越久。"),
        /** 别腿时长：0 + （目标移动速度 ≥ 0.16 时 6）+ 旋身 4；夹 0..14。 */
        rootTicks: seconds(
            F.base(0).plus(F.target("actor.movementSpeed").gte(0.16).times(F.const(6)))
                .plus(F.when(F.pref("whirl", text("worldcombat.skill.lowsweep.preference.whirl")), F.const(4), F.const(0)))
                .clamp(0, 14).round(0),
            "别腿时长", "被削到重心难收的目标，小腿会被别住一瞬（rooted）；只有掉两级以上或旋身扫时才发生。"),
        /** 尘点数量：12 + 速度偏移[−3,12] + 物攻偏移[−2,8]；夹 10..40。 */
        spark: formula(
            F.base(12).plus(F.stat("speed").minus(55).times(0.3).clamp(-3, 12))
                .plus(F.stat("attack").minus(55).times(0.1).clamp(-2, 8)).clamp(10, 40).round(0),
            "尘点数量", {
                unit: "点",
                description: "扫击扬起的尘点与鞋底火星数量，也驱动表现的密度；速度与物攻越高越多。"
            }),
        /** 起手：6 − 速度偏移[−1,3]；夹 3..8。 */
        pivot: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 3)).clamp(3, 8).round(0),
            "起手", "压低重心、拧腰起势的时间；速度越快越短。")
    });

    defineDamage("lowsweep", "cut", {}, { contact: true });

    stages("lowsweep", [
        { level: 26, values: { cut: 62 } },
        { level: 44, values: { cut: 74, hobbleTicks: 88 } }
    ]);

    describe("lowsweep", [
        { key: "description.0", values: ["cut","slowStages"] },
        { key: "description.1", values: ["sweepArc","reach"] },
        { key: "description.2", values: ["hobbleTicks","rootTicks"] },
        { key: "whirl.on", values: [], when: function (context) { return read(context.detail.values, ["whirl"]) === true; } },
        { key: "whirl.off", values: [], when: function (context) { return read(context.detail.values, ["whirl"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cut"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cut", "tier.1.hobbleTicks"] }
    ]);
}
