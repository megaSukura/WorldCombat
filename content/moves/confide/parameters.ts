/**
 * 密语 / Confide 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 —（必定命中）／PP 20／目标 normal（单体）／boosts={spa:-1}／
 *       flags 含 sound、bypasssub、reflectable（声音类，能绕过替身与掩体）。
 * 世界化：凑到对手耳边说一个秘密——一句话沿直线钻进对方脑子里，让它失去集中力、特攻下降。
 *   这句话是声音，所以不需要通视：躲在墙后也会被听见，这是它和「凝视」类招式最大的区别；代价是降得少、
 *   只认听得见的距离，而且这份下降是**临时**的：只持续失神窗口 focusTicks，窗口结束、被驱散或再次施加时
 *   随载体一起收回，不再像旧版那样永久扣级。成功后施法者可立刻换其他行动。
 *   降不动（免疫或已到底线）时不挂标记、不报成功。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   whisperRange  身高 × 1.1 + 3.6 格，夹 5..9；身量越高，声音送得越远。
 *   drop          固定 1 级；密语只拿掉一点集中力，弱而免费。
 *   focusTicks    120 + 亲密度 × 1.0，夹 70..300；越亲近，越能把这份分心留住。
 *   whispers      14 + (特攻 − 60) × 0.22，夹 10..36；特攻越高，一次吐出的低语越多（也是画面里的数量）。
 *   tempo         10 − (速度 − 60) × 0.04 刻，夹 5..14；速度越快越早开口。
 *   recharge      140 + (等级 − 30) × 0.6 刻，夹 110..200；等级越高越熟练。
 */
namespace PokemonSkills {
    export const confideId = "confide";
    export const confideEffect = "world_combat:confided_whisper";
    export const confideScene = "world_combat:move_confide";
    export const confideSpot = "world_combat:status/confided";

    actionParameters.define(confideId, {
        whisperRange: formula(F.body("height").times(1.1).plus(3.6).clamp(5, 9).round(1), "密语距离", {
            unit: " 格",
            description: "声音能送到对方耳边的距离；施法者身形越高，话传得越远。"
        }),
        drop: formula(F.base(1), "特攻下降", {
            unit: " 级",
            description: "被密语者损失的特攻等级；密语只拿掉一点集中力，下降会随失神窗口一起收回。"
        }),
        focusTicks: seconds(
            F.base(120).plus(F.individual("friendship").times(1.0)).clamp(70, 300).round(0),
            "失神时长", "秘密让对方分心多久；施法者越亲近，越能把这份分心留住，窗口结束后特攻精确复原。"),
        whispers: formula(F.base(14).plus(F.stat("specialAttack").minus(60).times(0.22)).clamp(10, 36).round(0), "低语数量", {
            unit: " 个",
            description: "一次送出的低语数量；特攻越高越多，画面里的低语也按它画出。"
        }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(5, 14),
            "起手", "开口需要多久；速度越快越早开口。"),
        recharge: seconds(
            F.base(140).plus(F.level().minus(30).max(0).times(0.6)).clamp(110, 200),
            "冷却", "两次密语之间的等待；等级越高越熟练。")
    });
    describe(confideId, [
        { key: "description.0", values: ["drop", "focusTicks"] },
        { key: "description.1", values: ["whisperRange"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
