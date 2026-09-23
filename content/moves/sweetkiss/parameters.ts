/**
 * 天使之吻 / sweetkiss 的参数与数值来源。
 *
 * 原生事实：Fairy、Status、威力 —、命中 75、PP 10、目标 normal（单体）／volatile confusion。
 * 世界化：这不是隔空一吻，而是**必须贴到对方脸上**的一次接触：先凑近，再送上一口。它命中即挂
 * 共享身份 world_combat:status/confusion 的真实 MobEffect，之后的失手与反噬与家族一致。
 * 「亲密度」在这里成了分量：越亲近的个体，这一吻越真，对方晕得越久——技能之外的培养被带进了战斗。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   kissReach   2.4 + 实时碰撞箱宽度 × 0.8 格，夹 2.6..4.0；嘴够得到多近，体型越大越远。
 *   mistTicks   150 刻 + 亲密度 × 0.6 + 特攻 × 0.3，夹 90..420；共享混乱的持续时间，亲密度是主要来源。
 *   tempo       14 - 速度 × 0.04 秒，夹 6..24；凑近并送出这一吻的时间。
 *   aftercast   8 - 速度 × 0.01 秒，夹 4..14；收势。
 *   recharge    80 - 速度 × 0.1 秒，夹 40..140；再次献吻前的等待。
 *   hearts      8 + 亲密度 × 0.08，夹 6..36；画面心数，也随亲密度变化。
 * 配置 kiss 双向取舍：轻吻起手快、冷却短，但混乱 ×0.8；深吻起手 +6 刻、收招 +4 刻、冷却 ×1.15，
 * 换来混乱 ×1.3 与 +1 强度。
 */
namespace PokemonSkills {
    export const sweetkissId = "sweetkiss";
    export const sweetkissEffect = "world_combat:sweetkiss_blush";
    export const sweetkissScene = "world_combat:move_sweetkiss";
    export const sweetkissSpot = "world_combat:status/confusion";
    export const sweetkissBaseChance = 0.3;
    export const sweetkissRecoilFraction = 0.055;

    actionParameters.define(sweetkissId, {
        kissReach: formula(F.const(2.4).plus(F.body("width").times(0.8)).clamp(2.6, 4.0), "亲吻距离", {
            unit: " 格",
            description: "必须凑到多近才能亲到；体型越大嘴伸得越远。"
        }),
        mistTicks: seconds(F.const(150).plus(F.individual("friendship").times(0.6)).plus(F.stat("specialAttack").times(0.3)).clamp(90, 420),
            "混乱时长", "共享混乱身份的持续时间；亲密度越高，这一吻越真、晕得越久。"),
        tempo: seconds(F.const(14).minus(F.stat("speed").times(0.04)).clamp(6, 24), "起手",
            "凑近并送出这一吻需要多久；速度越快越短。"),
        aftercast: seconds(F.const(8).minus(F.stat("speed").times(0.01)).clamp(4, 14), "收招",
            "送完这一吻后的收势。"),
        recharge: seconds(F.const(80).minus(F.stat("speed").times(0.1)).clamp(40, 140), "冷却",
            "两次献吻之间的等待。"),
        hearts: formula(F.const(8).plus(F.individual("friendship").times(0.08)).clamp(6, 36).round(0), "心数", {
            unit: " 个",
            description: "落在目标身上的心形数量；亲密度越高，画面越满。"
        })
    });
    describe(sweetkissId, [
        { key: "description.0", values: ["kissReach", "range"] },
        { key: "description.1", values: ["mistTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] }
    ]);
}
