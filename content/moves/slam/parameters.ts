/**
 * 摔打 / slam 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 80／命中 75／PP 20／优先度 0／接触，无追加效果（Cobblemon 1.8，87 位学习者）。
 * 描述「使用长长的尾巴或藤蔓等摔打对手进行攻击」。
 *
 * 翻译：把「把长肢高高扬起再摔下来」翻成**一次落点会落空的重砸**——扬起的那一瞬砸点就定在对手当时站的地方，
 * 之后砸下去，站在那个圆里的人各挨一记最重的接触伤害、被震开一段；在落下前挪开的人就只是看着它砸空。
 * 原生 75 命中在这里不是掷骰子，而是**给出一个看得见的躲避窗口**（`fallTicks`），站住不动就吃满、侧身就走掉。
 *
 * 与同族分开（打击对的两招，都不留状态）：
 *   拍击 —— 抬手即出、扇面扫过，便宜、快、一次拍到几个；
 *   摔打 —— 慢、重、落点先画出来，是全族最高的单发，也是最容易落空的一记。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   impact     砸击威力：物攻定砸劲，体重把这一下压得更沉；沉砸式更重。
 *   crater     砸坑半径：体重决定震开多大一块地面，身高给长肢挥出的幅度；沉砸式更大。
 *   reach      扬起距离：身高给长肢抡起的长度，也是实际射程。
 *   fallTicks  砸落时长：速度决定这一下多快落下——也是留给对手挪开的窗口；沉砸式更慢、更好躲。
 *   shockPush  震开距离：施法者体重推得远，被砸者越高大越站得住；沉砸式推得更狠。
 *   dust       扬尘数量：体重与物攻换算，表现按它发射。
 *   tempo／aftercast／recharge：速度定起收节奏，等级让冷却回得更快；沉砸式整体更缓。
 *
 * 配置 `heavy`（沉砸式，默认关）双向取舍：开＝更重、砸坑更大、震得更远，但落下更慢（更好躲）、收招与冷却更久；
 * 关（疾砸式）＝落得快、出手快、更容易砸中移动目标，但单发略低、面小。两向各有局面（打站桩 vs 追移动目标）。
 *
 * 伤害段 `impact` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("slam", {
        /** 砸击威力：80 + 物攻偏移[−24,60] + 体重偏移[−8,34]；沉砸 ×1.12 / 疾砸 ×0.94；夹 58..190。 */
        impact: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-24, 60))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-8, 34))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(1.12), F.const(0.94)))
                .clamp(58, 190).round(1),
            "砸击威力", {
                unit: "威力",
                description: "长肢砸中的一下能造成的威力；物攻定砸劲、体重把份量压进去，沉砸式再抬一截。对手防御、相性与暴击在命中时另算。"
            }),
        /** 砸坑半径：1.0 + 体重偏移[−0.12,0.7] + 身高偏移[−0.1,0.5]；沉砸 ×1.2；夹 0.8..2.6 格。 */
        crater: formula(
            F.base(1.0)
                .plus(F.body("weight").minus(60).times(0.02).clamp(-0.12, 0.7))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.1, 0.5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(1.2), F.const(1)))
                .clamp(0.8, 2.6).round(2),
            "砸坑半径", {
                unit: "格",
                description: "砸下去震开多大一块圆形地面，也是判定范围；越重的个体砸坑越大，沉砸式再铺开一截。画面里地面上那个圆就是它。"
            }),
        /** 扬起距离：2.6 + 身高偏移[−0.3,1.0]；夹 2.2..3.8 格。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.65).clamp(-0.3, 1.0)).clamp(2.2, 3.8).round(2),
            "扬起距离", {
                unit: "格",
                description: "长肢抡起后能够到多远；身高给臂展长度，也是本招的实际射程来源。"
            }),
        /** 砸落时长：9 − 速度偏移[−2,4] + 沉砸 +4；夹 5..16 刻。 */
        fallTicks: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.08).clamp(-2, 4))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(4), F.const(0)))
                .clamp(5, 16).round(0),
            "砸落时长", "扬起后到砸中的时间；它同时是留给对手挪开的窗口。速度越快越利落，沉砸式故意慢一拍、更好躲。"),
        /** 震开距离：0.55 + 体重偏移[0,0.9] − 目标身高抵抗[0,0.5]；沉砸 ×1.25；夹 0.2..1.6 格。 */
        shockPush: formula(
            F.base(0.55)
                .plus(F.body("weight").minus(60).times(0.006).clamp(0, 0.9))
                .minus(F.target("actor.height", text("worldcombat.skill.slam.value.targetHeight")).minus(1.4).times(0.2).clamp(0, 0.5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(1.25), F.const(1)))
                .clamp(0.2, 1.6).round(2),
            "震开距离", {
                unit: "格",
                description: "被砸中后沿背向砸点的方向震开多远；施法者越重推得越远，被砸者越高大越站得住。"
            }),
        /** 扬尘数量：18 + 体重偏移[−3,14]；夹 12..40 个。 */
        dust: formula(
            F.base(18).plus(F.body("weight").minus(60).times(0.16).clamp(-3, 14)).clamp(12, 40).round(0),
            "扬尘数量", {
                unit: "个",
                description: "砸中地面时扬起的尘土量，由体重换算；表现按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：11 − 速度偏移[−3,5] + 沉砸 +4；夹 6..20 刻。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.06).clamp(-3, 5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(4), F.const(0)))
                .clamp(6, 20).round(0),
            "起手", "把长肢高高扬起到能砸下去的时间；速度越快越短，沉砸式抡得更久。"),
        /** 收招：12 − 速度偏移[−3,6] + 沉砸 +4；夹 6..22 刻。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(4), F.const(0)))
                .clamp(6, 22).round(0),
            "收招", "砸完把长肢收回来的收势；速度越快越短，沉砸式更慢。"),
        /** 冷却：46 − 速度偏移[−8,12] − 等级(≥30)偏移[0,8] + 沉砸 +10；夹 26..66 刻。 */
        recharge: seconds(
            F.base(46).minus(F.stat("speed").minus(60).times(0.07).clamp(-8, 12))
                .minus(F.level().minus(30).times(0.2).clamp(0, 8))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.slam.preference.heavy")), F.const(10), F.const(0)))
                .clamp(26, 66).round(0),
            "冷却", "两次重砸之间的等待；速度与等级让它回得更快，沉砸式缓得最久。")
    });

    stages("slam", [
        { level: 30, values: { impact: 96 } },
        { level: 46, values: { impact: 112, crater: 1.3 } }
    ]);

    defineDamage("slam", "impact", { defenceCoefficient: 0.005,
        rationale: "钝重下砸；摔打靠长肢的份量砸开地面，防御按默认系数减伤。" }, { contact: true });

    describe("slam", [
        { key: "description.0", values: ["impact", "crater"] },
        { key: "description.1", values: ["reach","fallTicks","shockPush"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.impact"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.impact", "tier.1.crater"] }
    ]);
}
