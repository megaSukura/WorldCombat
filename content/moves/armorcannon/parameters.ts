/**
 * 铠农炮 / armorcannon 的参数与伤害段。本族「弃守强攻」唯一在远处发动、并且烧掉自己铠甲的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fire／特殊／威力 120／命中 100／PP 5／优先度 0／非接触；
 *   self boosts { def: -1, spd: -1 }，无次要效果；target normal（单体）。已实装学习者 1 位（Armarouge）。描述
 *   「熊熊燃烧自己的铠甲，将其做成炮弹射出攻击。自己的防御和特防会降低」。
 *
 * 翻译：把「烧红铠甲、拆一片当炮弹射出去」翻成即时战斗里的一次**远距炮击**——从身上烧出一副火壳、沿准线射出去，
 *   命中炸开一团火并在落点留下灼痕。它是全族里唯一的特殊（特攻）招式，唯一不接触、唯一在远距离发动的一记；
 *   弃守的根据也最直白：铠甲已经烧成了炮弹，防御与特防自然下降——在提交那一刻付。
 *
 * 与同族分开：近身战贴脸连打、突飞猛扑贴地冲、画龙点睛从天而降；与加农光炮比：光炮是钢属性光矛、贯穿一条线、
 *   压低目标的特防；铠农炮是火属性单发、命中炸开一团火、灼烧地面，代价落在自己身上。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   shell       炮弹威力：特攻给力、体重给弹重、等级拾级；散爆式分薄。
 *   velocity    弹速：特攻决定炮弹初速。
 *   reach       射程：速度给站位、特攻给炮管延伸。
 *   radius      弹体碰撞半径：体型（宽、高）决定炮弹多大。
 *   blast/share 散爆半径与保留：特攻与体重决定炸开多大、外圈留多少。
 *   scorch      灼痕半径与时长：特攻决定烧得多开、留多久。
 *   plates      装甲片数：体重派生，驱动画面。
 *   guardLoss   自身防御下降级：原生固定 1 级；poiseLoss 同理。
 *   tempo/aftercast/recharge：速度与特攻定节奏。
 *
 * 配置 `burst`（散爆式，默认关）双向取舍：
 *   开＝炮弹命中炸开 blast 半径的火团，外圈敌人各吃 share，并在落点留下更大灼痕；代价是炮弹威力 ×0.8、收招 +3 刻、冷却 +5 刻。
 *   关（单发式）＝全部集中在单个目标，威力更高、出手更快。
 *
 * 伤害段 `shell` 与参数同名，走共享换算（原始类别 Special）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    export const armorcannonId = "armorcannon";

    actionParameters.define(armorcannonId, {
        /** 炮弹威力：基础 120；特攻每比 60 多 1 加 0.9（夹 −26..55）；体重每比 60kg 重 1kg 加 0.2（夹 −8..22）；
         *  等级每比 20 高 1 加 0.3（夹 0..18）；散爆 ×0.8；夹 78..205。 */
        shell: formula(
            F.base(120)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-26, 55))
                .plus(F.body("weight").div(10).minus(60).times(0.2).clamp(-8, 22))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("burst", text("worldcombat.skill.armorcannon.preference.burst")), F.const(0.8), F.const(1.0)))
                .clamp(78, 205).round(1),
            "炮弹威力", {
                unit: "威力",
                description: "烧成的那副火壳射出去的力；特攻给力、越重的铠甲弹越重、等级越高越沉。散爆式把力分薄，单发轻一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 弹速：基础 0.9 格/刻；特攻每比 60 多 1 加 0.006（夹 −0.15..0.5）；夹 0.6..1.6。 */
        velocity: formula(
            F.base(0.9).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.5)).clamp(0.6, 1.6).round(2),
            "弹速", {
                unit: "格/刻",
                description: "炮弹飞得多快；特攻越高初速越快，越难被走位躲开。"
            }),
        /** 射程：基础 10 格；速度每比 55 快 1 加 0.05（夹 −1.5..4）；特攻每比 60 多 1 加 0.02（夹 −1..3）；夹 7..17。 */
        reach: formula(
            F.base(10)
                .plus(F.stat("speed").minus(55).times(0.05).clamp(-1.5, 4))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 3))
                .clamp(7, 17).round(2),
            "射程", {
                unit: "格",
                description: "炮弹能打多远；快的个体站位灵活、特攻高的炮管更长。它也是本招的实际射程与指示线长度。"
            }),
        /** 弹体碰撞半径：基础 0.28 格；宽每比 0.9 宽 1 格加 0.5（夹 −0.08..0.55）；高每比 1.4 高 1 格加 0.2（夹 −0.05..0.3）；
         *  夹 0.24..0.9。 */
        radius: formula(
            F.base(0.28)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.08, 0.55))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.05, 0.3))
                .clamp(0.24, 0.9).round(2),
            "弹体碰撞半径", {
                unit: "格",
                description: "炮弹有多大、多容易蹭到人；体型越大炮弹越粗。画面里那枚火壳的尺寸按它派生。"
            }),
        /** 散爆半径：散爆式 = 1.8 + 特攻偏移[0,1.2] + 体重偏移[0,0.5] / 单发式 = 0；夹 0..4。 */
        blast: formula(
            F.when(F.pref("burst", text("worldcombat.skill.armorcannon.preference.burst")),
                F.base(1.8).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 1.2))
                    .plus(F.body("weight").div(10).minus(60).times(0.004).clamp(0, 0.5)), F.const(0))
                .clamp(0, 4).round(2),
            "散爆半径", {
                unit: "格",
                description: "散爆式下炮弹命中炸开多大一团火；特攻与体重决定范围。画面里那圈火环就是这个半径。只有散爆式有。"
            }),
        /** 散爆保留：散爆式 = 0.5 − 特攻偏移[−0.15,0.2] / 单发式 = 0；夹 0..0.8。 */
        share: percent(
            F.when(F.pref("burst", text("worldcombat.skill.armorcannon.preference.burst")),
                F.base(0.5).minus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.15, 0.2)), F.const(0))
                .clamp(0, 0.8).round(2),
            "散爆保留", "散爆式炸到的其他目标保留多少威力；特攻越高越均匀。只有散爆式有。"),
        /** 灼痕半径：基础 1.0 格；特攻每比 60 多 1 加 0.006（夹 0..0.6）；夹 0.8..2.2。 */
        scorch: formula(
            F.base(1.0).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 0.6)).clamp(0.8, 2.2).round(2),
            "灼痕半径", {
                unit: "格",
                description: "炮弹落点烧焦的地面有多大；特攻越高烧得越开。画面里那块焦地就是这个半径。"
            }),
        /** 灼痕时长：基础 100 刻；特攻每比 60 多 1 加 1.0（夹 0..100）；夹 80..240。 */
        scorchTicks: formula(
            F.base(100).plus(F.stat("specialAttack").minus(60).times(1.0).clamp(0, 100)).clamp(80, 240).round(0),
            "灼痕时长", {
                unit: "刻",
                description: "焦地在世界上留多久；特攻越高留得越久。到时原方块回来。"
            }),
        /** 装甲片数：基础 8；体重每 10kg 加 0.35（夹 0..18）；夹 6..26。 */
        plates: formula(
            F.base(8).plus(F.body("weight").div(10).times(0.35).clamp(0, 18)).clamp(6, 26).round(0),
            "装甲片数", {
                unit: "片",
                description: "燃烧铠甲时崩落的碎片量；越重的个体拆下的越多。画面密度按它派生。"
            }),
        /** 自身防御下降级：原生固定 1 级；夹 1..6。 */
        guardLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身防御下降", {
                unit: "级",
                description: "铠甲烧成炮弹后自身防御下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 自身特防下降级：原生固定 1 级；夹 1..6。 */
        poiseLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身特防下降", {
                unit: "级",
                description: "铠甲烧成炮弹后自身特防下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 起手：基础 12 刻；特攻每比 60 多 1 减 0.02（夹 −1..2）；夹 9..15。 */
        tempo: seconds(
            F.base(12).minus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 2)).clamp(9, 15).round(0),
            "起手", "把铠甲烧红、在身前凝出火壳的时间；特攻越高越快。"),
        /** 收招：基础 12 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；夹 9..15。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(9, 15).round(0),
            "收招", "开炮后退开壳、把后坐卸掉的时间；散爆式多炸一下，收得更久。"),
        /** 冷却：基础 38 刻；速度每比 55 快 1 减 0.06（夹 −3..7）；散爆 +5；夹 26..50。 */
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 7))
                .plus(F.when(F.pref("burst", text("worldcombat.skill.armorcannon.preference.burst")), F.const(5), F.const(0)))
                .clamp(26, 50).round(0),
            "冷却", "两次烧甲炮击之间等待多久；快的个体回气更快，散爆式缓得更久。")
    });

    stages(armorcannonId, [
        { level: 30, values: { shell: 128, plates: 12 } },
        { level: 50, values: { shell: 146, reach: 13 } }
    ]);

    defineDamage(armorcannonId, "shell", {}, {});

    describe(armorcannonId, [
        { key: "description.0", values: ["shell"] },
        { key: "description.1", values: ["reach", "velocity", "radius"] },
        { key: "description.2", values: ["guardLoss","poiseLoss"] },
        { key: "description.3", values: ["scorch","scorchTicks"] },
        { key: "burst.on", values: ["blast","share"], when: function (context) { return read(context.detail.values, ["burst"]) === true; } },
        { key: "burst.off", values: [], when: function (context) { return read(context.detail.values, ["burst"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shell"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shell", "tier.1.reach"] }
    ]);
}
