/**
 * 纹理２ / conversion2 —— 参数与机制数值来源。
 *
 * 核心念头：纹理２是防御性的读解——它读对手最后那一招的属性，把自己重织成能扛住它的那一种。
 * 与同族的「纹理」相反：纹理读的是自己招式表里的第一招，讲“把身体重织成我能用的属性”；纹理２读的是
 * 对手刚出手的那一招，讲“把身体重织成能扛住它的属性”，是一次被动应招。
 *
 * 原生事实：Normal／变化／威力 0／必中／PP 30／单体；`onHit` 取 `target.lastMoveUsed.type`，在所有不为自己
 * 已有的属性里挑能抵抗（0.5×／0.25×）的那种，随机取一个。即时化把随机选改成按取舍决定：
 *   优先“最硬”＝对那一招乘数最低的那种；优先“顾全”＝在能抵抗的属性里挑整体受击乘数之和最低（更少弱点）的那种。
 * 无最后招式或没有可换的抗性属性时失败，不花 PP（预检）。
 *
 * 每个参数依赖不同的精灵数据（分散到不同参数）：
 *   reach      读取距离：体型（碰撞箱高度）决定能隔着多远看清对手的上一手。
 *   hold       纹理维持：等级与特防支撑重织的稳定。
 *   charge     起手：速度决定看懂并重织得多快。
 *   afterglow  收势：等级决定重织后的平复。
 *   recharge   冷却：速度快的个体更快重新编织。
 *   facets     纹面数量：特攻决定表现里翻转的纹面条数。
 */
namespace PokemonSkills {
    actionParameters.define("conversion2", {
        reach: formula(
            F.base(9).plus(F.body("height").minus(1.4).times(0.7)).clamp(7, 14).round(1),
            "读取距离", {
                unit: "格",
                description: "能隔着多远看清对手的上一手；个头越高看得越远。它也是本招的实际射程来源。"
            }),
        hold: seconds(
            F.base(200).plus(F.level().times(4)).plus(F.stat("specialDefence").div(3)).clamp(160, 1200).round(0),
            "纹理维持", "重织后的属性维持多久；等级与特防越高越稳。"),
        charge: seconds(
            F.base(9).minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 6)).clamp(4, 12).round(0),
            "起手", "读解并重织的时间；速度越快抬得越快。"),
        afterglow: seconds(
            F.base(8).plus(F.level().minus(30).times(0.15).clamp(0, 5)).clamp(6, 14).round(0),
            "收势", "重织完成后的收势。"),
        recharge: seconds(
            F.base(80).minus(F.stat("speed").times(0.35)).clamp(40, 140).round(0),
            "冷却", "重新编织需要多久；速度快的个体更快恢复。"),
        facets: formula(
            F.base(6).plus(F.stat("specialAttack").div(55)).clamp(6, 18).round(0),
            "纹面数量", {
                unit: "条",
                description: "重织时画面里翻转的纹面条数；特攻越高越密。"
            })
    });

    stages("conversion2", [
        { level: 40, values: { hold: 320, reach: 11 } }
    ]);

    describe("conversion2", [
        { key: "world", values: ["hold"] },
        { key: "description.0", values: ["reach", "charge"] },
        { key: "description.1", values: ["hold", "pref.wide"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hold", "tier.0.reach"] }
    ]);
}
