/**
 * 叫声 / Growl 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 40／目标 allAdjacentFoes（相邻全体）／boosts={atk:-1}（降低攻击）／
 *       flags 含 sound、bypasssub（声音类，绕过替身、也绕过掩体）。
 * 世界化：不是隔空扣等级，而是**一声可爱的叫喊从身上荡开**——凡听得见这声叫的都分了神，出手变轻。
 *   它是声音，所以不需要通视：躲在墙后、背对着它也会被叫到，这正是它和「瞪眼」「摇尾巴」最大的区别；
 *   代价是降得浅、半径有限，自己必须站得够近。命中后挂共享身份 world_combat:status/charmed 的真实
 *   MobEffect，再 NativeEffects.boost 下降攻击：宝可梦损失原生攻击等级，其他生物落到攻击属性。
 * 「短叫」快而近；「拖长音」铺得更开、留得更久，但起手与冷却都更长。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop        基础 1 级，等级 ≥ 45 升到 2 级；夹 1..2。经验越足，叫声越能把人叫软。
 *   soundRadius 3.5 + 宽度 × 1.2，拖长音 ×1.5，夹 2.5..7；体型越宽，声音摊得越开。
 *   hushTicks   90 + 亲密度 × 0.8，拖长音 ×1.4，夹 60..260；越亲近越能把这份分神留住。
 *   notes       16 + (特攻 − 50) × 0.3，夹 12..40；心神越盛的施法者一次吐出的音符越多（也是画面里的数量）。
 *   tempo       6 − (速度 − 60) × 0.03，拖长音 +4，夹 4..14；速度越快越早开口。
 *   recharge    100 + (等级 − 30) × 0.6，拖长音 +40，夹 80..180；等级越高越熟练。PP 40。
 */
namespace PokemonSkills {
    export const growlId = "growl";
    export const growlEffect = "world_combat:growl_hush";
    export const growlScene = "world_combat:move_growl";
    export const growlSpot = "world_combat:status/charmed";

    actionParameters.define(growlId, {
        drop: formula(
            F.base(1).plus(F.when(F.level().gte(45), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "攻击下降", {
                unit: " 级",
                description: "听见叫声者损失的攻击等级；等级达到 45 时从 1 级升到 2 级。"
            }),
        soundRadius: formula(
            F.base(3.5).plus(F.body("width").times(1.2))
                .times(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(1.5), F.const(1)))
                .clamp(2.5, 7).round(2),
            "叫声半径", {
                unit: " 格",
                description: "叫声能传到多远；体型越宽摊得越开，拖长音明显更远。画面里的声环铺到哪，就是会被叫到哪。"
            }),
        hushTicks: seconds(
            F.base(90).plus(F.individual("friendship").times(0.8))
                .times(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(1.4), F.const(1)))
                .clamp(60, 260).round(0),
            "分神时长", "被叫到的人分神多久；施法者越亲近留得越久，拖长音更长。"),
        notes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).max(0).times(0.3)).clamp(12, 40).round(0),
            "音符量", {
                unit: " 个",
                description: "一次叫声吐出的音符数量；心神越盛的施法者越多，画面里的音符也按它画出。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).max(0).times(0.03))
                .plus(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(4), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "把气吸满、叫出声需要多久；速度越快越早，拖长音要多花几刻。"),
        recharge: seconds(
            F.base(100).plus(F.level().minus(30).max(0).times(0.6))
                .plus(F.when(F.pref("howl", text("worldcombat.skill.growl.preference.howl")), F.const(40), F.const(0)))
                .clamp(80, 180).round(0),
            "冷却", "两次叫声之间的等待；等级越高越熟练，拖长音更费力。PP 40。")
    });

    describe(growlId, [
        { key: "description.0", values: ["drop","hushTicks"] },
        { key: "description.1", values: ["soundRadius"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "howl.off", values: [], when: function (context) { return read(context.detail.values, ["howl"]) !== true; } },
        { key: "howl.on", values: [], when: function (context) { return read(context.detail.values, ["howl"]) === true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
