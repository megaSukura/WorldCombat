/**
 * 围攻 / beatup —— 参数、伤害段与「召集范围／每下轻重」取舍。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：恶／物理／命中 100／PP 10／优先度 0／不接触；
 *   威力由每只同行宝可梦的基础物攻决定（5 + floor(baseAtk/10)），攻击次数＝队伍里能出场的同伴数（含使用者）。
 *   说明是「我方全员进行攻击。同行的宝可梦越多，招式的攻击次数越多」。
 *
 * 世界化翻译：在这个项目里，同行伙伴**真的站在场上**——宝可梦被放出后就在世界里。所以「我方全员」自然读成
 *   「身边所有站在 rally 半径内的同伴」：施法者一声招呼，每只同伴身上浮起一道暗影扑向目标，一只接一只地围殴。
 *   同伴越多，落下的拳头越多；每一位同伴自己的物攻决定自己那一下的份量。这既保留了原生「按同伴物攻、按人数」
 *   的结构，又把它落到真实的世界成员上，而不是抽象的后备名单。
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   mob           每一下的基准威力 = 物攻 + 等级成长（领队自己那一下就是它）。
 *   rally         召集半径 = 等级；能喊来多远的同伴。
 *   crowd         最多合击数 = 等级；能指挥多少人一起上。
 *   gap           每一下的间隔 = 速度；快的人连击更密。
 *   lull          号令起手 = 速度。
 *   speed         暗影飞行速度 = 速度。
 *   radius        每道暗影判定半径 = 体型高度。
 *   motes         暗影碎屑数 = 物攻；直接驱动粒子数量。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `widen`（围攻式）双向取舍：开启＝召集半径 ×1.3、每一下 ×0.82（更多同伴加入、每人更轻，总段数多）；
 *   关闭（精锐式）＝召集半径 ×0.7、每一下 ×1.2（只有近处强手加入，段落少但每下更重）。两向都有适用局面。
 *
 * 伤害段 `mob` 走共享换算（原始类别 Physical，不接触）；每段在运行时按该同伴自己的物攻再缩放一次。
 */
namespace PokemonSkills {
    actionParameters.define("beatup", {
        /** 每下基准威力：12 +（物攻 − 60）×0.28 [−8,26] +（等级 − 30）×0.12 [0,10]；围攻 ×0.82／精锐 ×1.2；夹 18..84。 */
        mob: formula(
            F.base(12)
                .plus(F.stat("attack").minus(60).times(0.28).clamp(-8, 26))
                .plus(F.level().minus(30).times(0.12).clamp(0, 10))
                .times(F.when(F.pref("widen", text("worldcombat.skill.beatup.preference.widen")), F.const(0.82), F.const(1.2)))
                .clamp(18, 84).round(1),
            "每下威力", {
                base: 26, unit: "威力",
                description: "合击里每一下的基准威力，也是领队自己那一下；物攻与等级决定基准，围攻式更轻、精锐式更重。同伴各自的物攻在运行时决定他们那一下相对领队的轻重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 召集半径：（5.5 +（等级 − 30）×0.05 [0,2]）×（围攻 ×1.3／精锐 ×0.7）；夹 3..10。 */
        rally: formula(
            F.base(5.5).plus(F.level().minus(30).times(0.05).clamp(0, 2))
                .times(F.when(F.pref("widen", text("worldcombat.skill.beatup.preference.widen")), F.const(1.3), F.const(0.7)))
                .clamp(3, 10).round(2),
            "召集半径", { unit: " 格", description: "这么多格以内的同伴会一起扑上去；等级越高喊得越远，围攻式范围更大、精锐式更近。" }),
        /** 最多合击数：3 +（等级 − 30）×0.06 [0,3]；夹 2..6。 */
        crowd: formula(
            F.base(3).plus(F.level().minus(30).times(0.06).clamp(0, 3)).clamp(2, 6).round(0),
            "最多合击", { unit: "只", description: "一次最多有多少名同伴（含自己）一起上；等级越高能招呼的越多。" }),
        /** 每下间隔：5 −（速度 − 55）×0.01 [−0.5,0.8]；夹 3..7。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.5, 0.8)).clamp(3, 7).round(0),
            "每下间隔", "两只同伴扑击之间隔多久；速度越快连击越密。"),
        /** 号令起手：8 −（速度 − 55）×0.02 [−0.6,1.4]；夹 5..12。 */
        lull: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.4)).clamp(5, 12).round(0),
            "号令起手", "招呼同伴、把它们叫起来的时间；速度越快起得越短。"),
        /** 暗影飞行速度：1.0 +（速度 − 55）×0.006 [−0.2,0.5]；夹 0.8..1.8。 */
        speed: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.5)).clamp(0.8, 1.8).round(2),
            "暗影速度", { unit: "格/刻", description: "每道暗影扑向目标的速度；速度快的个体扑得越急。" }),
        /** 判定半径：0.35 +（身高 − 1.4）×0.1 [−0.06,0.22]；夹 0.3..0.6。 */
        radius: formula(
            F.base(0.35).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.06, 0.22)).clamp(0.3, 0.6).round(2),
            "暗影判定", { unit: "格", description: "每道暗影能覆盖多大一圈；身板大的同伴暗影更宽。" }),
        /** 碎屑数：10 +（物攻 − 60）×0.18 [−4,20]；夹 8..40。 */
        motes: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.18).clamp(-4, 20)).clamp(8, 40).round(0),
            "暗影碎屑", { unit: "点", description: "每一下撞上时迸出的暗色碎屑数量，直接驱动表现密度；物攻越高越密。" }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.4)).clamp(5, 12).round(0),
            "起手", "从低吼到同伴扑出的准备；速度越快越短。"),
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.4)).clamp(5, 10).round(0),
            "收招", "围殴结束后收势的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(60).minus(F.stat("speed").minus(55).times(0.1).clamp(-6, 10)).clamp(40, 80).round(0),
            "冷却", "再召集一次前的等待；速度越快回得越快。")
    });

    defineDamage("beatup", "mob", { rationale: "一记暗影群殴：单看每下不重，靠人数堆出总量；每段按同伴自己的物攻缩放。" }, {});

    stages("beatup", [
        { level: 32, values: { mob: 34, crowd: 4 } },
        { level: 50, values: { mob: 44, crowd: 5 } }
    ]);

    describe("beatup", [
        { key: "description.0", values: ["mob"] },
        { key: "description.1", values: ["rally","crowd","gap"] },
        { key: "description.2", values: ["lull","speed"] },
        { key: "description.flow", values: [] },
        { key: "widen.on", values: [], when: function (context) { return read(context.detail.values, ["widen"]) === true; } },
        { key: "widen.off", values: [], when: function (context) { return read(context.detail.values, ["widen"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.mob", "tier.0.crowd"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.mob", "tier.1.crowd"] }
    ]);
}
