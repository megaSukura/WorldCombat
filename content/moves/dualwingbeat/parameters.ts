/**
 * 双翼 / dualwingbeat —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**Flying**／物理／威力 40／命中 90／PP 10／接触（`contact: 1`）／单体／连续 2 次（`multihit: 2`）。
 *
 * 翻译：把「将翅膀撞向对手进行攻击，连续 2 次给予伤害」落成一记**俯冲双拍**——先振翅俯冲、一侧翼朝身前下方
 *   拍下去（第一拍把人拍开、给自己让出落点），再借势振翅上掀、另一侧翼以真实新身位向身后上方反拍。招名里的
 *   "两下"来自两只翅膀各一次，不是一次伤害结算两次，而是施法者自己在下潜与上扬之间移动的两拍；两拍方向相反、
 *   各自判定，第二拍不因第一拍命中而额外加威力。
 *   与同族分开：双针是两根细针沿线先后射出、毒击是站定近身重刺；双翼是**掠飞式、施法者自身在俯冲与拉升之间
 *   移动、两翼前后反向**的两拍，画面里明显有升力与风。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   wing          每拍威力：物攻（翅膀有多硬）；俯冲式贴脸更重、悬停式隔空较轻。
 *   reach         出手距离：等级（越会飞够得越远）；俯冲式把身位交出去所以更短。
 *   span          翼扫张角：碰撞箱宽度（翅膀摊得越开扇面越宽）。
 *   strokeRadius  翼弧厚度：身高（翼展越长，扫出的弧越厚）。
 *   gap           两拍间隔：速度（收翅再拍越快）；俯冲式更短。
 *   swoop         俯冲距离：体重（越重冲势越足）＋速度。
 *   rise          拉升距离：速度。
 *   push          拍飞距离：体重（越重扇起的气流越强）＋物攻。
 *   maxTargets    最多扫到几个：碰撞箱宽度（翼展越宽罩得越宽）。
 *   feathers      羽片/风屑数量：物攻，直接驱动发射量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 配置 `dive`（俯冲形态，默认关）双向取舍：开启＝俯冲贴脸，两拍都是接触、每拍威力 ×1.15、间隔更短；
 *   代价是施法者把身位交出去（射程降到约 3.2 格、俯冲落点固定）且起手多一次下潜。关闭（悬停式）＝隔空
 *   拍出风压，射程约 5.6 格、更安全，但每拍 ×0.9、间隔更长。两向各有适用局面：想留距离就用悬停，想打满
 *   伤害就用俯冲。
 *
 * 伤害段 wing：每一拍各自结算一次接触伤害，规格空（共享结算乘入物攻、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const dualwingbeatId = "dualwingbeat";
    export const dualwingbeatScene = "world_combat:move_dualwingbeat";

    actionParameters.define(dualwingbeatId, {
        /** 每拍威力：基础 40，物攻每比 55 多 1 加 0.16（夹 -6..18）；俯冲 ×1.15 / 悬停 ×0.9；夹在 20..68。 */
        wing: formula(
            F.base(40).plus(F.stat("attack").minus(55).times(0.16).clamp(-6, 18))
                .times(F.when(F.pref("dive"), F.const(1.15), F.const(0.9)))
                .clamp(20, 68).round(1),
            "每拍威力", {
                unit: "威力",
                description: "每一侧翅膀各自结算的威力；物攻越高翅膀拍得越硬。俯冲式贴脸更重，悬停式隔空较轻。对手物防、相性与暴击在每拍命中时另算。"
            }),
        /** 射程：基础 5.6 格，俯冲 −2.4 格，等级每比 20 高 1 加 0.05（夹 0..0.8）；夹在 2.8..6.5。 */
        reach: formula(
            F.base(5.6).minus(F.when(F.pref("dive"), F.const(2.4), F.const(0)))
                .plus(F.level().minus(20).times(0.05).clamp(0, 0.8)).clamp(2.8, 6.5).round(1),
            "出手距离", {
                unit: "格",
                description: "翅膀能够到多远；等级越高甩得越远。俯冲式把身位交出去，够到的距离更短。它也是本招的实际射程来源。"
            }),
        /** 翼扫张角：基础 78 度，身宽每比 0.9 宽 1 格加 35 度（夹 -10..60）；俯冲 ×0.85 / 悬停 ×1.1；夹在 45..170。 */
        span: formula(
            F.base(78).plus(F.body("width").minus(0.9).times(35).clamp(-10, 60))
                .times(F.when(F.pref("dive"), F.const(0.85), F.const(1.1))).clamp(45, 170).round(0),
            "翼扫张角", {
                unit: "度",
                description: "两只翅膀扫开的总角度；身宽的个体一记摊得更开。画面里的扇形就是判定范围。"
            }),
        /** 翼弧厚度：基础 0.9 格，身高每比 1.4 高 1 格加 0.5（夹 -0.2..0.9）；夹在 0.6..2.0。 */
        strokeRadius: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.9)).clamp(0.6, 2.0).round(2),
            "翼弧厚度", {
                unit: "格",
                description: "每一拍扫出翼弧的厚度；翼展长的个体弧更厚。"
            }),
        /** 两拍间隔：基础 5 刻，俯冲 −1.5 / 悬停 ＋1，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 2..8。 */
        gap: seconds(
            F.base(5).plus(F.when(F.pref("dive"), F.const(-1.5), F.const(1)))
                .minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(2, 8).round(0),
            "两拍间隔", "第一拍与第二拍之间隔多久；速度越快收翅再拍越快，俯冲式更短。"),
        /** 俯冲距离：基础 2.4 格，体重每比 60 重 1 加 0.008（夹 -0.8..1.4），速度每比 55 快 1 加 0.02（夹 -0.5..1.2）；夹在 0.8..4.2。 */
        swoop: formula(
            F.base(2.4).plus(F.body("weight").minus(60).times(0.008).clamp(-0.8, 1.4))
                .plus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 1.2)).clamp(0.8, 4.2).round(2),
            "俯冲距离", {
                unit: "格",
                description: "俯冲式下第一拍时施法者朝目标冲进多远；体重与速度越大冲势越足。悬停式不冲，此值不出现在场上。"
            }),
        /** 拉升距离：基础 1.2 格，速度每比 55 快 1 加 0.02（夹 -0.4..1.0）；夹在 0.4..2.6。 */
        rise: formula(
            F.base(1.2).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.4, 1.0)).clamp(0.4, 2.6).round(2),
            "拉升距离", {
                unit: "格",
                description: "第二拍上掀时施法者退回多远；速度越快收得越快。"
            }),
        /** 拍飞距离：基础 0.55 格，体重每比 60 重 1 加 0.004（夹 -0.2..0.5），物攻每比 55 多 1 加 0.002（夹 -0.1..0.3）；夹在 0.25..1.4。 */
        push: formula(
            F.base(0.55).plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.5))
                .plus(F.stat("attack").minus(55).times(0.002).clamp(-0.1, 0.3)).clamp(0.25, 1.4).round(2),
            "拍飞距离", {
                unit: "格",
                description: "每一拍把命中目标沿该拍翼势推开多远（第二拍沿反拍方向推得轻一些）；体重与物攻越大扇起的气流越强。"
            }),
        /** 最多扫到几个：基础 1，身宽每比 1.2 宽 1 格加 1.5（夹 -0.4..1.4）；夹在 1..3 并向下取整。 */
        maxTargets: formula(
            F.base(1).plus(F.body("width").minus(1.2).times(1.5).clamp(-0.4, 1.4)).clamp(1, 3).floor(),
            "最多扫到", {
                unit: "个",
                description: "一记翼扫最多同时照顾几个非友方目标；翼展宽的个体罩得更宽。"
            }),
        /** 羽片数量：基础 16，物攻每比 55 多 1 加 0.14（夹 -4..14）；夹在 10..40。 */
        feathers: formula(
            F.base(16).plus(F.stat("attack").minus(55).times(0.14).clamp(-4, 14)).clamp(10, 40).round(0),
            "羽片数量", {
                unit: "片",
                description: "每一拍拍出的羽片与风屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 刻，俯冲 −2 / 悬停 ＋1，速度每比 55 快 1 减 0.03（夹 -1.5..2.5）；夹在 4..12。 */
        tempo: seconds(
            F.base(8).plus(F.when(F.pref("dive"), F.const(-2), F.const(1)))
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "起手", "振翅张开、决定下扑还是悬停的时间；速度越快越短，悬停式多花一点。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 3..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 11).round(0),
            "收招", "两拍拍完收起翅膀的时间；速度越快收得越快。"),
        /** 冷却：基础 26 刻，等级每比 20 高 1 减 0.15（夹 0..4）；夹在 16..36。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(20).times(0.15).clamp(0, 4)).clamp(16, 36).round(0),
            "冷却", "再一次双翼拍击之间的等待；等级越高回得越快。")
    });

    defineDamage(dualwingbeatId, "wing", {}, { contact: true });

    stages(dualwingbeatId, [
        { level: 30, values: { wing: 46 } },
        { level: 45, values: { wing: 52 } },
        { level: 60, values: { wing: 58 } }
    ]);

    describe(dualwingbeatId, [
        { key: "description.0", values: ["wing","reach","span"] },
        { key: "description.1", values: ["gap","push","swoop"] },
        { key: "description.2", values: ["rise","maxTargets"] },
        { key: "dive.on", values: [], when: function (context) { return read(context.detail.values, ["dive"]) === true; } },
        { key: "dive.off", values: [], when: function (context) { return read(context.detail.values, ["dive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wing"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wing"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.wing"] }
    ]);
}
