/**
 * 草笛 / Grass Whistle —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Grass／变化／威力 0／命中 55／PP 15／单体，命中后目标陷入睡眠；flags 含
 *   sound 与 bypasssub（声音类）。它**不是粉末**，所以草属性对它没有免疫。
 *
 * 世界化：把「吹响一片草叶」翻成一记**笔直的哨音**——施法者含着一片草叶，一口气吹出一声又尖又长的音，
 *   声音沿「自身→目标」的直线扎出去：穿过路上第一个目标、继续扎进它背后的敌人。它要有通视的直线
 *   （实心墙会挡住音束），但不被生物挡住（声音穿过同伴的身体）；一声就完，快而准。代价是这一声要么响、
 *   要么裂：每一次吹奏只掷一次骰子，裂了整条线都只剩一点走音。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   reach       音束长度（实际射程）：等级 ＋ 特攻（气足吹得远），配置「阔音」缩短。
 *   laneWidth   音束半宽：体宽（口型越大越粗），配置决定基础宽度。
 *   voices      一声最多穿过几个人：特攻（越强音束越结实），配置加/减。
 *   sleepTicks  睡眠时长（本组最短的一记）：特攻 ＋ 亲密度。
 *   landChance  这一声响不响：施法者特攻与等级对抗目标的特防与等级。
 *   shrills     沿音束铺开的波纹数：特攻 ＋ 等级台阶；也是画面里一圈圈音的圈数。
 *   noteSpeed   音的推进速度：速度（快个体吹得更急），驱动画面里音束的推进。
 *   tempo       起手：速度。
 *   aftercast   收招：速度。
 *   recharge    冷却：等级，配置「阔音」更短／「细笛」更久。
 *
 * 配置 `narrow`（细笛）双向取舍：开启＝音束半宽 ×0.7、最多穿透 +2 人、睡眠 ×1.1，但冷却 ×1.15、更难把人
 *   串在一条线上；关闭（阔音）＝半宽 ×1.4、更容易一次罩住站得散的一小群，但穿透 −1 人、睡眠 ×0.85、冷却 ×0.9。
 *   两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const grasswhistleId = "grasswhistle";
    export const grasswhistleScene = "world_combat:move_grasswhistle";

    actionParameters.define(grasswhistleId, {
        /** 音束长度：(10 + 等级(≥30)偏移[0,2.5] + 特攻偏移[−0.5,1.5]) × 阔音 0.85／细笛 1.1；夹 7..15。 */
        reach: formula(
            F.base(10)
                .plus(F.level().minus(30).times(0.08).clamp(0, 2.5))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.5))
                .times(F.when(F.pref("narrow"), F.const(1.1), F.const(0.85)))
                .clamp(7, 15).round(2),
            "音束长度", {
                unit: " 格",
                description: "一声哨音能笔直送出多远；等级越高、特攻越强吹得越远。它也是本招的实际射程，音束需要一条没有被实心墙挡住的直线。"
            }),
        /** 音束半宽：(0.7 + 体宽偏移[−0.15,0.9]) × 细笛 0.7／阔音 1.4；夹 0.45..1.8。 */
        laneWidth: formula(
            F.base(0.7)
                .plus(F.body("width").minus(0.9).times(0.6).clamp(-0.15, 0.9))
                .times(F.when(F.pref("narrow"), F.const(0.7), F.const(1.4)))
                .clamp(0.45, 1.8).round(2),
            "音束半宽", {
                unit: " 格",
                description: "音束有多粗；体型越宽口型越大。细笛式收窄，阔音式放宽。它也是判定与画面里音束的半宽。"
            }),
        /** 最多穿透：3 + 特攻偏移[0,3] + 细笛 +2／阔音 −1；夹 2..6。 */
        voices: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(0, 3))
                .plus(F.when(F.pref("narrow"), F.const(2), F.const(-1)))
                .clamp(2, 6).round(0),
            "最多穿透", {
                unit: " 人",
                description: "一声最多能穿过几个人；特攻越高音束越结实。后面还站着的人只有先在前一个身上穿过去才会被这一声带走。"
            }),
        /** 睡眠时长：140 + 特攻偏移[−30,90] + 亲密度×0.3；细笛 ×1.1／阔音 ×0.85；夹 80..300。 */
        sleepTicks: seconds(
            F.base(140)
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-30, 90))
                .plus(F.individual("friendship").times(0.3))
                .times(F.when(F.pref("narrow"), F.const(1.1), F.const(0.85)))
                .clamp(80, 300).round(0),
            "睡眠时长", "这一声带走的睡眠有多久；它是本组最短的一记，一声就完、也醒得快。"),
        /** 生效概率：0.55 +（特攻 − 目标特防）×0.003 + 等级差 ×0.004；夹 0.30..0.95。 */
        landChance: percent(
            F.base(0.55)
                .plus(F.stat("specialAttack").minus(F.target("stat.specialDefence")).times(0.003).clamp(-0.25, 0.35))
                .plus(F.level().minus(F.target("level")).times(0.004).clamp(-0.1, 0.1))
                .clamp(0.30, 0.95),
            "生效概率", "这一声是响是裂：施法者的特攻与等级压过目标的特防与等级，才更容易一声吹准。裂了整条线都只剩走音。"),
        /** 波纹数：5 + 特攻偏移[0,8]；夹 4..14；等级台阶再抬。 */
        shrills: formula(
            F.base(5).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(0, 8)).clamp(4, 14).round(0),
            "波纹数", {
                unit: " 圈",
                description: "沿音束铺开的一圈圈声波数量；特攻越高越密，也是画面里波纹的数量。"
            }),
        /** 推进速度：2.2 + 速度偏移[−0.6,1.6]；夹 1.4..4.0。 */
        noteSpeed: formula(
            F.base(2.2).plus(F.stat("speed").minus(60).times(0.03).clamp(-0.6, 1.6)).clamp(1.4, 4.0).round(2),
            "音的推进", {
                unit: " 格/刻",
                description: "哨音沿音束推进的快慢；速度快的个体吹得更急，画面里的音束也更利落地扎穿整条线。"
            }),
        /** 起手：8 − 速度偏移[−2,3]；夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3)).clamp(5, 14).round(0),
            "起手", "含好草叶、一口气吹响的时间；速度越快越短。"),
        /** 收招：7 − 速度偏移[−1.5,2.5]；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "收招", "一声吹完、收回气的时间。"),
        /** 冷却：(70 − 等级(≥30)偏移[0,10]) × 阔音 0.9／细笛 1.15；夹 40..120。 */
        recharge: seconds(
            F.base(70).minus(F.level().minus(30).times(0.3).clamp(0, 10))
                .times(F.when(F.pref("narrow"), F.const(1.15), F.const(0.9)))
                .clamp(40, 120).round(0),
            "冷却", "两次吹奏之间的等待；等级越高回得越快，细笛式缓得更久。")
    });

    stages(grasswhistleId, [
        { level: 40, values: { shrills: 8, voices: 4 } },
        { level: 55, values: { shrills: 11, sleepTicks: 190, reach: 12 } }
    ]);

    describe(grasswhistleId, [
        { key: "description.0", values: ["reach", "laneWidth", "voices"] },
        { key: "description.1", values: ["landChance", "sleepTicks"] },
        { key: "description.sleep", values: [] },
        { key: "narrow.on", values: [], when: function (context) { return read(context.detail.values, ["narrow"]) === true; } },
        { key: "narrow.off", values: [], when: function (context) { return read(context.detail.values, ["narrow"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.voices"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sleepTicks", "tier.1.reach"] }
    ]);
}
