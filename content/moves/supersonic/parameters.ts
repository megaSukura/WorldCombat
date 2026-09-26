/**
 * 超音波 / supersonic 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 55、PP 20、目标 normal（单体）／volatile confusion／sound。
 * 世界化：这不是一次低命中率的隔空点名，而是一圈从身体向外推开的环形声浪——它扫过脚下一整片圆面，
 * 站在波前上的敌人被震得发懵；它不以某个目标为轴，因此对手的余地是「跑出波前」，而不是躲开一条射线。
 * 命中即挂共享身份 world_combat:status/confusion 的真实 MobEffect，之后的失手与反噬与家族一致。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   waveReach    6 + 体重 × 0.02 + 等级 × 0.04 + 特攻 × 0.01 格，夹 4..14；身体越沉、声源越强、声浪越远。
 *   waveSpeed    0.45 + 速度 × 0.004 格/刻，夹 0.3..0.9；速度越快，波前推得越快，越难被跑开。
 *   mistTicks    120 刻 + 等级 × 3 + 特攻 × 0.3，夹 80..360；共享混乱的持续时间。
 *   tempo        10 - 速度 × 0.03 秒，夹 4..16；声浪从体内推出所需的时间。
 *   aftercast    8 - 速度 × 0.01 秒，夹 4..12；收声。
 *   recharge     90 - 速度 × 0.12 秒，夹 40..140；再次发声前的等待。
 *   waveMotes    14 + 特攻 × 0.12，夹 10..56；波面上的细响数量，也驱动粒子。
 * 配置 band 双向取舍：广域把波前 ×1.3、混乱 ×0.8，覆盖更广但每一下更浅；集中把波前 ×0.7、混乱 ×1.3、
 * 混乱强度 +1，冷却 ×1.1，范围小却震得更狠。
 */
namespace PokemonSkills {
    export const supersonicId = "supersonic";
    export const supersonicEffect = "world_combat:supersonic_ring";
    export const supersonicScene = "world_combat:move_supersonic";
    export const supersonicSpot = "world_combat:status/confusion";
    export const supersonicBaseChance = 0.3;
    export const supersonicRecoilFraction = 0.055;
    /**
     * 反噬预算系数：自伤同时受这次实际攻击回执（damage_applied 的 actual）约束。
     * 高最大生命的 Boss 不会被按血条白削——它挥出的这一下有多重，反噬最多就还多痛。
     */
    export const supersonicRecoilBudget = 1;
    /** 波面画面上的一圈基准半径（格）；服务端传 scale = 真实半径 / 这个值。 */
    export const supersonicRingReference = 6;

    actionParameters.define(supersonicId, {
        waveReach: formula(
            F.const(6).plus(F.body("weight").times(0.02)).plus(F.level().times(0.04)).plus(F.stat("specialAttack").times(0.01)).clamp(4, 14),
            "波前半径", { unit: " 格", description: "声浪从身上往外推到多远；身体越沉、声源越强，推得越远。" }),
        waveSpeed: formula(F.const(0.45).plus(F.stat("speed").times(0.004)).clamp(0.3, 0.9), "波速", {
            unit: " 格/刻", description: "波前每刻推进的距离；速度越快，越难被跑开。" }),
        mistTicks: seconds(F.const(120).plus(F.level().times(3)).plus(F.stat("specialAttack").times(0.3)).clamp(80, 360),
            "混乱时长", "共享混乱身份的持续时间。"),
        tempo: seconds(F.const(10).minus(F.stat("speed").times(0.03)).clamp(4, 16), "起手",
            "从体内把声浪推出来需要多久；速度越快越短。"),
        aftercast: seconds(F.const(8).minus(F.stat("speed").times(0.01)).clamp(4, 12), "收招",
            "发完这一声后的收势。"),
        recharge: seconds(F.const(90).minus(F.stat("speed").times(0.12)).clamp(40, 140), "冷却",
            "两次发声之间的等待。"),
        waveMotes: formula(F.const(14).plus(F.stat("specialAttack").times(0.12)).clamp(10, 56).round(0), "波纹数", {
            unit: " 个", description: "波面上的细响数量；随特攻增长，也决定画面的密度。" })
    });
    describe(supersonicId, [
        { key: "description.0", values: ["waveReach","waveSpeed"] },
        { key: "description.1", values: ["mistTicks"] },
        { key: "description.settle", values: [] },
        { key: "description.2", values: ["tempo","aftercast","recharge"] }
    ]);
}
