/**
 * 气味侦测 / Odor Sleuth 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：一般、变化、威力 0、命中必中、PP 40、优先度 0、目标 normal（单体）；
 *   命中给目标挂与识破同一个 foresight 挥发状态：幽灵不再免疫一般／格斗、正闪避被视作 0、已有奇迹之眼时失败。
 *
 * 世界化：把「闻着味咬住一个对手」翻译成**一段更长的追踪印记**——身份与识破共享（world_combat:status/foresight），
 *   所以一般与格斗照样接得上；不同处在于气味会一直跟着目标：窗口更长、照亮更久，且被咬住的期间它的脚步被拖慢
 *   （world_combat:navigate 读取本印记，按 drag 压低移动意图）。闪避同样在开局剥掉一次并在窗口结束还回。
 *   反制：窗口走完或被牛奶一类效果解掉；目标若有清除手段同样能甩掉气味。
 *
 * 与同族分开：识破最短最便宜、只做一次拔闪避；奇迹之眼改超能对恶的免疫并抬施法者命中；气味侦测换的是
 *   一段长时间的咬住与拖慢，适合追一个想跑的目标。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   window      追踪窗口：基础 180 刻 + 等级 × 2.5 + 亲密度 × 0.4，敏锐 ×1.7／迟钝 ×0.8，夹 120..480。
 *   reveal      照亮时长：基础 100 刻 + 等级 × 2.2，敏锐 ×1.3，夹 80..340。
 *   drag        拖慢比例：基础 0.2 + 等级 × 0.005，夹 0.2..0.5；追踪经验越足，把目标咬得越死。
 *   strips      闪避剥离：基础 3 + 等级 × 0.05，夹 1..6 级；实际剥离量受目标现有闪避封顶。
 *   motes       气味点数：基础 14 + 物攻 × 0.06，敏锐 ×1.15，夹 10..36。
 *   reach       嗅闻距离：基础 6 + 碰撞箱高度 × 0.7，敏锐 +1.5，夹 4..12；身板越高闻得越远。
 *   tempo       起手：基础 8 − (速度 − 60) × 0.02（只取正值），敏锐 +4，夹 5..14。
 *   aftercast   收招：基础 5 + 碰撞箱高度 × 1.1，夹 4..9。
 *   recharge    冷却：基础 82 − 等级 × 0.25，敏锐 +20／迟钝 −8，夹 45..130。PP 40。
 * 配置 keen（敏锐）双向取舍：开启＝窗口 ×1.7、照亮 ×1.3、闻得更远，但起手 +4、冷却 +20；关闭＝窗口更短、
 *   起手快、冷却短、距离近。PP 有 40 发，长嗅与短嗅的取舍直接落在追与不追之间。
 */
namespace PokemonSkills {
    export const odorsleuthId = "odorsleuth";
    export const odorsleuthScene = "world_combat:move_odorsleuth";
    export const odorsleuthMarkEffect = "world_combat:odorsleuth_mark";
    export const odorsleuthRecordEffect = "world_combat:odorsleuth_record";
    export const odorsleuthStatus = "odorsleuth";
    export const odorsleuthPickText = "world_combat.move.odorsleuth.text.pick";
    export const odorsleuthFadeText = "world_combat.move.odorsleuth.text.fade";
    export const odorsleuthBlockedText = "world_combat.move.odorsleuth.text.blocked";
    export const odorsleuthEmptyText = "world_combat.move.odorsleuth.text.empty";

    actionParameters.define(odorsleuthId, {
        window: seconds(
            F.base(180).plus(F.level().times(2.5)).plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.7), F.const(0.8)))
                .clamp(120, 480).round(0),
            "追踪窗口", "气味咬住对手多久：等级与亲密度延长它，敏锐明显更长；窗口里一般/格斗打得上幽灵。"),
        reveal: seconds(
            F.base(100).plus(F.level().times(2.2))
                .times(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.3), F.const(1)))
                .clamp(80, 340).round(0),
            "照亮时长", "目标被气味标出、在掩体后也可见的时长；等级越高越久，敏锐更长。"),
        drag: percent(
            F.base(0.2).plus(F.level().times(0.005)).clamp(0.2, 0.5).round(3),
            "拖慢比例", "被咬住期间目标移动意图被压低的比例；追踪经验越足，咬得越死。"),
        strips: formula(
            F.base(3).plus(F.level().times(0.05)).clamp(1, 6).round(0),
            "闪避剥离", {
                unit: " 级",
                description: "一次剥掉目标几级正闪避；实际剥离量受目标现有闪避封顶，窗口结束原样还回。"
            }),
        motes: formula(
            F.base(14).plus(F.stat("attack").times(0.06))
                .times(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.15), F.const(1)))
                .clamp(10, 36).round(0),
            "气味点数", {
                unit: " 点",
                description: "气味团的粒子数量；物攻越高越密，画面里的气味点与它一致。"
            }),
        reach: formula(
            F.base(6).plus(F.body("height").times(0.7))
                .plus(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(1.5), F.const(0)))
                .clamp(4, 12).round(1),
            "嗅闻距离", {
                unit: " 格",
                description: "能闻到对手的距离；身板越高闻得越远，敏锐再远 1.5 格，也是玩家瞄准能接受的范围。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(4), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "认真闻一遍需要多久；速度越快越短，敏锐多花几刻。"),
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.1)).clamp(4, 9).round(0),
            "收招", "闻到之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(82).minus(F.level().times(0.25))
                .plus(F.when(F.pref("keen", text("worldcombat.skill.odorsleuth.preference.keen")), F.const(20), F.const(-8)))
                .clamp(45, 130).round(0),
            "冷却", "两次气味侦测之间的等待；等级越高越熟练，敏锐更费力。PP 40。")
    });

    describe(odorsleuthId, [
        { key: "description.0", values: ["window","drag"] },
        { key: "description.1", values: ["reveal"] },
        { key: "keen.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["keen"]) === true; } },
        { key: "keen.off", values: [], when: function (context) { return read(context.detail.values, ["keen"]) !== true; } },
        { key: "description.2", values: ["strips","reach","tempo","aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
