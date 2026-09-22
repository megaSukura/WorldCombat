/**
 * 鬼面 / Scary Face 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 10／目标 normal（单体）／boosts={spe:-2}（大幅降低速度）。
 * 世界化：把「瞪一眼」落成一条穿不透掩体、也不需要飞行物的视线——它在看得见的地方直取一个对手，
 *   代价是只能用一次、且要求视线通畅。命中后先挂共享身份 world_combat:status/feared 的真实 MobEffect，
 *   再用 NativeEffects.boost 大幅下降速度；恐惧在当场还表现为目标被吓得向后一缩、随即僵住片刻。
 * 反制：掩体挡下视线（blocked）、距离超出凝视、同性无关性别都能中。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop        基础 2 级，体重 ≥ 120 的个体升到 3 级；身板越沉，脸越吓人。
 *   gazeRange   身高 × 2 + 3 格，夹 4..9；身量越高，脸伸得越远。
 *   fearTicks   100 刻 + (等级 − 20) × 1.5，夹 100..320；越老练越会把恐惧留在对方心里。
 *   recoil      0.5 + (物攻 − 40) × 0.01 格，夹 0.3..1.4；气势越足，把对方逼退得越远。
 *   freeze      6 + (速度 − 40) × 0.12 刻，夹 6..20；出手越快，那一下僵住越久。
 *   tempo       速度 ÷ 8 + 4 刻，夹 6..14；速度越快越早转脸。
 *   recharge    140 + (等级 − 30) × 1.5 刻，夹 130..260；等级越高越熟练，冷却略短。
 */
namespace PokemonSkills {
    export const scaryfaceId = "scaryface";
    export const scaryfaceEffect = "world_combat:scary_face_terror";
    export const scaryfaceScene = "world_combat:move_scaryface";
    export const scaryfaceSpot = "world_combat:status/feared";

    actionParameters.define(scaryfaceId, {
        drop: formula(
            F.base(2).plus(F.when(F.body("weight").gte(120), F.const(1), F.const(0))).clamp(2, 3),
            "速度下降", {
                unit: " 级",
                description: "被吓住者损失的速度等级；体重 120 以上的个体从 2 级升到 3 级。"
            }),
        gazeRange: formula(
            F.body("height").times(2).plus(3).clamp(4, 9),
            "凝视距离", {
                unit: " 格",
                description: "目光能拉住对手的距离；施法者身形越高，脸伸得越远。"
            }),
        fearTicks: seconds(
            F.base(100).plus(F.level().minus(20).max(0).times(1.5)).clamp(100, 320),
            "恐惧时长", "被吓住的状态持续多久；等级越高，越能把恐惧留在对方心里。"),
        recoil: formula(
            F.base(0.5).plus(F.stat("attack").minus(40).max(0).times(0.01)).clamp(0.3, 1.4),
            "退缩距离", {
                unit: " 格",
                description: "命中那一刻把对手逼退多远；施法者物攻越高，气势越足。"
            }),
        freeze: seconds(
            F.base(6).plus(F.stat("speed").minus(40).max(0).times(0.12)).clamp(6, 20),
            "僵住时长", "被瞪中的一瞬间定在原地多久；施法者速度越快，那一下越突然。"),
        tempo: seconds(
            F.stat("speed").div(8).plus(4).clamp(6, 14),
            "起手", "把脸转过来正对目标需要多久；速度越快越早转脸。"),
        recharge: seconds(
            F.base(140).plus(F.level().minus(30).max(0).times(1.5)).clamp(130, 260),
            "冷却", "两次鬼面之间的等待；等级越高越熟练。")
    });
    describe(scaryfaceId, [
        { key: "description.0", values: ["drop", "fearTicks"] },
        { key: "description.1", values: ["gazeRange", "recoil", "freeze"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
