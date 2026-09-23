/**
 * 虫扑 / pounce 的参数与伤害段。
 *
 * 原生事实：Bug、物理、威力 50、命中 100、PP 20、接触，命中后必定降低 1 级速度（Cobblemon 1.8 / Showdown，80 位学习者）。
 *
 * 翻译：把「飞扑向对手」落成一次**从远处高高跃起、落在目标身上并抓住它**的扑击——身体沿一条抛物线甩过空中，
 * 落在目标背侧，靠体重下坠把目标压住，再用腿脚缠住它的动作，让它沉下来、慢下来。命中后施法者留在目标身边，
 * 目标挂着 clung 身份（速度为缠身所累）。与起草（trailblaze 贴地草绿窜跃）、踢倒（lowkick 直线突进踢）不同：
 * 虫扑是**高弧落在目标身上**、落点就是目标本身，之后多出一段缠身的持续状态。
 *
 * 数据分散（每项读不同的精灵数据，落到不同参数上）：
 *   slam      扑击威力：物攻定扑劲、速度定扑势、体重定下坠的分量；缠身形态把力道分给持续压制。
 *   leap      扑跃距离：速度与体型高度决定这一跳够多远，也是射程基准。
 *   pace      每刻位移：速度决定扑得多急。
 *   apex      跳跃高度：速度与体型高度决定抛物线拱多高。
 *   girth     判定半径：体型高度决定空中碰撞面。
 *   slowStages 掉速等级：体重 ≥ 200 多压一级；缠身形态再多一级（夹 1..3）。
 *   clingTicks 缠身时长：等级与**体重**决定 clung 挂多久；缠身形态 ×1.5。
 *   rootTicks  压腿时长：体重够大、或缠身形态时把目标腿脚别住一瞬。
 *   motes     尘点/虫翼数量：速度与等级驱动，表现按它发射。
 *   tempo     起手：速度决定蹬地多快。
 * 配置 cling（缠身）双向取舍：开＝缠得更久、掉速更深、把腿别住更久，但单发更轻、收招与冷却更久；
 * 关＝一记更重更干脆的蹬扑，缠身很短。两向各有局面（贴住不放 / 一击拉开）。
 *
 * 伤害段 `slam` 与参数同名；属性与分类沿用原生 Bug／物理，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    actionParameters.define("pounce", {
        /** 扑击威力：42 + 物攻偏移[−8,26] + 速度偏移[−6,24] + 体重偏移[−3,14]；缠身 ×0.88；夹 26..100。 */
        slam: formula(
            F.base(42).plus(F.stat("attack").minus(55).times(0.24).clamp(-8, 26))
                .plus(F.stat("speed").minus(55).times(0.18).clamp(-6, 24))
                .plus(F.body("weight").minus(150).times(0.02).clamp(-3, 14))
                .times(F.when(F.pref("cling", text("worldcombat.skill.pounce.preference.cling")), F.const(0.88), F.const(1)))
                .clamp(26, 100).round(1),
            "扑击威力", {
                unit: "威力",
                description: "落在目标身上那一下的基础威力；物攻给扑劲、速度给扑势、体重给下坠的分量，缠身把力道分给之后的压制。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑跃距离：3.9 + 速度偏移[−0.25,0.6] + 体型高度偏移[−0.05,0.3]；夹 3.6..4.7。 */
        leap: formula(
            F.base(3.9).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.25, 0.6))
                .plus(F.body("height").minus(1.4).times(0.15).clamp(-0.05, 0.3))
                .clamp(3.6, 4.7).round(2),
            "扑跃距离", {
                unit: "格",
                description: "一次扑跃最多够出多远；腿快、身高的个体跳得更远。它同时是本招的射程基准。"
            }),
        /** 每刻位移：0.9 + 速度偏移[−0.15,0.5]；夹 0.7..1.4。 */
        pace: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.5)).clamp(0.7, 1.4).round(2),
            "扑跃速度", {
                unit: "格/刻",
                description: "扑跃时每刻推进的距离；越快越突然，留给对手侧移的时间越短。"
            }),
        /** 跳跃高度：1.3 + 速度偏移[−0.2,0.7] + 体型高度偏移[−0.1,0.4]；夹 1.1..2.4。 */
        apex: formula(
            F.base(1.3).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.2, 0.7))
                .plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.4))
                .clamp(1.1, 2.4).round(2),
            "跳跃高度", {
                unit: "格",
                description: "抛物线拱到多高；扑得高才落到目标身上。它不是判定值，但决定画面里这条弧的形状。"
            }),
        /** 判定半径：0.5 + 体型高度偏移[−0.1,0.35]；夹 0.4..0.9。 */
        girth: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.35)).clamp(0.4, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "空中扑击碰到的横向半径；身板越大触面越宽。"
            }),
        /** 掉速等级：1 + 体重 ≥ 200 + 缠身 1；夹 1..3。 */
        slowStages: formula(
            F.base(1).plus(F.body("weight").gte(200))
                .plus(F.when(F.pref("cling", text("worldcombat.skill.pounce.preference.cling")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "掉速等级", {
                unit: "级",
                description: "被缠住后下降的速度能力等级；体重够大的个体压得更沉，缠身形态再多一级（对其他战斗者落到移动速度属性）。"
            }),
        /** 缠身时长：45 + 等级(≥25)偏移[0,30] + 体重 × 0.04；缠身 ×1.5；夹 35..200。 */
        clingTicks: seconds(
            F.base(45).plus(F.level().minus(25).times(0.9).clamp(0, 30)).plus(F.body("weight").times(0.04))
                .times(F.when(F.pref("cling", text("worldcombat.skill.pounce.preference.cling")), F.const(1.5), F.const(1)))
                .clamp(35, 200).round(0),
            "缠身时长", "clung 身份挂多久，也是腿脚上缠足画面的持续时间；等级与体重越高缠得越久，缠身形态更久。"),
        /** 压腿时长：0 + （体重 ≥ 200 时 6）+ 缠身 6；夹 0..18。 */
        rootTicks: seconds(
            F.base(0).plus(F.body("weight").gte(200).times(F.const(6)))
                .plus(F.when(F.pref("cling", text("worldcombat.skill.pounce.preference.cling")), F.const(6), F.const(0)))
                .clamp(0, 18).round(0),
            "压腿时长", "身体够沉、或缠身形态时，目标的腿脚被压住一瞬（rooted）；轻身只是擦过。"),
        /** 尘点数量：14 + 速度偏移[−3,14] + 等级(≥25)偏移[0,8]；夹 12..42。 */
        motes: formula(
            F.base(14).plus(F.stat("speed").minus(55).times(0.3).clamp(-3, 14))
                .plus(F.level().minus(25).times(0.2).clamp(0, 8)).clamp(12, 42).round(0),
            "尘点数量", {
                unit: "点",
                description: "蹬地与落地扬起的尘点、空中抖落的虫翼数量，也驱动表现的密度；速度与等级越高越多。"
            }),
        /** 起手：9 − 速度偏移[−1,4]；夹 5..12。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.04).clamp(-1, 4)).clamp(5, 12).round(0),
            "起手", "屈膝蹬地、看准目标背侧的时间；速度越快越短。")
    });

    defineDamage("pounce", "slam", {}, { contact: true });

    stages("pounce", [
        { level: 28, values: { slam: 56 } },
        { level: 46, values: { slam: 68, clingTicks: 90 } }
    ]);

    describe("pounce", [
        { key: "description.0", values: ["slam", "slowStages"] },
        { key: "description.1", values: ["leap", "pace", "girth"] },
        { key: "description.2", values: ["clingTicks", "rootTicks"] },
        { key: "cling.on", values: [], when: function (context) { return read(context.detail.values, ["cling"]) === true; } },
        { key: "cling.off", values: [], when: function (context) { return read(context.detail.values, ["cling"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.clingTicks"] }
    ]);
}
