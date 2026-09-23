/**
 * 飞翔 / Fly — 参数与数值来源。
 *
 * 原生：飞行／物理／威力 90／命中 95／PP 15；第 1 回合飞上天空（期间免疫大多数招式），第 2 回合攻击。
 * 即时战斗里“两回合”换成三拍：起手蹲身 → 提交后直上高空并在空中越过战场（悬停）→ 从头顶落下来。
 * 原生的“飞行无敌”改由高度承接：真在高处，贴地的近战够不着；但远程打得中，悬停的每一刻都是暴露。
 *
 * 世界参与（这招独有的材料是头顶的天空）：起手那一刻头顶有多少净空，就能飞多高。开阔天空飞满，
 * 一击最重；屋檐、洞穴、树冠压顶时只能做一次低跳，威力与压地都大幅缩水——所以“在哪里发起”是选点
 * 时要读的信息。悬停时施法者身上挂着真实的 `world_combat:fly_airborne`（队伍栏可见、`/effect` 可查，
 * 共享身份 world_combat:status/fly），落地后自行结束。
 *
 * 配置 `track`：开启（追踪俯冲）在悬停期间把落点跟在目标实时位置上，单点、判定窄，适合咬住一个会
 * 走位的目标；关闭（定点击落）在起手时锁死落点、判定范围大，能一次压住站在那里的一群，但目标走开
 * 就会落空。两个方向各有取舍，收招与冷却也不同。
 *
 * 数值来源（每个参数取不同的精灵数据，公式即悬浮说明里展开的那一棵）：
 *   power           = 基础 90 + (物攻 − 70) × 0.25（夹在 −12..+32）；等级阶梯 32/48 级再抬一档。
 *   altitude        = 基础 4.5 格 + (碰撞箱高度 − 1.4) × 1.2，夹在 3.2..6.5：体型越大飞得越高。
 *   climbSpeed      = 基础 0.55 + (速度 − 60) × 0.004 格/刻，夹在 0.3..1.1。
 *   hoverTicks      = 基础 18 − (速度 − 60) × 0.08 刻，夹在 6..24：速度快盘旋短。
 *   diveSpeed       = 基础 0.95 + (速度 − 60) × 0.006 格/刻，夹在 0.55..1.6。
 *   impactRadius    = 基础 0.9 + (碰撞箱高度 − 1.4) × 0.3 格：单点判定；定点击落再 ×1.9。
 *   press           = 基础 0.5 + 体重 × 0.0003 格，压下去的距离（体重单位 0.1kg）。
 *   push            = 基础 0.6 + 体重 × 0.0002 格，命中推开的距离。
 * 伤害段名就是参数名 power；实际轻重再乘一个高度系数（见下），由起手那一刻头顶的净空决定。
 *   heightFactor = 0.55 + 0.45 × 实际高度 / 目标高度：天花板压顶时这一击最轻只有一半多。
 */
namespace PokemonSkills {
    /** 配置项的值：追踪俯冲（true）与定点击落（false）。 */
    export function flyTrack(config: any): boolean { return !config || config.track !== false; }

    actionParameters.define("fly", {
        /** 落地威力：90 + (物攻 − 70) × 0.25，夹在 64..140。 */
        power: formula(
            F.base(90)
                .plus(F.stat("attack").minus(70).times(0.25).clamp(-12, 32))
                .clamp(64, 140).round(1),
            "落地威力", {
                unit: "威力",
                description: "从高处落下的基础威力；物攻越高砸得越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 飞行高度：4.5 + (碰撞箱高度 − 1.4) × 1.2 格，夹在 3.2..6.5。 */
        altitude: formula(
            F.base(4.5)
                .plus(F.body("height").minus(1.4).times(1.2))
                .clamp(3.2, 6.5).round(2),
            "飞行高度", {
                unit: "格",
                description: "想飞多高；体型越大飞得越高。头顶净空不足时会只飞到天花板下方，这一击随之变轻。"
            }),
        /** 上升速度：0.55 + (速度 − 60) × 0.004 格/刻，夹在 0.3..1.1。 */
        climbSpeed: formula(
            F.base(0.55)
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.4))
                .clamp(0.3, 1.1).round(3),
            "上升速度", {
                unit: "格/刻",
                description: "爬升的快慢；速度越快越早到位，越少给对手反应时间。"
            }),
        /** 悬停时间：18 − (速度 − 60) × 0.08 刻，夹在 6..24。 */
        hoverTicks: formula(
            F.base(18)
                .minus(F.stat("speed").minus(60).times(0.08).clamp(-3, 10))
                .clamp(6, 24).round(0),
            "悬停时间", {
                unit: "刻",
                description: "在空中停留、重新锁定落点的时间；速度快停留短。悬停期间贴地近战够不着，但远程打得中。"
            }),
        /** 俯冲速度：0.95 + (速度 − 60) × 0.006 格/刻，夹在 0.55..1.6。 */
        diveSpeed: formula(
            F.base(0.95)
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.7))
                .clamp(0.55, 1.6).round(2),
            "俯冲速度", {
                unit: "格/刻",
                description: "从高处落下的速度；越快越难在落地前侧移躲开。"
            }),
        /** 落地判定半径：0.9 + (碰撞箱高度 − 1.4) × 0.3 格。 */
        impactRadius: formula(
            F.base(0.9)
                .plus(F.body("height").minus(1.4).times(0.3))
                .clamp(0.7, 1.6).round(2),
            "落地判定半径", {
                unit: "格",
                description: "追踪俯冲的落点判定；身体越高大越大。定点击落会把范围再放大到近两倍。"
            }),
        /** 下压距离：0.5 + 体重 × 0.0003 格（夹在 0..0.7）。 */
        press: formula(
            F.base(0.5)
                .plus(F.body("weight").times(0.0003).clamp(0, 0.7))
                .clamp(0.3, 1.2).round(2),
            "下压距离", {
                unit: "格",
                description: "命中后把目标向下压进地面的距离；体重越大压得越实。"
            }),
        /** 推开距离：0.6 + 体重 × 0.0002 格（夹在 0..0.5）。 */
        push: formula(
            F.base(0.6)
                .plus(F.body("weight").times(0.0002).clamp(0, 0.5))
                .clamp(0.35, 1.1).round(2),
            "推开距离", {
                unit: "格",
                description: "落地冲击把命中的目标沿水平方向推开的距离；体重越大推得越远。"
            }),
        maxTargets: n(4, "最多命中数"),
        glideSpeed: hidden(0.6),
        traceAhead: hidden(1.4),
        minimumMove: hidden(0.05)
    });

    defineDamage("fly", "power", {
        rationale: "先飞出近战射程、再落到目标头上：悬停的暴露换一次从高度砸下的重击，高度被天花板压住时最轻。"
    }, { contact: true });

    stages("fly", [
        { level: 32, values: { power: 100 } },
        { level: 48, values: { power: 112 } }
    ]);

    describe("fly", [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["altitude", "climbSpeed"] },
        { key: "description.2", values: ["hoverTicks","impactRadius","press"] },
        { key: "description.3", values: [] },
        { key: "description.4", values: [] },
        { key: "stance.track", values: [], when: function (context) { return flyTrack(context.detail.values); } },
        { key: "stance.pin", values: ["maxTargets"], when: function (context) { return !flyTrack(context.detail.values); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: [], when: function (context) { return context.pokemon.level() >= 32; } },
        { key: "growth.1", values: [], when: function (context) { return context.pokemon.level() >= 48; } }
    ]);
}
