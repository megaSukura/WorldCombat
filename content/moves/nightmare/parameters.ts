/**
 * 恶梦 / Nightmare —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Ghost／变化／威力 0／命中 100／PP 15／单体；挂上挥发状态 `nightmare`，
 *   **只对已经睡着的目标成立**（onStart 检查 pokemon.status === "slp"），此后每回合扣掉最大生命的四分之一。
 *
 * 世界化：把「让睡着的对手做恶梦」翻成一记**睡后延迟收割**——对着已入睡的目标压下几层黑影、倒数一段时间，
 *   倒数走完时若它**仍是同一场睡眠**且施术者还在射程内，就从它身上抽走一口最大生命（固定比例，不看防御）。
 *   这一抽的疼痛会把人从睡眠里弄醒，恶梦随醒来散去；它**不再把人按在睡眠里**，也不再补跳或衰减。
 *   提前被打醒、被牛奶／清状态驱散、睡者重新入睡、或收割时已脱离射程，恶梦都会立即消散，重新睡不继承旧倒数。
 *
 * 与同族分开：其余三招都在设法让对方睡着；只有恶梦**只对睡着的人生效**，是睡眠链的收割端，且伤害不吃
 *   防御与相性——它读的是目标的睡眠状态与双方的特攻／特防。与诅咒相比：诅咒支付自身生命写下真正持续的债，
 *   恶梦消耗一段已经成立的睡眠机会，一次结清。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   reach      施咒距离 8 + 等级偏移 + 特攻偏移；夹 5..14。
 *   countdown  倒数时长 30 − 速度偏移[−3,3]；深梦 +15；夹 24..60。浅梦约 30 刻、深梦约 45 刻后收割。
 *   drain      收割比例 0.24 + 特攻偏移[−0.05,0.05] − 目标特防偏移[0,0.08]；深梦 ×1.15 / 浅梦 ×0.85；夹 0.12..0.30。
 *   shades     黑影层数 10 + 特攻偏移；夹 8..30（也是画面里倒数影与收割碎影的数量）。
 *   sealRadius 梦印半径 0.5 + 身高偏移；夹 0.32..0.9。
 *   tempo／aftercast／recharge 速度与等级决定起手、收招、冷却；深梦式起手 +2、冷却 +6。
 *
 * 配置 `deep`（深梦）双向取舍：开＝一次收割 ×1.15、但倒数更慢（+15 刻）、起手 +2、冷却 +6（更难被抢断的重收割）；
 *   关（浅梦）＝一次收割 ×0.85，但倒数更快（30 刻），趁睡眠窗口更早结清。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const nightmareId = "nightmare";
    export const nightmareScene = "world_combat:move_nightmare";
    export const nightmareEffect = "world_combat:nightmare";
    export const nightmareBind = "world_combat:nightmare_bind";

    actionParameters.define(nightmareId, {
        /** 施咒距离：8 + 等级(≥30)偏移[0,2.4] + 特攻偏移[−1,2]；夹 5..14。 */
        reach: formula(
            F.base(8)
                .plus(F.level().minus(30).times(0.08).clamp(0, 2.4))
                .plus(F.stat("specialAttack").minus(60).times(0.025).clamp(-1, 2))
                .clamp(5, 14).round(2),
            "施咒距离", {
                unit: " 格",
                description: "能从多远对睡者下咒、并在倒数走完时仍够到它；等级与特攻越高够得越远，且需要一条没有被挡住的视线。"
            }),
        /** 倒数时长：30 − 速度偏移[−3,3]；深梦 +15；夹 24..60。 */
        countdown: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.1).clamp(-3, 3))
                .plus(F.when(F.pref("deep"), F.const(15), F.const(0)))
                .clamp(24, 60).round(0),
            "倒数时长", "从下咒到收割之间黑影压低的时间；浅梦约 30 刻、深梦约 45 刻，出手越快压得越紧。它到点前若睡者被别的伤害弄醒，收割就取消。"),
        /** 收割比例：0.24 + 特攻偏移[−0.05,0.05] − 目标特防偏移[0,0.08]；深梦 ×1.15 / 浅梦 ×0.85；夹 0.12..0.30。 */
        drain: percent(
            F.base(0.24)
                .plus(F.stat("specialAttack").minus(60).times(0.0007).clamp(-0.05, 0.05))
                .minus(F.target("stat.specialDefence").minus(60).times(0.001).clamp(0, 0.08))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(0.85)))
                .clamp(0.12, 0.30),
            "收割比例", "倒数走完时一次性抽走目标最大生命的多少；特攻越高抽得越多，特防高的目标扛得住一些。它不吃防御与相性。"),
        /** 黑影层数：10 + 特攻偏移[0,20]；夹 8..30。 */
        shades: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.16).clamp(0, 20)).clamp(8, 30).round(0),
            "黑影层数", {
                unit: " 层",
                description: "梦里压下来的黑影数量；特攻越高越密，也是画面里倒数影与收割碎影的数量。"
            }),
        /** 梦印半径：0.5 + 身高偏移[−0.18,0.4]；夹 0.32..0.90。 */
        sealRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.18, 0.4)).clamp(0.32, 0.90).round(2),
            "梦印半径", {
                unit: " 格",
                description: "落在睡者身上那圈梦印的大小；个高的目标印得更宽。"
            }),
        /** 起手：12 − 速度偏移[−2,3] + 深梦 2；夹 7..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(0)))
                .clamp(7, 18).round(0),
            "起手", "把黑影压到睡者身上需要多久；速度越快越短。"),
        /** 收招：10 − 速度偏移[−2,2]；夹 6..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(6, 16).round(0),
            "收招", "下完咒收势的时间。"),
        /** 冷却：90 − 等级(≥30)偏移[0,16] + 深梦 6；夹 50..150。 */
        recharge: seconds(
            F.base(90).minus(F.level().minus(30).times(0.4).clamp(0, 16))
                .plus(F.when(F.pref("deep"), F.const(6), F.const(0)))
                .clamp(50, 150).round(0),
            "冷却", "两次恶梦之间的等待；等级越高回得越快，深梦式更费。")
    });

    stages(nightmareId, [
        { level: 35, values: { shades: 16 } },
        { level: 50, values: { shades: 22, drain: 0.28, reach: 11 } }
    ]);

    describe(nightmareId, [
        { key: "description.0", values: ["reach", "drain"] },
        { key: "description.1", values: ["countdown"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drain", "tier.1.reach"] }
    ]);
}
