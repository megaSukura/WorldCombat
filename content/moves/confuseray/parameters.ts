/**
 * 奇异之光 / confuseray 的参数与数值来源。
 *
 * 原生事实：Ghost、Status、威力 —、命中 100、PP 10、目标 normal（单体）／volatile confusion。
 * 世界化：朝任意方向或世界点放出一束幽光，划过一段距离后落在第一个碰到的东西上；命中活体即挂共享身份
 * world_combat:status/confusion 的真实 MobEffect。它不是隔空的「必定混乱」，而是一件看得见、
 * 可以躲到掩体后的事：光束是一条直线，被墙或任意身体截断就停在那里，空放也照常。混乱期间目标每次想出手
 * 都可能被打散、打中时还会被自己的力气反噬（行为写在本单元 skill.ts，与家族共享）。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   beamReach   20 + 特攻 × 0.05 格，夹 8..30；特攻越高，这束光射得越远。
 *   beamRadius  0.5 + 实时碰撞箱宽度 × 0.4 格，夹 0.4..1.1；体型越大越难错过。
 *   tempo       16 - 速度 × 0.06 秒，夹 6..24；出手越快，汇聚幽光越短。
 *   aftercast   6 - 速度 × 0.01 秒，夹 3..10；放完余势。
 *   recharge    70 - 速度 × 0.12 秒，夹 30..120；再次放出前的等待。
 *   mistTicks   180 刻基础，40／55 级台阶延长到 240／300；共享混乱的持续时间。
 *   motes       10 + 特攻 × 0.12，夹 8..48；命中时炸开的幽光数量，也驱动粒子。
 * 配置 beam 双向取舍：广照更远；凝神射程更近、起手更慢、冷却更长，混乱持续时间 ×1.35。
 */
namespace PokemonSkills {
    export const confuserayId = "confuseray";
    export const confuserayEffect = "world_combat:confuseray_mist";
    export const confuserayScene = "world_combat:move_confuseray";
    export const confuseraySpot = "world_combat:status/confusion";
    /** 命中后每次出手失败的基础概率；载体振幅按百分数写入，30 对应30%。 */
    export const confuserayBaseChance = 0.3;
    /** 反噬基数（最大生命比例）；被光晃晕的目标打中别人时按攻击放大。 */
    export const confuserayRecoilFraction = 0.055;
    /**
     * 反噬预算系数：自伤同时受这次实际攻击回执（damage_applied 的 actual）约束。
     * 高最大生命的 Boss 不会被按血条白削——它挥出的这一下有多重，反噬最多就还多痛。
     */
    export const confuserayRecoilBudget = 1;

    actionParameters.define(confuserayId, {
        beamReach: formula(F.const(20).plus(F.stat("specialAttack").times(0.05)).clamp(8, 30), "射程", {
            unit: " 格",
            description: "幽光能射到多远；特攻越高越远。"
        }),
        beamRadius: formula(F.const(0.5).plus(F.body("width").times(0.4)).clamp(0.4, 1.1), "判定半径", {
            unit: " 格",
            description: "光束的判定粗细；体型越大越难躲开。"
        }),
        tempo: seconds(F.const(16).minus(F.stat("speed").times(0.06)).clamp(6, 24), "起手",
            "汇聚这束幽光需要多久；速度越快越短。"),
        aftercast: seconds(F.const(6).minus(F.stat("speed").times(0.01)).clamp(3, 10), "收招",
            "放出光束后的收势。"),
        recharge: seconds(F.const(70).minus(F.stat("speed").times(0.12)).clamp(30, 120), "冷却",
            "两次放出幽光之间的等待。"),
        mistTicks: seconds(F.base(180).as("基础"), "混乱时长",
            "共享混乱身份的持续时间；等级台阶会延长。"),
        motes: formula(F.const(10).plus(F.stat("specialAttack").times(0.12)).clamp(8, 48).round(0), "光点数", {
            unit: " 个",
            description: "命中时炸开的幽光数量；随特攻增长，也决定画面的密度。"
        })
    });
    stages(confuserayId, [
        { level: 40, values: { mistTicks: 240 } },
        { level: 55, values: { mistTicks: 300 } }
    ]);
    // Apply the stance after level growth so Focus lengthens the complete duration at every level.
    actionParameters.rules.modify(confuserayId + "/mistTicks", "confuseray:focus-duration", "×",
        F.when(F.choice("beam", "focus"), F.const(1.35), F.const(1)).as(text("worldcombat.skill.confuseray.preference.beam")));
    describe(confuserayId, [
        { key: "description.0", values: ["mistTicks"] },
        { key: "description.1", values: ["beamReach","beamRadius","range"] },
        { key: "description.2", values: ["prepare","recover","cooldown"] }
    ]);
}
