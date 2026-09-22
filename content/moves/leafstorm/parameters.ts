/**
 * 飞叶风暴 / leafstorm 的参数与伤害段。本族「力竭奥义」里以**旋转叶刃风暴**成形的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Grass／特殊／威力 130／命中 90／PP 5／优先度 0／非接触；
 *   self boosts { spa: -2 }，无次要效果；target normal（单体）。已实装学习者 99 位。
 *   描述「用尖尖的叶片向对手卷起风暴。使用之后因为反作用力自己的特攻会大幅降低」。
 *
 * 翻译：把「卷起风暴打一下、代价是特攻大掉」翻成即时战斗里**甩出一股旋转的叶刃风暴**——尖叶绕着一条
 *   前进轴旋卷着冲向目标，在它身上高速旋切后炸散；卷叶式让这股风在落点多盘桓一阵，持续割站在里面的人。
 *   反作用力就是特攻掉 2 级，提交那一刻就付：叶子离手，精神力已经被抽走。
 *
 * 与同族分开：过热是身前一张扇形热浪、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   飞叶风暴是唯一**绕着一根轴旋转前进、并在落点盘桓成场**的那一记。玩家凭「旋卷的绿叶片 + 原地打转的叶场」认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   storm       威力：特攻给密度、等级拾级抬升；卷叶式分薄。
 *   blades      叶片数：速度决定叶片的数量与转速，也驱动画面里的叶片数。
 *   gust        风速：速度决定风柱前进多快。
 *   girth       风柱半径：体型（高、宽）决定整股风多粗，也是判定半径。
 *   reach       射程：特攻给送出的距离、速度给起步。
 *   whirlRadius 盘桓范围：特攻决定风在落点铺多开（卷叶式才有）。
 *   whirlShare  盘桓保留：特攻决定每次复割保留多少威力（卷叶式才有）。
 *   whirlTicks  盘桓时长：等级与特攻决定叶场停多久（卷叶式才有）。
 *   whirlPulse  盘桓间隔：固定 1 秒一次。
 *   insightLoss 自身特攻下降级：原生固定 2 级。
 *   tempo/aftercast/recharge：速度定节奏，卷叶式更慢更长。
 *
 * 配置 `maelstrom`（卷叶式，默认关）双向取舍：
 *   开＝命中后风暴在落点盘桓 whirlTicks，按 whirlPulse 反复割 whirlRadius 内的敌人；代价是单体威力 ×0.85、
 *   起手 +3 刻、冷却 +6 刻。关（穿叶式）＝一股集中的叶刃直穿目标，单体更重、出手更快，但不留场。
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
                description: "叶刃卷过目标那一下的力；特攻越高叶越密，等级越高越沉。卷叶式把力分给盘桓，单发轻一点。对手特防、相性与暴击在命中时另算。"
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
        /** 风速：基础 0.95 格/刻；速度每比 55 快 1 加 0.006（夹 −0.2..0.45）；夹 0.7..1.6。 */
        gust: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.45)).clamp(0.7, 1.6).round(2),
            "风速", {
                unit: "格/刻",
                description: "风柱前进的速度；速度快的个体送得更急，也更难被走位甩掉。"
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
        /** 盘桓范围：卷叶式 = 2.0 + 特攻偏移[0,1.0] / 穿叶式 = 0；夹 0..3.4。 */
        whirlRadius: formula(
            F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")),
                F.base(2.0).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 1.0)), F.const(0))
                .clamp(0, 3.4).round(2),
            "盘桓范围", {
                unit: "格",
                description: "落点叶场铺开多大；特攻越高铺得越开。画面里那圈打转的叶片就是这个范围。只有卷叶式有。"
            }),
        /** 盘桓保留：卷叶式 = 0.32 − 特攻偏移[−0.08,0.1] / 穿叶式 = 0；夹 0..0.6。 */
        whirlShare: percent(
            F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")),
                F.base(0.32).minus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.08, 0.1)), F.const(0))
                .clamp(0, 0.6).round(2),
            "盘桓保留", "叶场每次复割保留多少威力；特攻越高越均匀。把站在里面的人一点点割干。只有卷叶式有。"),
        /** 盘桓时长：卷叶式 = 80 + 等级偏移[0,50] + 特攻偏移[−6,10] / 穿叶式 = 0；夹 60..170。 */
        whirlTicks: seconds(
            F.when(F.pref("maelstrom", text("worldcombat.skill.leafstorm.preference.maelstrom")),
                F.base(80).plus(F.level().minus(20).times(0.8).clamp(0, 50))
                    .plus(F.stat("specialAttack").minus(60).times(0.15).clamp(-6, 10)), F.const(0))
                .clamp(60, 170).round(0),
            "盘桓时长", "落点叶场在地上转多久；等级与特攻越高转得越久。到时叶片散尽。只有卷叶式有。"),
        /** 盘桓间隔：固定 20 刻（1 秒）一次。 */
        whirlPulse: seconds(
            F.const(20).clamp(10, 40).round(0),
            "盘桓间隔", "叶场每隔多久复割一次站在里面的人。"),
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
        { key: "description.1", values: ["reach", "gust", "girth", "blades"] },
        { key: "description.2", values: ["insightLoss"] },
        { key: "maelstrom.on", values: ["whirlRadius", "whirlShare", "whirlTicks", "whirlPulse"], when: function (context) { return read(context.detail.values, ["maelstrom"]) === true; } },
        { key: "maelstrom.off", values: [], when: function (context) { return read(context.detail.values, ["maelstrom"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.storm", "tier.0.blades"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.storm", "tier.1.reach"] }
    ]);
}
