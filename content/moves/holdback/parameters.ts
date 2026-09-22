/**
 * 手下留情 / holdback 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 40／命中 100／PP 40／contact／单目标。致命时同样截停在「目标剩余 1 HP」。
 * 11 位学习者（配信招，Cobblemon 1.8）。原生描述「在攻击的时候手下留情，从而使对手的 HP 至少会留下 1 HP」。
 *
 * 翻译：把「一记收着力气的重击」落成一记**面向前方的横扫**——明明抡圆了能一下扫倒一排，却在将要碰到时收住力道，
 * 从所有人身上擦过去，谁都没倒。它是本族里唯一**同时留手好几个目标**的一记，代价是慢、且重扫之后要沉腰站定一瞬。
 * 留手由本单元的 `world_combat:holdback_mercy` 拦截效果实现：每个目标在结算前把数值截到「至少剩 1 HP」。
 *
 * 与同族分开：点到为止是一记单点精准的细切（快、窄、贴地）；手下留情是一道宽扇形横扫（慢、宽、能同时罩住几个），
 * 画面上一眼就能看出「这一下收住了多大的力气」。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   sweep  横扫威力：物攻定臂力，体重定这一下带出的分量。
 *   reach  扫击距离：速度定扫出的半径，也是本招的实际射程。
 *   angle  扇形半角：碰撞箱宽度定这一扫有多宽。
 *   depth  扫击高度：身高定这一扫从脚上扫到多高。
 *   dust   扬尘量：物攻换算，驱动命中扬尘。
 *   brace  沉腰时长：重手时按物攻决定收回力气后站定多久；轻手为 0。
 *   tempo／aftercast／recharge：速度定节奏。
 *
 * 配置 `heavy`（沉腰）双向取舍（默认关）：
 *   开（沉腰）：威力 ×1.2、扫距 +0.3 格、扇形 +8 度，代价是起手 +4 刻、冷却 +6 刻，且扫完后被自己的收势钉住 `brace` 刻。
 *   关（快扫）：威力 ×0.85、出手更快、扫完可立刻移动。
 *   两向各有局面：沉腰用来一次罩住几个厚目标；快扫用来在贴身战里保持机动。
 *
 * 伤害段 `sweep` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("holdback", {
        /** 横扫威力：50 + 物攻偏移[−9,28] + 体重偏移[−5,12]；沉腰 ×1.2 / 快扫 ×0.85；夹 22..108。 */
        sweep: formula(
            F.base(50)
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-9, 28))
                .plus(F.body("weight").minus(300).times(0.005).clamp(-5, 12))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.holdback.preference.heavy")), F.const(1.2), F.const(0.85)))
                .clamp(22, 108).round(1),
            "横扫威力", {
                base: 50, unit: "威力",
                description: "这一记横扫的基础威力；物攻越高臂力越沉，身体越沉带出的分量越足。致命时会被截停在目标至少留下 1 HP。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扫击距离：2.6 + 速度偏移[−0.2,0.5] + 沉腰 0.3；夹 2.2..3.4。 */
        reach: formula(
            F.base(2.6)
                .plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.holdback.preference.heavy")), F.const(0.3), F.const(0)))
                .clamp(2.2, 3.4).round(2),
            "扫击距离", {
                base: 2.6, unit: "格",
                description: "横扫扫出的半径；速度快的个体扫得稍远，沉腰式再多伸一点。它也是本招的实际射程。"
            }),
        /** 扇形半角：50 + 宽度偏移[−5,20] + 沉腰 8；夹 35..78。 */
        angle: formula(
            F.base(50)
                .plus(F.body("width").minus(0.9).times(12).clamp(-5, 20))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.holdback.preference.heavy")), F.const(8), F.const(0)))
                .clamp(35, 78).round(0),
            "扇形半角", {
                base: 50, unit: "度",
                description: "横扫张开多少度（半角）；身体越宽扫面越宽，沉腰式再张开一点，能同时罩住更多目标。"
            }),
        /** 扫击高度：1.2 + 身高偏移[0,0.7]；夹 1.0..1.9。 */
        depth: formula(
            F.base(1.2).plus(F.body("height").minus(1.4).times(0.5).clamp(0, 0.7)).clamp(1.0, 1.9).round(2),
            "扫击高度", {
                base: 1.2, unit: "格",
                description: "横扫从脚上扫到多高；高大的个体扫得更深，能在同一个扇面里罩住更多目标。"
            }),
        /** 扬尘量：16 + 物攻 ×0.16；夹 12..40。 */
        dust: formula(
            F.base(16).plus(F.stat("attack").times(0.16)).clamp(12, 40).round(0),
            "扬尘量", {
                base: 16, unit: "撮",
                description: "横扫命中处扬起的灰尘量；随物攻增长，也决定画面里那一扫的厚度。"
            }),
        /** 沉腰时长：沉腰 24 + 物攻偏移[0,16]；快扫 0；夹 0..40。 */
        brace: seconds(
            F.when(F.pref("heavy", text("worldcombat.skill.holdback.preference.heavy")),
                F.const(24).plus(F.stat("attack").minus(60).times(0.2).clamp(0, 16)), F.const(0)).clamp(0, 40).round(0),
            "沉腰时长", "沉腰式扫完后，收回力气时被自己的收势钉住多久；物攻越高越久，快扫式为 0。"),
        /** 起手：9 − 速度偏移[−2,3] + 沉腰 4；夹 5..17。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.035).clamp(-2, 3))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.holdback.preference.heavy")), F.const(4), F.const(0)))
                .clamp(5, 17).round(0),
            "起手", "抡开这一扫再收力的时间；速度越快越短，沉腰式要多蓄一点。"),
        /** 收招：8 − 速度偏移[−2,3]；夹 4..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(4, 14).round(0),
            "收招", "扫完收势的时间；速度快的个体更短。"),
        /** 冷却：28 − 速度偏移[−3,5] + 沉腰 6；夹 14..42。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.holdback.preference.heavy")), F.const(6), F.const(0)))
                .clamp(14, 42).round(0),
            "冷却", "再次抡扫前的等待；沉腰式更长，快扫更短。")
    });

    defineDamage("holdback", "sweep", {}, { contact: true });

    stages("holdback", [
        { level: 34, values: { sweep: 62, angle: 56 } }
    ]);

    describe("holdback", [
        { key: "description.0", values: ["sweep"] },
        { key: "description.1", values: ["reach", "angle", "depth"] },
        { key: "description.2", values: ["dust", "brace"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep", "tier.0.angle"] }
    ]);
}
