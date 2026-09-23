/**
 * 龙箭 / dragondarts 的参数与伤害段。
 *
 * 原生事实：龙／物理／威力 50／命中 100／PP 10／multihit: 2／smartTarget（对手有两只时各打一次）／单目标选择。
 *
 * 翻译：把「让多龙梅西亚攻击两次」翻成**两支会自己追人的龙箭**——发射后各锁一个目标飞过去；
 *   场上有两只敌人时各追一只（分头式），只有一只时两箭都扎在同一只身上（集火式，每支更重）。
 *   每次施放固定两支，是这个招式的身份；分配目标而不是随机溅射，也是它和双针（两针同靶）、
 *   鼠数儿（同伴随机连段）最明显的区别。
 *
 * 数值来源（每项依赖不同的精灵数据，分散开来）：
 *   dart        每支威力：物攻定箭头的狠、速度定追人的利落、等级定龙气的量；集火式每支 ×1.2。
 *   darts       箭数：原生 2 支，固定。
 *   reach       出手距离：等级与速度决定龙箭能追多远，也是本招的实际射程来源。
 *   flight      飞行速度：速度决定箭飞得多快、目标更难走位。
 *   gap         两支之间的间隔：速度决定第二支追得多急。
 *   spread      出手横向间隔：碰撞箱宽度决定两箭从两侧多开，决定分头时够不够分散。
 *   turn        追踪转向角：速度决定龙箭拐弯追人的能力。
 *   motes       龙气点数：物攻派生，表现按它发射。
 *   tempo       起手：速度决定聚气出手的快慢。
 *   recover     收招：速度决定收势。
 *   recharge    冷却：等级决定熟练度。PP 10 的代价。
 *
 * 配置 `volley`（分头式）双向取舍：开启＝有两只敌人时各追一只、每支 ×1、覆盖两个目标；
 *   关闭（集火式）＝两箭都追选定目标、每支 ×1.2，把伤害压在一只身上。两向各有适用局面。
 *
 * 伤害段 `dart` 走共享换算（原始类别 Physical）；对手防御、相性与暴击在每支命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("dragondarts", {
        /** 每支威力：22 + 物攻偏移[−6,20] + 速度偏移[−2,6] + 等级(≥25)偏移[0,9]；集火 ×1.2；夹 12..54。 */
        dart: formula(
            F.base(22)
                .plus(F.stat("attack").minus(55).times(0.22).clamp(-6, 20))
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-2, 6))
                .plus(F.level().minus(25).times(0.3).clamp(0, 9))
                .times(F.when(F.pref("volley", text("worldcombat.skill.dragondarts.preference.volley")), F.const(1), F.const(1.2)))
                .clamp(12, 54).round(1),
            "每支威力", {
                unit: "威力",
                description: "每一支龙箭命中结算一次的基础威力；分头式每支 ×1、集火式每支 ×1.2。物攻定箭头的狠、速度定追人的利落。对手防御、相性与暴击在每支命中时另算。"
            }),
        /** 箭数：原生 2；夹 2..2。 */
        darts: formula(
            F.base(2).clamp(2, 2).round(0),
            "箭数", { unit: "支", description: "每次施放发出的龙箭数量；原生固定两支，是本招的身份。" }),
        /** 出手距离：9 + 等级(≥25)偏移[0,3] + 速度偏移[−1,1.5]；夹 7..14。 */
        reach: formula(
            F.base(9)
                .plus(F.level().minus(25).times(0.1).clamp(0, 3))
                .plus(F.stat("speed").minus(60).times(0.03).clamp(-1, 1.5))
                .clamp(7, 14).round(2),
            "出手距离", {
                unit: "格",
                description: "龙箭能追出多远；等级越高、出手越快够得越远。它也是本招的实际射程来源。"
            }),
        /** 飞行速度：1.8 + 速度偏移[−0.3,0.6]；夹 1.3..2.6。 */
        flight: formula(
            F.base(1.8).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.6)).clamp(1.3, 2.6).round(2),
            "飞行速度", { unit: "格/刻", description: "龙箭追出去的速度；速度快的个体射得更利落，目标更难走位躲开。" }),
        /** 两支间隔：4 − 速度偏移[−1,1.5]；夹 3..8。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(3, 8).round(0),
            "两支间隔", "两支龙箭之间隔多久出手；速度越快第二支追得越急。"),
        /** 出手横向间隔：0.45 + 宽度偏移[0,0.8]；夹 0.3..1.2。 */
        spread: formula(
            F.base(0.45).plus(F.body("width").minus(0.9).times(0.4).clamp(0, 0.8)).clamp(0.3, 1.2).round(2),
            "出手间隔", { unit: "格", description: "两支龙箭从身体两侧分开的距离；体型越宽分得越开，分头时更容易各追一只。" }),
        /** 追踪转向：18 + 速度偏移[−4,8]；夹 12..30。 */
        turn: formula(
            F.base(18).plus(F.stat("speed").minus(60).times(0.1).clamp(-4, 8)).clamp(12, 30).round(0),
            "追踪转向", { unit: "度/刻", description: "龙箭每一刻能转多少度去追目标；速度越快拐得越急，目标更难甩掉。" }),
        /** 龙气点数：12 + 物攻偏移[−2,16]；夹 10..36。同时驱动画面密度。 */
        motes: formula(
            F.base(12).plus(F.stat("attack").minus(55).times(0.15).clamp(-2, 16)).clamp(10, 36).round(0),
            "龙气点数", { unit: "点", description: "龙箭拖尾与命中时的龙气数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。" }),
        /** 起手：7 − 速度偏移[−1.5,1.5]；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 1.5)).clamp(4, 12).round(0),
            "起手", "聚起龙气、放出第一支箭的时间；速度越快越早出手。"),
        /** 收招：6 − 速度偏移[−1,1.5]；夹 4..10。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(4, 10).round(0),
            "收招", "两箭放完后收势的时间；速度越快收得越利落。"),
        /** 冷却：30 − 等级(≥25)偏移[0,10]；夹 16..40。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(25).times(0.2).clamp(0, 10)).clamp(16, 40).round(0),
            "冷却", "再放一次前的等待；等级越高回得越快。PP 10 的代价。")
    });

    defineDamage("dragondarts", "dart", {});

    stages("dragondarts", [
        { level: 45, values: { dart: 30, reach: 11 } }
    ]);

    describe("dragondarts", [
        { key: "description.0", values: ["dart", "darts"] },
        { key: "description.1", values: ["reach", "flight", "spread"] },
        { key: "description.2", values: ["gap", "turn"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["volley"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["volley"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dart", "tier.0.reach"] }
    ]);
}
