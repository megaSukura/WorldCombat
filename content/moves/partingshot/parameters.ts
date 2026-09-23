/**
 * 抛下狠话 / partingshot —— 参数、数值来源与共享身份。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Dark／变化／威力 —／命中 100／PP 20／优先度 0／sound／
 *   boosts = { atk: −1, spa: −1 }／selfSwitch／target normal；
 *   说明是「抛下狠话威吓对手，降低攻击和特攻后，和后备宝可梦进行替换」。
 *
 * 世界化翻译：即时世界没有后备席，把「抛下一句狠话再换人」落成**朝对手甩出一句带刺的话**——话像一支暗色的镖飞过去，
 *   扎中后把对手的攻击与特攻各削几级，自己趁机背离对手退开。没有替身席可换，替换部分见报告共享前置。
 *
 * 数据分散：
 *   drop        削掉的等级 = 特攻（话越毒）＋ 配置；夹 1..2；
 *   reach       话能飞多远 = 等级 ＋ 配置；它也是本招的实际射程；
 *   flight      飞行速度 = 速度 ＋ 配置（话越快越难躲）；
 *   withdraw    退步距离 = 速度；
 *   markTicks   「被羞辱」身份时长 = 等级 ＋ 配置；
 *   motes       话音碎点 = 特攻；tempo／aftercast／recharge = 速度／等级／配置。
 *
 * 配置 venom（毒舌）：开启＝话更毒（必削 2 级）、羞辱更久 ×1.3，代价是射程 ×0.85、飞行 ×0.8（更慢更容易躲）、
 *   冷却 +14；关闭（快嘴）：射程 ×1.1、飞行 ×1.1、冷却 −6，毒劲只按特攻走。两向各有局面：慢慢磨 vs 快刀。
 * 无伤害段：这是削等级＋退场的 Status 招。
 */
namespace PokemonSkills {
    export const partingshotId = "partingshot";
    export const partingshotScene = "world_combat:move_partingshot";
    export const partingshotEffect = "world_combat:parting_shot";
    export const partingshotStatus = "parting_shot";
    export const partingshotText = "world_combat.move.partingshot.text.barb";
    export const partingshotMissText = "world_combat.move.partingshot.text.whiff";

    actionParameters.define(partingshotId, {
        /** 羞辱级数：1 +（特攻 ≥ 110 时 +1）+（毒舌时 +1）；夹 1..2。 */
        drop: formula(
            F.base(1)
                .plus(F.when(F.stat("specialAttack").gte(110), F.const(1), F.const(0)).as(text("worldcombat.skill.partingshot.value.wither")))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.partingshot.preference.venom")), F.const(1), F.const(0)).as(text("worldcombat.skill.partingshot.value.venom")))
                .clamp(1, 2).round(0),
            "羞辱级数", {
                unit: " 级",
                description: "这句话把对手的攻击与特攻各削掉几级；特攻高的个体话越毒，开启毒舌时稳稳削到 2 级。"
            }),
        /** 话声射程：8 +（等级 − 30）×0.06 [−1,3]；毒舌 ×0.85／快嘴 ×1.1；夹 6..14。 */
        reach: formula(
            F.base(8).plus(F.level().minus(30).times(0.06).clamp(-1, 3))
                .times(F.when(F.pref("venom", text("worldcombat.skill.partingshot.preference.venom")), F.const(0.85), F.const(1.1)))
                .clamp(6, 14).round(2),
            "话声射程", {
                unit: " 格",
                description: "这句狠话能飞多远；等级越高抛得越远，毒舌更慢更近，快嘴更急更远。它也是本招的实际射程。"
            }),
        /** 飞行速度：0.95 +（速度 − 50）×0.006 [−0.15,0.35]；毒舌 ×0.8／快嘴 ×1.1；夹 0.6..1.6。 */
        flight: formula(
            F.base(0.95).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.15, 0.35))
                .times(F.when(F.pref("venom", text("worldcombat.skill.partingshot.preference.venom")), F.const(0.8), F.const(1.1)))
                .clamp(0.6, 1.6).round(2),
            "话声速度", {
                unit: " 格/刻",
                description: "这句话飞行的快慢；速度快的个体吐得更急，毒舌拖得更慢、更容易被让开。"
            }),
        /** 退步距离：3.5 +（速度 − 50）×0.02 [−0.5,1.2]；夹 2..6。 */
        withdraw: formula(
            F.base(3.5).plus(F.stat("speed").minus(50).times(0.02).clamp(-0.5, 1.2)).clamp(2, 6).round(2),
            "退步距离", {
                unit: " 格",
                description: "削完对手后自己背离它退开多远；速度越快退得越开。"
            }),
        /** 羞辱时长：120 +（等级 − 30）×1.2 [−20,40]；毒舌 ×1.3／快嘴 ×0.9；夹 80..280。 */
        markTicks: seconds(
            F.base(120).plus(F.level().minus(30).times(1.2).clamp(-20, 40))
                .times(F.when(F.pref("venom", text("worldcombat.skill.partingshot.preference.venom")), F.const(1.3), F.const(0.9)))
                .clamp(80, 280).round(0),
            "羞辱时长", "对手身上「被抛下狠话」的身份留多久；等级越高留得越久，毒舌更久。"),
        /** 话音碎点：16 + 特攻 ÷ 9；夹 10..44。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").div(9)).clamp(10, 44).round(0),
            "话音碎点", {
                unit: " 点",
                description: "这句话散出的碎点数量，直接驱动表现密度；特攻越高越密。"
            }),
        /** 起手：6 −（速度 − 50）×0.02 [−1,1.5]；夹 4..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1.5)).clamp(4, 9).round(0),
            "起手", "把话甩出去前的吸气；速度越快越短。"),
        /** 收招：6；夹 4..10。 */
        aftercast: seconds(F.base(6).clamp(4, 10).round(0), "收招", "退步后的收势时间。"),
        /** 冷却：70 +（等级 − 30）×0.4 [−4,10]；毒舌 +14／快嘴 −6；夹 48..120。 */
        recharge: seconds(
            F.base(70).plus(F.level().minus(30).times(0.4).clamp(-4, 10))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.partingshot.preference.venom")), F.const(14), F.const(-6)))
                .clamp(48, 120).round(0),
            "冷却", "再抛一句前的等待；毒舌更费、快嘴更省。")
    });

    stages(partingshotId, [
        { level: 34, values: { drop: 2, recharge: 62 } },
        { level: 52, values: { reach: 10, recharge: 54 } }
    ]);

    describe(partingshotId, [
        { key: "description.0", values: ["drop", "markTicks"] },
        { key: "description.1", values: ["reach", "flight", "withdraw"] },
        { key: "venom.on", values: [], when: function (context) { return read(context.detail.values, ["venom"]) === true; } },
        { key: "venom.off", values: [], when: function (context) { return read(context.detail.values, ["venom"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach"] }
    ]);
}
