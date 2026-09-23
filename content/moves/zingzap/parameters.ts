/**
 * 麻麻刺刺 / zingzap —— 参数与伤害段。
 *
 * 原生事实：Electric／物理／威力 80／命中 100／PP 10／目标单体／30% 畏缩／contact。
 *
 * 翻译：把「撞向对手，并发出强电」落成一记边跑边攒电的正面撞击——电荷随冲程积累，撞上的那一刻一次放出来；
 * 电还会跳向目标旁边的下一个人。跑得越远，攒得越足，撞得越重。开启跳电时主击分摊给电弧，关闭则全部灌进主目标。
 *
 * 与同族的区分：起草是借草木窜跃、命中后提速；水流裂破是裹水撞出去、撕开护甲；麻麻刺刺是**蓄电的冲撞**，
 *   威力随冲程增长，并在接触点把电跳向第二个敌人。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   crash        主击威力 60 + 物攻偏移 + 体重偏移；跳电 ×0.9 / 集中 ×1.1（电被分走还是全灌）。
 *   chargeMax    蓄电上限 0.45 + 速度偏移；蓄电 ×1.25（长冲）。它决定冲程能加多少威力。
 *   chargeRate   每格蓄电 0.07 + 速度偏移；蓄电 +0.03（手快的攒得更急）。
 *   rush         冲刺距离 4.2 + 物攻偏移 + 等级偏移；蓄电 +1.5（拉长冲程）。
 *   pace         冲刺速度 0.9 格/刻 + 速度偏移。
 *   radius       接触判定 0.6 格 + 体型高度偏移。
 *   arc          跳电距离 3.0 格 + 等级偏移（电从命中点还能找到多远的第二个人）。
 *   arcShare     电弧分摊 50% / 0（跳电开关）。
 *   flinchChance 畏缩几率 0.30（原生）+ 物攻偏移。
 *   flinchTicks  畏缩持续 15 刻 + 等级偏移。
 *   staticTicks  电花残留 30 刻 + 等级偏移（目标身上短时噼啪的电花）。
 *   tempo        起手 9 刻 − 速度偏移 + 蓄电 2 刻（先蹲下攒一阵静电）。
 *   settle       收招 8 刻，撞完站定。
 *   recharge     冷却 24 刻 − 速度偏移 + 蓄电 8 刻。
 *
 * 配置 `overcharge`（蓄电）：开启＝冲刺更远、蓄电增益更高、撞上更重，但起手与冷却更长、扑空的代价更大；
 *   关闭＝短促冲撞，更快更稳、蓄电增益低。配置 `arcChain`（跳电）：开启＝命中点把电跳向旁边一个敌人（分摊、
 *   主击略轻）；关闭＝全部电荷灌进主目标（主击更重）。
 *
 * 伤害段 `crash` 与参数同名，走共享换算（原生类别 Physical，Electric 属性）。畏缩由本单元的
 * `world_combat:zingzap_flinch` 承载，带共享身份 `world_combat:status/flinch`。
 */
namespace PokemonSkills {
    actionParameters.define("zingzap", {
        /** 主击威力：60 + 物攻偏移[−16,32] + 体重偏移[−5,9]；跳电 ×0.9 / 集中 ×1.1；夹 38..110。 */
        crash: formula(
            F.base(60)
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-16, 32))
                .plus(F.body("weight").minus(300).times(0.004).clamp(-5, 9))
                .times(F.when(F.pref("arcChain"), F.const(0.9), F.const(1.1)))
                .clamp(38, 110).round(1),
            "主击威力", {
                unit: "威力",
                description: "撞上那一下的基准威力；物攻越高、身体越沉越重，再乘上冲程蓄电的加成。对手防御、相性与暴击在命中时另算。"
            }),
        /** 蓄电上限：0.45 + 速度偏移[−0.1,0.2]；蓄电 +0.25；夹 0.2..0.85。 */
        chargeMax: percent(
            F.base(0.45).plus(F.stat("speed").minus(55).times(0.003).clamp(-0.1, 0.2))
                .plus(F.when(F.pref("overcharge"), F.const(0.25), F.const(0))).clamp(0.2, 0.85).round(2),
            "蓄电上限", "冲程最多能给这一击加多少威力；速度越快上限越高，蓄电式再加一档。"),
        /** 每格蓄电：0.07 + 速度偏移[−0.01,0.02]；蓄电 +0.03；夹 0.04..0.14。 */
        chargeRate: percent(
            F.base(0.07).plus(F.stat("speed").minus(55).times(0.0004).clamp(-0.01, 0.02))
                .plus(F.when(F.pref("overcharge"), F.const(0.03), F.const(0))).clamp(0.04, 0.14).round(3),
            "每格蓄电", "每跑过一格攒下的电荷比例；速度快的个体攒得更急，蓄电式更多。"),
        /** 冲刺距离：4.2 + 物攻偏移[−0.6,1.6] + 等级偏移[0,1.6]；蓄电 +1.5；夹 3..8。 */
        rush: formula(
            F.base(4.2).plus(F.stat("attack").minus(60).times(0.02).clamp(-0.6, 1.6))
                .plus(F.level().minus(30).times(0.05).clamp(0, 1.6))
                .plus(F.when(F.pref("overcharge"), F.const(1.5), F.const(0))).clamp(3, 8).round(2),
            "冲刺距离", {
                unit: "格",
                description: "朝目标冲出的最大距离，也是本招的实际射程来源；跑得越远攒的电越多。"
            }),
        /** 冲刺速度：0.9 + 速度偏移[−0.15,0.4]；夹 0.6..1.5。 */
        pace: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.15, 0.4)).clamp(0.6, 1.5).round(2),
            "冲刺速度", {
                unit: "格/刻",
                description: "冲出去每刻移动的距离；速度快的个体冲得更急，目标更难在半路走开。"
            }),
        /** 接触判定：0.6 + 身高偏移[−0.1,0.4]；夹 0.45..1.2。 */
        radius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.4)).clamp(0.45, 1.2).round(2),
            "接触判定", {
                unit: "格",
                description: "冲刺途中能撞到多大一圈；个子大的个体撞得更宽。"
            }),
        /** 跳电距离：3.0 + 等级偏移[0,2]；夹 2.2..5。 */
        arc: formula(
            F.base(3.0).plus(F.level().minus(30).times(0.04).clamp(0, 2)).clamp(2.2, 5).round(2),
            "跳电距离", {
                unit: "格",
                description: "命中点的电还能跳向多远的第二个敌人；等级越高跳得越远。"
            }),
        /** 电弧分摊：跳电 50% / 集中 0%。 */
        arcShare: percent(
            F.when(F.pref("arcChain"), F.const(0.5), F.const(0)).clamp(0, 1).round(2),
            "电弧分摊", "跳电生效时，第二个敌人挨到主击威力的这个比例；关闭跳电时为 0。"),
        /** 畏缩几率：0.30 + 物攻偏移[−0.05,0.10]；夹 0.15..0.45。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.10)).clamp(0.15, 0.45),
            "畏缩几率", "撞上时的基础畏缩几率（原生 30%）；物攻越高越容易把人电懵。"),
        /** 畏缩持续：15 + 等级偏移[0,5]；夹 12..22。 */
        flinchTicks: seconds(
            F.base(15).plus(F.level().minus(30).times(0.12).clamp(0, 5)).clamp(12, 22).round(0),
            "畏缩持续", "被电懵的人在这段时间内无法开始新动作；等级越高愣得越久。"),
        /** 电花残留：30 + 等级偏移[0,20]；夹 20..70。 */
        staticTicks: seconds(
            F.base(30).plus(F.level().minus(30).times(0.6).clamp(0, 20)).clamp(20, 70).round(0),
            "电花残留", "命中后目标身上噼啪的电花停留多久，也是这段电痕的时限。"),
        /** 起手：9 − 速度偏移[−2,4] + 蓄电 2；夹 5..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.06).clamp(-2, 4))
                .plus(F.when(F.pref("overcharge"), F.const(2), F.const(0))).clamp(5, 16).round(0),
            "起手", "从蓄势到冲出之间的时间；速度快的个体更快起步，蓄电式多蹲一会儿。"),
        /** 收招：8 刻；撞完站定。 */
        settle: seconds(F.base(8).clamp(4, 14).round(0), "收招", "冲撞结束后收住的时间。"),
        /** 冷却：24 − 速度偏移[−3,5] + 蓄电 8；夹 16..40。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("overcharge"), F.const(8), F.const(0))).clamp(16, 40).round(0),
            "冷却", "这一次冲撞之后多久能再攒电；速度快的个体回得更快，蓄电式更费。")
    });

    defineDamage("zingzap", "crash", {});

    stages("zingzap", [
        { level: 35, values: { crash: 76 } },
        { level: 50, values: { crash: 88, rush: 5.5, flinchChance: 0.38 } }
    ]);

    describe("zingzap", [
        { key: "description.0", values: ["crash", "chargeMax", "chargeRate"] },
        { key: "description.1", values: ["rush", "pace", "radius"] },
        { key: "description.2", values: ["flinchChance", "flinchTicks"] },
        { key: "description.3", values: ["arc", "arcShare"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "arcChain.on", values: [], when: function (context) { return read(context.detail.values, ["arcChain"]) === true; } },
        { key: "arcChain.off", values: [], when: function (context) { return read(context.detail.values, ["arcChain"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crash", "tier.1.rush", "tier.1.flinchChance"] }
    ]);
}
