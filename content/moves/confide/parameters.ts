/**
 * 密语 / Confide 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 —（必定命中）／PP 20／目标 normal（单体）／boosts={spa:-1}（降低特攻）／
 *       flags 含 sound、bypasssub、reflectable（声音类，能绕过替身与掩体）。
 * 世界化：不是隔空扣等级，而是**凑到耳边说一个秘密**——一句话沿直线钻进对方脑子里，让它失去集中力。
 *   这句话是声音，所以不需要通视：躲在墙后也会被听见，这是它和「凝视」类招式最大的区别；代价是降得少、
 *   只认听得见的距离，而且必须先开口（起手）才能送到。命中后挂共享身份 world_combat:status/confided 的
 *   真实 MobEffect，再调用 NativeEffects.boost 下降特攻：宝可梦损失原生特攻等级，其他生物落到攻击属性。
 * 「传谣」把同一个秘密变成闲话：目标身边的人也一起分心，但每处都更浅、起手与冷却更长，必须有人在场才值得。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   whisperRange  身高 × 1.1 + 3.6 格，夹 5..9；身量越高，声音送得越远。
 *   drop          基础 1 级，特攻 ≥ 100 升到 2 级；心神越强，夺走对手的特攻越多。
 *   focusTicks    120 + 亲密度 × 1.0，悄悄话 ×1.15／传谣 ×0.55，夹 70..300；越亲近越能把这份分心留住。
 *   rumorRadius   宽度 × 1.5 + 1.2 格，夹 1.5..3.2；体型越宽，闲话铺得越开。
 *   maxListeners  2 + (等级 − 30) ÷ 20，夹 2..4 人；经验越足越能一次说给更多人听。
 *   whispers      14 + (特攻 − 60) × 0.22，夹 10..36；特攻越高，一次吐出的低语越多（也是画面里的数量）。
 *   tempo         10 − (速度 − 60) × 0.04 刻，悄悄话 ×0.9／传谣 ×1.25，夹 5..14；速度越快越早开口。
 *   recharge      140 + (等级 − 30) × 0.6 刻，悄悄话 ×0.9／传谣 ×1.25，夹 110..200；等级越高越熟练。
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
        drop: formula(F.base(1).plus(F.when(F.stat("specialAttack").gte(100), F.const(1), F.const(0))).clamp(1, 2), "特攻下降", {
            unit: " 级",
            description: "被密语者损失的特攻等级；施法者特攻达到 100 时从 1 级升到 2 级。"
        }),
        focusTicks: seconds(
            F.base(120).plus(F.individual("friendship").times(1.0))
                .times(F.when(F.pref("rumor", text("worldcombat.skill.confide.preference.rumor")), F.const(0.55), F.const(1.15)))
                .clamp(70, 300).round(0),
            "失神时长", "秘密让对方分心多久；施法者越亲近，越能把这份分心留住，传谣时每一处都更浅。"),
        rumorRadius: formula(F.body("width").times(1.5).plus(1.2).clamp(1.5, 3.2).round(2), "闲话半径", {
            unit: " 格",
            description: "传谣时闲话从目标扩散到的范围；体型越宽传得越开。"
        }),
        maxListeners: formula(F.base(2).plus(F.level().minus(30).max(0).div(20)).clamp(2, 4).round(0), "听众上限", {
            unit: " 人",
            description: "传谣时最多再拉进来几个人一起失神；等级越高越多。"
        }),
        whispers: formula(F.base(14).plus(F.stat("specialAttack").minus(60).times(0.22)).clamp(10, 36).round(0), "低语数量", {
            unit: " 个",
            description: "一次送出的低语数量；特攻越高越多，画面里的低语也按它画出。"
        }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).max(0).times(0.04))
                .times(F.when(F.pref("rumor", text("worldcombat.skill.confide.preference.rumor")), F.const(1.25), F.const(0.9)))
                .clamp(5, 14),
            "起手", "开口需要多久；速度越快越早，小声密语比当众放话更快。"),
        recharge: seconds(
            F.base(140).plus(F.level().minus(30).max(0).times(0.6))
                .times(F.when(F.pref("rumor", text("worldcombat.skill.confide.preference.rumor")), F.const(1.25), F.const(0.9)))
                .clamp(110, 200),
            "冷却", "两次密语之间的等待；等级越高越熟练。")
    });
    describe(confideId, [
        { key: "description.0", values: ["drop","focusTicks"] },
        { key: "description.1", values: ["whisperRange","rumorRadius","maxListeners"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
