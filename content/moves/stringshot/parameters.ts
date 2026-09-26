/**
 * 吐丝 / String Shot 的参数与数值来源。
 *
 * 原生：Bug／Status／威力 —／命中 95／PP 40／目标 allAdjacentFoes／boosts={spe:-2}（大幅降低速度）。
 * 世界化：从口中朝任意方向射出一缕会飞的丝（`kind: "aim"`）。它有飞行时间、命中判定与轨迹，所以对手能用掩体和走位躲开。
 *   命中活体就把对方缠住：挂共享身份 world_combat:status/silked 的 MobEffect，大幅下降速度，
 *   短时间定住脚步；没缠住就黏在它真实撞上的那个方块表面，在首碰那一格的外侧铺一小片原生蛛网
 *   （真实方块，走过去会被黏住，受原生保护与占用限制，放不下只留装饰丝，不在远端目标点凭空铺网）。
 * 「缠足」认准一个目标、缠得深还带定身；「结网」把同一根丝打成稍大一点的小网、射程更远，
 *   但不再定身、起手与冷却更长。世界里留下的丝网按租借存在，到期把原方块还回来。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   speedDrop    基础 2 级，体重 ≥ 300 的重型个体升到 3 级；吐出的丝越粗，黏得越狠。
 *   bindTicks    120 + 体重 ÷ 10 × 2 刻，夹 120..260；体重越大缠得越久。
 *   rootTicks    12 + (等级 − 20) × 0.2 刻，夹 12..30；经验越足，缠住的那一下越牢。
 *   strandSpeed  1.0 + 速度偏离 60 的部分 × 0.004 格/刻，夹 0.9..1.6；出手越快，丝飞得越急。
 *   strandRadius 0.28 + 身高偏离 1.4 的部分 × 0.08 格，夹 0.2..0.5；身量越大判定越宽。
 *   netRadius    1.6 + 宽度偏离 0.9 的部分 × 1.2 格，夹 1.4..3.0；体型越宽，铺开的网越大。
 *   netTicks     120 + (等级 − 30) × 2 刻，夹 100..260；等级越高，丝网留得越久。
 *   reach        5 + 速度偏离 60 的部分 × 0.02 格，夹 5..8；吐丝越快够得越远；结网再加 3 格。
 *   tempo        速度 ÷ 9 + 4 刻，夹 6..13；速度越快，起手越短。
 */
namespace PokemonSkills {
    export const stringshotId = "stringshot";
    export const stringshotEffect = "world_combat:string_bound";
    export const stringshotScene = "world_combat:move_stringshot";
    export const stringshotSpot = "world_combat:status/silked";

    actionParameters.define(stringshotId, {
        speedDrop: formula(F.base(2).plus(F.when(F.body("weight").gte(300), F.const(1), F.const(0))).clamp(2, 3), "速度下降", {
            unit: " 级",
            description: "被丝缠住者损失的速度等级；体重 300 以上的个体吐出更粗的丝，从 2 级升到 3 级。"
        }),
        bindTicks: seconds(F.base(120).plus(F.body("weight").div(10).times(2)).clamp(120, 260), "缠足时长",
            "黏腻的丝缠在腿上多久；施法者体重越大缠得越久。"),
        rootTicks: seconds(F.base(12).plus(F.level().minus(20).max(0).times(0.2)).clamp(12, 30), "定身时长",
            "缠足命中的那一下把目标钉在原地多久；等级越高越牢。"),
        strandSpeed: formula(F.base(1.0).plus(F.stat("speed").minus(60).max(0).times(0.004)).clamp(0.9, 1.6), "吐丝速度", {
            unit: " 格/刻",
            description: "丝飞出去的速度；施法者速度越快，越难被走位躲开。"
        }),
        strandRadius: formula(F.base(0.28).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.2, 0.5), "判定半径", {
            unit: " 格",
            description: "丝的横向判定半径；身量越高判定越宽。"
        }),
        netRadius: formula(F.base(1.6).plus(F.body("width").minus(0.9).times(1.2)).clamp(1.4, 3.0), "结网半径", {
            unit: " 格",
            description: "结网时黏在首碰表面那块小蛛网的最大铺开半径；体型越宽铺得越大。"
        }),
        netTicks: seconds(F.base(120).plus(F.level().minus(30).max(0).times(2)).clamp(100, 260), "结网时长",
            "黏在表面的蛛网存在多久；等级越高留得越久。"),
        reach: formula(F.base(5).plus(F.stat("speed").minus(60).max(0).times(0.02)).clamp(5, 8), "吐丝距离", {
            unit: " 格",
            description: "丝能打到的最远点；速度越快够得越远。"
        }),
        tempo: seconds(F.stat("speed").div(9).plus(4).clamp(6, 13), "起手",
            "把丝蓄到口边需要多久；速度越快越早吐出。")
    });
    describe(stringshotId, [
        { key: "description.0", values: ["speedDrop","bindTicks","rootTicks"] },
        { key: "description.1", values: ["netRadius","netTicks"] },
        { key: "description.2", values: ["strandSpeed","strandRadius","reach","range","tempo"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
