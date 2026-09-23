/**
 * 折弯汤匙 / Kinesis 的参数与数值来源。
 *
 * 原生：Psychic／Status／威力 —／命中 80／PP 15／目标 normal（单体）／boosts={accuracy:-1}。
 * 世界化：不隔空扣等级，而是**当场把一把汤匙掰弯，引开对面的视线**。汤匙只弯给一个看得见它的目标看，
 *   所以这招只作用于单个对手，却是全族射程最远的：靠的是「你看得见我」而不是弹道。代价是必须通视——
 *   躲到墙后、柱子后，或者干脆走出视线范围，这场戏就白演了。这也是全族唯一会明确「落空」的一招。
 *   被引开注意的人先挂共享身份 world_combat:status/beguiled 的真实 MobEffect（攻击变弱），宝可梦那一层
 *   再调用 NativeEffects.boost 下降原生命中等级；「慢掰／快掰」在深度与出手速度之间取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   blindStage  特攻每 75 点升一级，基础 1 级，夹 1..2；心力越强，越能把视线拽住。
 *   gazeRange   4 + 身高 × 2 格，夹 5..9；身量越高，越远也能把汤匙递到对方眼里。
 *   duration    120 + (等级 − 30) × 2.5 刻，夹 120..300；经验越足，失神留得越久。
 *   spoonTicks  14 + (特攻 − 60) × 0.03 刻，夹 14..26；那把汤匙在手里转多久，心力越强越从容。
 *   swirl       12 + 特攻 ÷ 8，夹 12..30；画面里绕着对方头顶转的念力点数，随特攻变多。
 *   tempo       速度 ÷ 8 + 4 刻，夹 5..12；速度越快越早把汤匙举起来。
 *   recharge    140 + (等级 − 30) × 1.5 刻，夹 140..240；等级越高越熟练。
 */
namespace PokemonSkills {
    export const kinesisId = "kinesis";
    export const kinesisEffect = "world_combat:kinesis_beguiled";
    export const kinesisScene = "world_combat:move_kinesis";
    export const kinesisSpot = "world_combat:status/beguiled";

    actionParameters.define(kinesisId, {
        blindStage: formula(F.stat("specialAttack").minus(60).max(0).div(75).plus(1).clamp(1, 2).round(0), "失神级数", {
            unit: " 级",
            description: "目标在宝可梦那一层损失的原生命中等级；特攻每 75 点升一级，最多两级。"
        }),
        gazeRange: formula(F.body("height").times(2).plus(4).clamp(5, 9).round(1), "凝注距离", {
            unit: " 格",
            description: "汤匙能被对方看清的最远距离；施法者身量越高，递得越远。这也是全族最远的射程。"
        }),
        duration: seconds(F.base(120).plus(F.level().minus(30).max(0).times(2.5)).clamp(120, 300).round(0), "失神时长",
            "被引开注意的人多久缓不过来；等级越高留得越久。"),
        spoonTicks: seconds(F.base(14).plus(F.stat("specialAttack").minus(60).max(0).times(0.03)).clamp(14, 26).round(0), "举匙时长",
            "那把汤匙在手里转多久；心力越强越从容，画面也更长。"),
        swirl: formula(F.base(12).plus(F.stat("specialAttack").div(8)).clamp(12, 30).round(0), "念力点数", {
            unit: " 点",
            description: "绕在对方头顶的念力点数；特攻越高，画面里转得越多。"
        }),
        tempo: seconds(F.stat("speed").div(8).plus(4).clamp(5, 12).round(0), "起手",
            "把汤匙举起来需要多久；速度越快越早。"),
        recharge: seconds(F.base(140).plus(F.level().minus(30).max(0).times(1.5)).clamp(140, 240).round(0), "冷却",
            "两次折弯之间的等待；等级越高越熟练。")
    });
    describe(kinesisId, [
        { key: "description.0", values: ["blindStage","duration"] },
        { key: "description.1", values: ["gazeRange"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "description.bend", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
