/**
 * 轮唱 / round —— 参数与伤害段。
 *
 * 原生事实：Normal／特殊／威力 60／命中 100／PP 15／声音（sound、bypasssub）；
 *   描述「用歌声攻击对手。同伴还可以接着使出轮唱招式，威力也会提高」——原生的 doubles BP 在同一个回合里
 *   由「前一个动作也是轮唱」触发（sourceEffect === "round"，威力 ×2，并且接着立刻行动）。
 *
 * 翻译：把「同回合另一只同伴也唱」落成**一句能传下去、越接越响的短歌**。领唱者唱出一句，句子的余韵落在
 *   身边同伴身上（共享身份 world_combat:status/round）；带着余韵的人接着唱，威力翻倍、张口即出。
 *   所以轮唱是一个人也能唱、有同伴才唱得响的招：独唱永远是基础威力，接得上伙伴的那一句才是双倍。
 *   歌是声音，看不见、不检查视线，掩体挡不住；它点名一个目标，不铺开一片。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   verse        歌句威力：特攻定嗓门，等级定歌艺；接唱时 ×2。
 *   chorusRadius 传唱半径：身高定声音铺多远，特攻补一点。
 *   echoTicks    余韵时长：等级与特攻决定同伴的接唱窗口有多久。
 *   reach        歌程：特攻与等级共同决定能唱到多远。
 *   noteSpeed    歌速：速度决定音符掠过多快（也驱动表现）。
 *   splash       落点半径：身高决定击点铺开多大。
 *   notes        音数：特攻与等级决定这一句里有多少音符，直接驱动表现。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 lead（领唱）：开启＝传唱半径 ×1.35、余韵 ×1.3，但自己这句威力 ×0.94、起手 +2 刻、冷却 +3 刻；
 *   关闭＝留给自己唱，威力更足。两向各有适用局面（带同伴 vs 独唱）。
 *
 * 伤害段 verse：这一句落在目标身上的那一下，sound: true 让原生隔音类能力参与。
 */
namespace PokemonSkills {
    export const roundId = "round";
    export const roundCarol = "world_combat:round_carol";
    export const roundScene = "world_combat:move_round";
    export const roundJoinText = "world_combat.move.round.text.join";
    export const roundVerseText = "world_combat.move.round.text.verse";
    export const roundMissText = "world_combat.move.round.text.miss";

    actionParameters.define(roundId, {
        /** 歌句威力：基础 46，特攻每比 60 多 1 加 0.18（夹 -10..20），等级每比 30 高 1 加 0.3（夹 0..9）；接唱 ×2；领唱 ×0.94；夹在 28..152。 */
        verse: formula(
            F.base(46)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-10, 20))
                .plus(F.level().minus(30).times(0.3).clamp(0, 9))
                .times(F.when(F.status("round"), F.const(2), F.const(1))
                    .as({ key: "worldcombat.skill.round.value.carried", fallback: "接唱翻倍" }))
                .times(F.when(F.pref("lead"), F.const(0.94), F.const(1)))
                .clamp(28, 152).round(1),
            "歌句威力", {
                unit: "威力",
                description: "这一句落在目标身上的基础威力；特攻越高嗓门越亮，等级越高歌艺越纯。带着同伴的余韵接唱时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 传唱半径：基础 7 格，碰撞箱每比 1.4 高 1 格加 1.3 格，特攻每比 60 多 1 加 0.02（夹 -1..2）；领唱 ×1.35；夹在 5..13。 */
        chorusRadius: formula(
            F.base(7).plus(F.body("height").minus(1.4).times(1.3))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 2))
                .times(F.when(F.pref("lead"), F.const(1.35), F.const(1)))
                .clamp(5, 13).round(2),
            "传唱半径", {
                unit: "格",
                description: "这句歌的余韵能落到多远的同伴身上；身量大、特攻高的个体声音铺得更开，领唱形态传得更远。"
            }),
        /** 余韵时长：基础 120 刻，等级每比 30 高 1 加 1.4 刻（夹 0..60），特攻每比 60 多 1 加 0.3 刻（夹 -18..40）；领唱 ×1.3；夹在 80..260。 */
        echoTicks: seconds(
            F.base(120).plus(F.level().minus(30).times(1.4).clamp(0, 60))
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-18, 40))
                .times(F.when(F.pref("lead"), F.const(1.3), F.const(1)))
                .clamp(80, 260).round(0),
            "余韵时长", "同伴接过这句话后，多久之内接唱都能翻倍；等级与特攻越高，余韵留得越久，领唱形态更久。"),
        /** 歌程：基础 6.5 格，特攻每比 60 多 1 加 0.03（夹 -1.2..2.4），等级每比 30 高 1 加 0.03（夹 0..1.4）；夹在 5.5..11。 */
        reach: formula(
            F.base(6.5).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1.2, 2.4))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.4))
                .clamp(5.5, 11).round(2),
            "歌程", {
                unit: "格",
                description: "这句歌能唱到多远的目标；特攻高、等级高的个体声音送得更远。它也是本招的实际射程来源。"
            }),
        /** 歌速：基础 1.1 格/刻，速度每比 60 快 1 加 0.004，夹在 0.8..1.6。 */
        noteSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.8, 1.6).round(2),
            "歌速", {
                unit: "格/刻",
                description: "这句歌掠过路径的速度；快的个体唱得越急，画面里的音符也走得越快。"
            }),
        /** 落点半径：基础 1.0 格，碰撞箱每比 1.4 高 1 格加 0.35，夹在 0.7..1.8。 */
        splash: formula(
            F.base(1.0).plus(F.body("height").minus(1.4).times(0.35)).clamp(0.7, 1.8).round(2),
            "落点半径", {
                unit: "格",
                description: "这一句在目标身上收束、炸开的判定半径；大个子的歌句落点更宽。"
            }),
        /** 音数：基础 6，特攻每比 60 多 1 加 0.08，等级每比 30 高 1 加 0.1，夹在 4..16 并向下取整。 */
        notes: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.08))
                .plus(F.level().minus(30).times(0.1)).clamp(4, 16).floor(),
            "音数", {
                unit: "个",
                description: "这一句里画出的音符数量；特攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 起手：基础 10 刻，速度每比 60 快 1 减 0.04 刻，领唱 +2；夹在 5..18。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04))
                .plus(F.when(F.pref("lead"), F.const(2), F.const(0))).clamp(5, 18).round(0),
            "起手", "开口之前清嗓、起调的时间；速度越快越短，领唱形态多花一点。"),
        /** 收招：基础 7 刻，速度每比 60 快 1 减 0.01 刻，夹在 4..10。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.01)).clamp(4, 10).round(0),
            "收招", "这一句唱完后的收势；速度越快收得越干净。"),
        /** 冷却：基础 30 刻，速度每比 60 快 1 减 0.05 刻，领唱 +3；夹在 18..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05))
                .plus(F.when(F.pref("lead"), F.const(3), F.const(0))).clamp(18, 46).round(0),
            "冷却", "两次起唱之间的等待；速度越快回得越快，领唱形态要缓更久。")
    });

    defineDamage(roundId, "verse", {}, { sound: true });

    stages(roundId, [
        { level: 34, values: { verse: 58 } },
        { level: 52, values: { verse: 70, echoTicks: 150 } },
        { level: 66, values: { verse: 84 } }
    ]);

    describe(roundId, [
        { key: "description.0", values: ["verse"] },
        { key: "description.1", values: ["chorusRadius", "echoTicks"] },
        { key: "description.2", values: ["reach", "splash"] },
        { key: "description.3", values: ["notes", "noteSpeed"] },
        { key: "description.4", values: ["pref.lead"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.verse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.verse", "tier.1.echoTicks"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.verse"] }
    ]);
}
