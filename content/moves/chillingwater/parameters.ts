/**
 * 泼冷水 / chillingwater —— 参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 50／命中 100／PP 20／目标单体／100% 令目标攻击 −1。
 *
 * 翻译：把「泼洒冰冷得足以让对手失去活力的水」落成一记**迎头泼下的冰水**——施法者兜起一团接近
 *   冰点的水，劈头盖脸浇在对手身上：浇灭了它的力气（攻击下降，按实际变化结算）、把它浇得湿透（借共享身份
 *   `world_combat:status/soaked`，与水流尾同一身份，别的单元能消费），落点地上留下湿冷的水渍。
 *   已经湿透的目标被这一泼激得更冷：伤害略高、掉攻多一级——共享身份回流进这招自己的公式。
 *
 * 数据分散（每项依赖不同的精灵数据，小差距因此会变成场上可见的不同）：
 *   drench        泼溅威力：特攻定冰水的力道，等级定水势；已湿目标吃得更重。
 *   atkDrop       掉攻级数：原生 1 级；目标已湿时升到 2 级。
 *   chillTicks    湿身时长：等级与特攻决定湿透留多久。
 *   velocity      水团初速：速度决定泼得急不急。
 *   radius        判定半径：碰撞箱高度决定水团大小。
 *   reach         射程：特攻决定能泼多远。
 *   drops         水花数：特攻与等级决定泼开多少水花，也是画面密度的来源。
 *   tempo         起手：速度决定兜水出手的快慢。
 *   aftercast     收招：速度决定收势。
 *   wait          冷却：等级决定熟练度。
 *
 * 伤害段 `drench` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("chillingwater", {
        drench: formula(
            F.base(50)
                .plus(F.stat("specialAttack").minus(50).times(0.24).clamp(-10, 30))
                .plus(F.level().minus(20).times(0.4).clamp(0, 10))
                .times(F.when(F.target("status.soaked", text("worldcombat.skill.chillingwater.value.targetSoaked")), F.const(1.15), F.const(1)))
                .clamp(32, 96).round(1),
            "泼溅威力", {
                unit: "威力",
                description: "冰水迎头浇下那一下的基础威力；特攻越高、等级越高越冷，已经湿透的目标再吃一成半。对手特防、相性与暴击在命中时另算。"
            }),
        atkDrop: formula(
            F.base(1).plus(F.when(F.target("status.soaked", text("worldcombat.skill.chillingwater.value.targetSoaked")), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "掉攻级数", {
                unit: "级",
                description: "被浇透时目标攻击下降的能力等级；原生 1 级，若目标已经湿透则激到 2 级。实际下降以原生结算为准，免疫或已到底时不谎报。"
            }),
        chillTicks: seconds(
            F.base(120)
                .plus(F.level().minus(20).times(1.2).clamp(0, 60))
                .plus(F.stat("specialAttack").minus(50).times(0.3).clamp(-10, 40))
                .clamp(80, 320).round(0),
            "湿身时长", "目标带上湿透身份多久（同时稍慢）；等级与特攻越高留得越久。"),
        velocity: formula(
            F.base(1.15).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.2, 0.5)).clamp(0.85, 1.7).round(2),
            "水团速度", {
                unit: "格/刻",
                description: "水团脱手时的初速；速度快的个体泼得更急，目标更难走位躲开。"
            }),
        radius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.05)).clamp(0.18, 0.4).round(2),
            "判定半径", {
                unit: "格",
                description: "水团飞行与命中的判定半径；体型越高水团越大。"
            }),
        reach: formula(
            F.base(11)
                .plus(F.stat("specialAttack").minus(50).times(0.05).clamp(-2, 4))
                .clamp(8, 16).round(1),
            "射程", {
                unit: "格",
                description: "能把冰水泼到多远；特攻高泼得远。它也是本招的实际射程来源。"
            }),
        drops: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(50).times(0.12).clamp(-2, 20))
                .plus(F.level().minus(20).times(0.25).clamp(0, 10))
                .clamp(8, 44).round(0),
            "水花数", {
                unit: "朵",
                description: "泼开的水花数量，也驱动表现的密度；特攻与等级越高泼得越密。"
            }),
        tempo: seconds(
            F.base(10)
                .minus(F.stat("speed").minus(50).times(0.03).clamp(-1.5, 2))
                .clamp(6, 14).round(0),
            "起手", "兜起一团冰水再泼出的时间；速度越快越短。"),
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(50).times(0.02).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "收招", "泼完站稳的收势；速度越快越利落。"),
        wait: seconds(
            F.base(26)
                .minus(F.level().minus(20).times(0.05).clamp(-2, 6))
                .clamp(18, 36).round(0),
            "冷却", "再次兜水泼出的等待；等级越高越熟练。")
    });

    defineDamage("chillingwater", "drench", {});

    stages("chillingwater", [
        { level: 30, values: { drench: 58, drops: 14 } },
        { level: 46, values: { drench: 66, chillTicks: 160 } }
    ]);

    describe("chillingwater", [
        { key: "description.0", values: ["drench"] },
        { key: "description.1", values: ["atkDrop","chillTicks"] },
        { key: "description.2", values: ["reach", "velocity", "radius"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drench"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drench", "tier.1.chillTicks"] }
    ]);
}
