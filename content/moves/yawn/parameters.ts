/**
 * 哈欠 / Yawn —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Normal／变化／威力 0／命中 —（必中）／PP 10／单体；挂上挥发状态 `yawn`
 *   持续两回合，到点把目标转入睡眠；若目标已有状态或对睡眠免疫，这一记当场作废（onTryHit 检查 target.status）。
 *
 * 世界化：把「打一个大哈欠」翻成一记**必中的睡意标记**——施法者张大口，一串睡泡沿一条通视的直线飘过去，
 *   贴在目标头上倒数几秒；时间走完它就睡下。睡意是**延迟**的：目标有几秒钟缓一口气，能靠解状态挣脱，
 *   或者被别人身上的一个状态占住，哈欠就压不下去。它不掷骰、不考验意志，代价全在「等」。
 *
 * 与同族分开：催眠术隔空但靠意志对抗；恶魔之吻要贴身。哈欠是唯一**必然命中、但给对方一个窗口**的一条：
 *   读得出来（头顶的倒数环），反制也清晰（解掉睡意，或在窗口内先中别的状态）。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   reach       传播距离 6 + 等级偏移 +（1 − 当前生命比例）×2（越疲惫哈欠传得越远）；长哈欠 ×1.15 / 短哈欠 ×0.85；夹 4..12。
 *   drowsyTicks 睡意窗口 80 + 特攻偏移；长哈欠 ×1.35 / 短哈欠 ×0.7；夹 50..180。
 *   sleepTicks  最终睡眠 200 + 特攻偏移 + 亲密度 ×0.3；长哈欠 ×1.2 / 短哈欠 ×0.85；夹 120..440。
 *   puffs       睡泡数 6 + 特攻偏移；夹 6..24（也是画面里飘过去的泡数）。
 *   mouthRadius 嘴边圈半径 0.5 + 身高偏移；夹 0.32..0.90。
 *   tempo／aftercast／recharge 速度与等级决定起手、收招、冷却；长哈欠冷却 ×1.1。
 *
 * 配置 `long`（长哈欠）双向取舍：开＝睡意窗口 ×1.35、睡眠 ×1.2，但给了目标更多挣脱的时间，射程 ×1.15、冷却 ×1.1；
 *   关（短哈欠）＝窗口 ×0.7、出手快、冷却短，但睡眠 ×0.85——快速按下去、睡得不深。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const yawnId = "yawn";
    export const yawnScene = "world_combat:move_yawn";
    export const yawnEffect = "world_combat:yawn_drowsy";
    export const yawnDoze = "world_combat:yawn_doze";

    actionParameters.define(yawnId, {
        /** 传播距离：6 + 等级(≥25)偏移[0,2.5] + 疲惫偏移[0,2]；长哈欠 ×1.15 / 短哈欠 ×0.85；夹 4..12。 */
        reach: formula(
            F.base(6)
                .plus(F.level().minus(25).times(0.08).clamp(0, 2.5))
                .plus(F.const(1).minus(F.actor("healthRatio")).times(2).clamp(0, 2))
                .times(F.when(F.pref("long"), F.const(1.15), F.const(0.85)))
                .clamp(4, 12).round(2),
            "传播距离", {
                unit: " 格",
                description: "哈欠沿直线飘多远；等级越高、自己越疲惫，吐出的睡意越远。它需要一条没有被挡住的视线。"
            }),
        /** 睡意窗口：80 + 特攻偏移[−15,40]；长哈欠 ×1.35 / 短哈欠 ×0.7；夹 50..180。 */
        drowsyTicks: seconds(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-15, 40))
                .times(F.when(F.pref("long"), F.const(1.35), F.const(0.7)))
                .clamp(50, 180).round(0),
            "睡意窗口", "目标顶着睡意能撑多久；撑过去就睡下，窗口内解掉睡意或被别的状态占住就作废。"),
        /** 最终睡眠：200 + 特攻偏移[−40,120] + 亲密度 ×0.3；长哈欠 ×1.2 / 短哈欠 ×0.85；夹 120..440。 */
        sleepTicks: seconds(
            F.base(200)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-40, 120))
                .plus(F.individual("friendship").times(0.3))
                .times(F.when(F.pref("long"), F.const(1.2), F.const(0.85)))
                .clamp(120, 440).round(0),
            "睡眠时长", "睡意走完后真正睡多久；特攻越高越沉。受伤害会立刻惊醒。"),
        /** 睡泡数：6 + 特攻偏移[0,14]；夹 6..24。 */
        puffs: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.12).clamp(0, 14)).clamp(6, 24).round(0),
            "睡泡数", {
                unit: " 个",
                description: "一次哈欠飘出的睡泡数量；特攻越高越密，也是画面里泡的数量。"
            }),
        /** 嘴边圈：0.5 + 身高偏移[−0.12,0.4]；夹 0.32..0.90。 */
        mouthRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.12, 0.4)).clamp(0.32, 0.90).round(2),
            "嘴边圈", {
                unit: " 格",
                description: "哈欠在嘴边张开的圈有多大；个高的个体张得更开。"
            }),
        /** 起手：10 − 速度偏移[−2,3]；夹 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(6, 16).round(0),
            "起手", "把哈欠打出来需要多久；速度越快越短。"),
        /** 收招：7 − 速度偏移[−2,2]；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(4, 12).round(0),
            "收招", "打完哈欠收势的时间。"),
        /** 冷却：64 − 等级(≥25)偏移[0,12]；长哈欠 ×1.1 / 短哈欠 ×0.9；夹 34..110。 */
        recharge: seconds(
            F.base(64).minus(F.level().minus(25).times(0.25).clamp(0, 12))
                .times(F.when(F.pref("long"), F.const(1.1), F.const(0.9)))
                .clamp(34, 110).round(0),
            "冷却", "两次哈欠之间的等待；等级越高回得越快，长哈欠缓得更久。")
    });

    stages(yawnId, [
        { level: 30, values: { puffs: 10 } },
        { level: 45, values: { puffs: 15, drowsyTicks: 110, sleepTicks: 280 } }
    ]);

    describe(yawnId, [
        { key: "description.0", values: ["reach", "drowsyTicks"] },
        { key: "description.1", values: ["sleepTicks", "puffs", "mouthRadius"] },
        { key: "long.on", values: [], when: function (context) { return read(context.detail.values, ["long"]) === true; } },
        { key: "long.off", values: [], when: function (context) { return read(context.detail.values, ["long"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.puffs"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.puffs", "tier.1.drowsyTicks", "tier.1.sleepTicks"] }
    ]);
}
