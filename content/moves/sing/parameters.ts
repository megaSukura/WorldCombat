/**
 * 唱歌 / Sing —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Normal／变化／威力 0／命中 55／PP 15／单体，命中后目标陷入睡眠；flags 含
 *   sound 与 bypasssub（声音类，穿过替身）。
 *
 * 世界化：把「唱一首摇篮曲」翻成一件**持续的事**——施法者开口，一串音符一圈圈荡出去；声音不认遮挡
 *   （墙、同伴、替身都拦不住），但只传得了这么远。每荡过一遍就在听者身上多按一分睡意，听满 `notes`
 *   句的目标才睡下。所以它与同族分开的地方不在「能不能中」，而在**要听多久**：特攻与等级越强，需要的
 *   句数越少；弱一点的个体唱得更久，对手也就有更长的窗口走开声场或打断这首歌。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   reach       声场半径（实际覆盖）：等级 ＋ 特攻（嗓门与气势），配置「悠长」收窄。
 *   breath      起手：速度（越快越早开口）。
 *   beat        每句之间的间隔：速度（快个体唱得急）。
 *   notes       听满几句才睡：特攻 ＋ 等级（越强越少），配置「悠长」多要一句。
 *   sleepTicks  睡多久：特攻 ＋ 亲密度（越亲近、越有分量睡得越沉），配置「悠长」延长。
 *   dozeTicks   每句睡意的存留：特攻（越强留得越久，走出声场后残余也久）。
 *   rings       每一句荡出的波纹圈数：特攻 ＋ 等级台阶；也是画面里一圈圈声波的数量。
 *   aftercast   收招：速度。
 *   recharge    冷却：等级，配置「悠长」更久。
 *
 * 配置 `soothing`（悠长）双向取舍：开启＝睡眠 ×1.25、多要一句、冷却 ×1.1，但声场 ×0.85，用来唱透一个
 *   硬目标；关闭（轻快）＝声场 ×1.15、少要一句、冷却 ×0.9，但睡眠 ×0.8。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const singId = "sing";
    export const singScene = "world_combat:move_sing";
    export const singDrowsy = "world_combat:sing_drowsy";
    export const singTrance = "world_combat:sing_trance";

    actionParameters.define(singId, {
        /** 声场半径：(4.5 + 等级(≥30)偏移[0,1.5] + 特攻偏移[−0.5,1.5]) × 悠长 0.85／轻快 1.15；夹 3.0..8.0。 */
        reach: formula(
            F.base(4.5)
                .plus(F.level().minus(30).times(0.06).clamp(0, 1.5))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.5))
                .times(F.when(F.pref("soothing"), F.const(0.85), F.const(1.15)))
                .clamp(3.0, 8.0).round(2),
            "声场半径", {
                unit: " 格",
                description: "歌声能传到多远；等级越高、特攻越强，声场越阔。声音穿过墙与同伴，只认距离，不认遮挡。"
            }),
        /** 起手：11 − 速度偏移[−3,5]；夹 6..18。 */
        breath: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5)).clamp(6, 18).round(0),
            "起手", "深吸一口气、开口的时间；速度越快越短。"),
        /** 每句间隔：22 − 速度偏移[−4,8]；夹 12..32。 */
        beat: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.08).clamp(-4, 8)).clamp(12, 32).round(0),
            "每句间隔", "两句之间隔多久；快个体唱得更急，整首歌更短，留给对手的窗口也更小。"),
        /** 所需句数：5 − 特攻偏移[0,2] − 等级(≥30)偏移[0,1] + 悠长 +1／轻快 −1；夹 3..8。 */
        notes: formula(
            F.base(5)
                .minus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 2))
                .minus(F.level().minus(30).times(0.01).clamp(0, 1))
                .plus(F.when(F.pref("soothing"), F.const(1), F.const(-1)))
                .clamp(3, 8).round(0),
            "所需句数", {
                unit: " 句",
                description: "听满几句才睡下；特攻与等级越强、需要的句数越少。它也是画面里荡出的声波次数（再加两句余韵）。"
            }),
        /** 睡眠时长：(190 + 特攻偏移[−40,120] + 亲密度×0.4) × 悠长 1.25／轻快 0.8；夹 100..360。 */
        sleepTicks: seconds(
            F.base(190)
                .plus(F.stat("specialAttack").minus(60).times(0.8).clamp(-40, 120))
                .plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("soothing"), F.const(1.25), F.const(0.8)))
                .clamp(100, 360).round(0),
            "睡眠时长", "睡着之后睡多久；特攻越高、越亲近的个体唱得越沉。受伤害会立刻惊醒。"),
        /** 睡意存留：70 + 特攻偏移[−15,35]；夹 45..120。 */
        dozeTicks: seconds(
            F.base(70).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-15, 35)).clamp(45, 120).round(0),
            "睡意存留", "每听一句留下的睡意能挂多久；特攻越高挂得越久。走出声场后按它慢慢散尽，散尽就从头再数。"),
        /** 声波圈数：3 + 特攻偏移[0,7]；夹 3..10；等级台阶再抬。 */
        rings: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(0, 7)).clamp(3, 10).round(0),
            "声波圈数", {
                unit: " 圈",
                description: "每一句荡出的声波圈数；特攻越高越密，也是画面里一圈圈波纹的数量。"
            }),
        /** 收招：12 − 速度偏移[−2,4]；夹 7..17。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4)).clamp(7, 17).round(0),
            "收招", "唱完最后一句、收回气的时间。"),
        /** 冷却：(120 − 等级(≥30)偏移[0,15]) × 悠长 1.1／轻快 0.9；夹 60..150。 */
        recharge: seconds(
            F.base(120).minus(F.level().minus(30).times(0.5).clamp(0, 15))
                .times(F.when(F.pref("soothing"), F.const(1.1), F.const(0.9)))
                .clamp(60, 150).round(0),
            "冷却", "两首歌之间的等待；等级越高回得越快，悠长式缓得更久。")
    });

    stages(singId, [
        { level: 35, values: { rings: 6 } },
        { level: 50, values: { rings: 8, sleepTicks: 240, notes: 4 } }
    ]);

    describe(singId, [
        { key: "description.0", values: ["reach","beat"] },
        { key: "description.1", values: ["notes","sleepTicks"] },
        { key: "description.2", values: ["dozeTicks"] },
        { key: "soothing.on", values: [], when: function (context) { return read(context.detail.values, ["soothing"]) === true; } },
        { key: "soothing.off", values: [], when: function (context) { return read(context.detail.values, ["soothing"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sleepTicks", "tier.1.notes"] }
    ]);
}
