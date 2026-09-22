/**
 * 毒丝 / Toxic Thread 的参数与数值来源。
 *
 * 原生：Poison／Status／威力 —／命中 100／PP 20／目标 normal（单体）／status=psn（中毒）／boosts={spe:-1}（降低速度）。
 * 世界化：吐出一缕带毒的丝，丝头扎进对手身上——一边把毒灌进去，一边猛地一抽把对手朝自己拽一段。
 *   媒介是会飞的丝，所以掩体与走位能躲开；命中后毒与减速各自落到共享载体上（中毒走共享默认效果，
 *   速度走 NativeEffects.boost），并挂共享身份 world_combat:status/laced 方便以后消费。
 * 「收丝」把目标沿丝线拽近一段；「钉住」改为把目标就地定在原地。两向都用这条丝的同一份力度，
 *   一个换来重新站位，一个换来距离控制。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   speedDrop    基础 1 级，体重 ≥ 200 的个体升到 2 级；吐出的丝越粗，缠得越慢。
 *   venomTicks   160 + (特攻 − 60) × 0.8 刻，夹 120..320；特攻越高，毒在体内留得越久。
 *   reel         2.0 + (物攻 − 50) × 0.02 格，夹 1.2..3.5；物攻越高，一抽的力气越大。
 *   anchorTicks  10 + (等级 − 20) × 0.4 刻，夹 10..26；等级越高，「钉住」钉得越牢。
 *   strandSpeed  1.1 + (速度 − 50) × 0.006 格/刻，夹 0.9..1.7；出手越快，丝飞得越急。
 *   strandRadius 0.28 + (身高 − 1.4) × 0.08 格，夹 0.2..0.5；身量越高，判定越宽。
 *   reach        4.5 + (速度 − 50) × 0.02 格，夹 4..7；吐得越快够得越远。
 *   threads      16 + (特攻 − 50) × 0.4 个，夹 12..44；特攻越高，一次吐出的丝股越多（画面里的数量）。
 *   tempo        速度 ÷ 9 + 4 刻，夹 6..13；速度越快，起手越短。
 *   recharge     100 + (等级 − 30) × 1.5 刻，夹 90..220；等级越高越熟练。
 */
namespace PokemonSkills {
    export const toxicthreadId = "toxicthread";
    export const toxicthreadEffect = "world_combat:toxic_thread_laced";
    export const toxicthreadScene = "world_combat:move_toxicthread";
    export const toxicthreadSpot = "world_combat:status/laced";

    actionParameters.define(toxicthreadId, {
        speedDrop: formula(
            F.base(1).plus(F.when(F.body("weight").gte(200), F.const(1), F.const(0))).clamp(1, 2),
            "速度下降", {
                unit: " 级",
                description: "被毒丝缠住者损失的速度等级；体重 200 以上的个体吐出更粗的丝，从 1 级升到 2 级。"
            }),
        venomTicks: seconds(
            F.base(160).plus(F.stat("specialAttack").minus(60).max(0).times(0.8)).clamp(120, 320),
            "中毒时长", "毒在目标体内留多久；施法者特攻越高留得越久。"),
        reel: formula(
            F.base(2.0).plus(F.stat("attack").minus(50).max(0).times(0.02)).clamp(1.2, 3.5).round(2),
            "收丝距离", {
                unit: " 格",
                description: "收丝时把目标朝自己拽近多远；施法者物攻越高拽得越猛。"
            }),
        anchorTicks: seconds(
            F.base(10).plus(F.level().minus(20).max(0).times(0.4)).clamp(10, 26),
            "钉住时长", "钉住取向把目标就地定住多久；等级越高钉得越牢。"),
        strandSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(50).max(0).times(0.006)).clamp(0.9, 1.7),
            "吐丝速度", {
                unit: " 格/刻",
                description: "毒丝飞出去的速度；施法者速度越快越难被走位躲开。"
            }),
        strandRadius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.2, 0.5),
            "判定半径", {
                unit: " 格",
                description: "毒丝的横向判定半径；身量越高判定越宽。"
            }),
        reach: formula(
            F.base(4.5).plus(F.stat("speed").minus(50).max(0).times(0.02)).clamp(4, 7),
            "吐丝距离", {
                unit: " 格",
                description: "毒丝能打到的最远点；速度越快够得越远。"
            }),
        threads: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).max(0).times(0.4)).clamp(12, 44).round(0),
            "丝股数", {
                unit: " 股",
                description: "一次吐出的丝股数量；特攻越高越多，画面里的丝也按它画出。"
            }),
        tempo: seconds(
            F.stat("speed").div(9).plus(4).clamp(6, 13),
            "起手", "把毒丝蓄到口边需要多久；速度越快越早吐出。"),
        recharge: seconds(
            F.base(100).plus(F.level().minus(30).max(0).times(1.5)).clamp(90, 220),
            "冷却", "两次吐丝之间的等待；等级越高越熟练。")
    });
    describe(toxicthreadId, [
        { key: "description.0", values: ["speedDrop", "venomTicks"] },
        { key: "description.1", values: ["reel", "anchorTicks", "threads"] },
        { key: "description.2", values: ["strandSpeed", "strandRadius", "reach", "range", "tempo"] },
        { key: "reel.on", values: [], when: function (context) { return read(context.detail.values, ["reel"]) === true; } },
        { key: "reel.off", values: [], when: function (context) { return read(context.detail.values, ["reel"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
