/**
 * 飞叶风暴 / leafstorm 的参数与伤害段。本族「力竭奥义」里以**旋转叶刃风暴**成形的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Grass／特殊／威力 130／命中 90／PP 5／优先度 0／非接触；
 *   self boosts { spa: -2 }，无次要效果；target normal（单体）。已实装学习者 99 位。
 *   描述「用尖尖的叶片向对手卷起风暴。使用之后因为反作用力自己的特攻会大幅降低」。
 *
 * 翻译：把「卷起风暴打一下、代价是特攻大掉」翻成即时战斗里**甩出一股沿准线卷动的叶刃风暴**——尖叶绕着一条
 *   前进轴旋卷着向前，真正卷过谁就在谁身上高速旋切，到射程尽头一次散开。反作用力就是特攻掉 2 级，
 *   提交那一刻就付：叶子离手，精神力已经被抽走。
 *
 * 与同族分开：过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   飞叶风暴是唯一**绕着一根轴旋转前进、沿实际经过的敌人连续旋切**的那一记。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   storm       威力：特攻给密度、等级拾级抬升；卷叶式分薄。
 *   blades      叶片数：速度决定叶片的数量与转速，也驱动画面里的叶片数。
 *   gust        风速：速度决定风柱前进多快；卷叶式卷得慢一些。
 *   girth       风柱半径：体型（高、宽）决定整股风多粗，也是判定半径。
 *   reach       射程：特攻给送出的距离、速度给起步。
 *   carry       贯穿数：速度与体型（宽）决定一股风能穿过几个敌人；卷叶式才有。
 *   insightLoss 自身特攻下降级：原生固定 2 级。
 *   tempo/aftercast/recharge：速度定节奏，卷叶式更慢更长。
 *
 * 配置 `maelstrom`（卷叶式，默认关）双向取舍：
 *   开＝风速 ×0.62，风暴继续沿线慢速卷过 carry 个敌人、每个只结算一次，到射程尽头一次散开；代价是单发威力 ×0.85、
 *   起手 +3 刻、冷却 +6 刻，适合成排的敌人。关（穿叶式）＝一股更快的叶刃撞上第一个敌人即散，单发更重、出手更快，
 *   但不越过目标，适合单点。两向各有适用局面。
 *
 * 伤害段 `storm` 与参数同名，走共享换算（原始类别 Special）；对手特防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("leafstorm", {
        /** 威力：基础 126；特攻每比 60 多 1 加 0.9（夹 −26..56）；等级每比 20 高 1 加 0.3（夹 0..18）；
         *  卷叶 ×0.85 / 穿叶 ×1.0；夹 92..212。 */
        storm: formula(
            F.base(126)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-26, 56))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")), F.const(0.85), F.const(1.0)))
                .clamp(92, 212).round(1),
            "风暴威力", {
                unit: "威力",
                description: "叶刃卷过目标那一下的力；特攻越高叶越密，等级越高越沉。卷叶式把一部分力分成多段掠过，单发轻一点。对手特防、相性与暴击在命中时另算。"
            }),
        /** 叶片数：基础 18；速度每比 55 快 1 加 0.12（夹 −4..12）；等级每比 20 高 1 加 0.12（夹 0..8）；夹 12..40。 */
        blades: formula(
            F.base(18)
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-4, 12))
                .plus(F.level().minus(20).times(0.12).clamp(0, 8))
                .clamp(12, 40).round(0),
            "叶片数", {
                unit: "片",
                description: "卷进这股风的尖叶数量；速度快的个体卷得更密，等级越高叶片越厚。画面里的叶片密度按它派生。"
            }),
        /** 风速：基础 0.95 格/刻；速度每比 55 快 1 加 0.006（夹 −0.2..0.45）；卷叶 ×0.62；夹 0.45..1.6。 */
        gust: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.45))
                .times(F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")), F.const(0.62), F.const(1.0)))
                .clamp(0.45, 1.6).round(2),
            "风速", {
                unit: "格/刻",
                description: "风柱前进的速度；速度快的个体送得更急，也更难被走位甩掉。卷叶式卷得慢一些。"
            }),
        /** 风柱半径：基础 0.42 格；高每比 1.4 高 1 格加 0.1（夹 −0.06..0.3）；宽每比 0.9 宽 1 格加 0.3（夹 −0.06..0.34）；夹 0.3..0.92。 */
        girth: formula(
            F.base(0.42)
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.06, 0.3))
                .plus(F.body("width").minus(0.9).times(0.3).clamp(-0.06, 0.34))
                .clamp(0.3, 0.92).round(2),
            "风柱半径", {
                unit: "格",
                description: "整股风有多粗、多容易蹭到人；体型越大卷起的风柱越粗。画面里旋转的叶环就是这个半径。"
            }),
        /** 射程：基础 11 格；特攻每比 60 多 1 加 0.04（夹 −1.5..3）；速度每比 55 快 1 加 0.03（夹 −1..2）；夹 8..16。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3))
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .clamp(8, 16).round(1),
            "射程", {
                unit: "格",
                description: "风柱能卷出多远；特攻高送得远、速度快的起步更早。它也是本招的实际射程与指示线长度。"
            }),
        /** 贯穿数：卷叶式 = 2 + 速度偏移[0,2] + 体型宽偏移[0,1] / 穿叶式 = 0；夹 0..5。 */
        carry: formula(
            F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")),
                F.base(2)
                    .plus(F.stat("speed").minus(55).times(0.02).clamp(0, 2))
                    .plus(F.body("width").minus(0.9).times(1.0).clamp(0, 1))
                    .clamp(1, 5).round(0), F.const(0)),
            "贯穿数", {
                unit: "个",
                description: "卷叶式的风柱一路穿过几个敌人；速度快的个体卷得更急、体型宽的卷得更开，能多带走一个。画面里移动的叶筒长度与穿过的人数就是这个数。穿叶式固定 0（撞上第一个就散）。"
            }),
        /** 自身特攻下降级：原生固定 2 级；夹 2..6。 */
        insightLoss: formula(
            F.const(2).clamp(2, 6).round(0),
            "自身特攻下降", {
                unit: "级",
                description: "叶子离手后自身特攻下降的能力等级；原生固定 2 级，提交那一刻就付，中与不中都一样。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.04（夹 −1.5..3）；卷叶 +3；夹 8..20。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")), F.const(3), F.const(0)))
                .clamp(8, 20).round(0),
            "起手", "把尖叶拢成一股、蓄势甩出的时间；速度越快越短，卷叶式要多拢一圈。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 7..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5)).clamp(7, 16).round(0),
            "收招", "甩完把身子稳回来的时间；速度越快越短。"),
        /** 冷却：基础 38 刻；速度每比 55 快 1 减 0.07（夹 −3..6）；卷叶 +6；夹 26..54。 */
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(55).times(0.07).clamp(-3, 6))
                .plus(F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")), F.const(6), F.const(0)))
                .clamp(26, 54).round(0),
            "冷却", "两次风暴之间等待多久；快的个体回气更快，卷叶式缓得更久。")
    });

    stages("leafstorm", [
        { level: 30, values: { storm: 136, blades: 22 } },
        { level: 50, values: { storm: 154, reach: 13 } }
    ]);

    defineDamage("leafstorm", "storm", {});

    describe("leafstorm", [
        { key: "description.0", values: ["storm"] },
        { key: "description.1", values: ["reach", "gust", "girth"] },
        { key: "description.2", values: ["insightLoss"] },
        { key: "maelstrom.on", values: ["carry"], when: function (context) { return read(context.detail.values, ["maelstrom"]) === true; } },
        { key: "maelstrom.off", values: [], when: function (context) { return read(context.detail.values, ["maelstrom"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.storm"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.storm", "tier.1.reach"] }
    ]);
}
