/**
 * 换档 / shiftgear 的参数与数值来源。
 *
 * 原生事实：Steel、Status、威力 —、命中 —、PP 10、目标 self／boosts={atk:+1, spe:+2}。
 * 世界化：把自己当成一台机器换挡。齿轮环在身侧转到锁定，攻击与速度一起升上去——起步要时间，换完你就是另一台机器。
 * 攻速两项都走 NativeEffects.boost 一条路径：宝可梦改原生等级，其他战斗者落到攻击与移速属性。
 * 数值只依赖自己：速度决定起手多快把齿轮带起来、残影窗口多长；体型决定齿轮环半径与收招。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   attackGift 扭力档 2／超速档 1，等级 50 起 +1；夹 1..3 级。档位在攻速之间分配，总量都是 +3 级。
 *   speedGift  超速档 2／扭力档 1；夹 1..3 级。
 *   telegraph  速度每比 60 快 1 少 0.05 刻；夹 6..18 刻。天生快的个体更早换好挡。
 *   overrun    残影与「挡位在线」的窗口：速度每比 60 快 1 加 0.4 刻；夹 24..72 刻（纯表现，不改数值）。
 *   aftermath  收招：基础 6 刻，碰撞箱高度每 1 格 +2；夹 6..14 刻。身板越大越慢。
 *   wait       冷却：基础 120 刻，等级 52 起降到 100。PP 10 的代价。
 * 配置 gear（扭力档／超速档）总档位都是 +3 级，只在攻速之间让渡，没有净收益更大的一侧。
 */
namespace PokemonSkills {
    actionParameters.define("shiftgear", {
        /** 攻击档：扭力 2／超速 1，等级 50 起 +1，夹 1..3。 */
        attackGift: formula(
            F.when(F.pref("gear", text("worldcombat.skill.shiftgear.preference.gear")), F.const(1), F.base(2))
                .plus(F.when(F.level().gte(50), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "攻击档", {
                unit: " 级",
                description: "换挡提升的攻击等级；扭力档给得更多。"
            }),
        /** 速度档：超速 2／扭力 1，夹 1..3。 */
        speedGift: formula(
            F.when(F.pref("gear", text("worldcombat.skill.shiftgear.preference.gear")), F.base(2), F.const(1)).clamp(1, 3).round(0),
            "速度档", {
                unit: " 级",
                description: "换挡提升的速度等级；超速档给得更多，追得上人、出得了手。"
            }),
        /** 齿轮环半径：基础 1.1 格，碰撞箱高度 ×0.35，夹 0.9..2.2。 */
        orbit: formula(
            F.base(1.1).plus(F.body("height").times(0.35)).clamp(0.9, 2.2).round(2),
            "齿轮环半径", {
                unit: " 格",
                description: "绕身齿轮环的半径；身板越大转得越开。判定与表现读同一个半径。"
            }),
        /** 运转窗口：基础 30 刻，速度每比 60 快 1 加 0.4，夹 24..72。 */
        overrun: seconds(
            F.base(30).plus(F.stat("speed").minus(60).max(0).times(0.4)).clamp(24, 72).round(0),
            "运转窗口", "换挡后齿轮环继续绕身、速度线拖尾的时长；纯表现窗口，不改数值。"),
        /** 起手：速度每比 60 快 1 少 0.05 刻，夹 6..18。 */
        telegraph: seconds(
            F.base(12).minus(F.stat("speed").minus(60).max(0).times(0.05)).clamp(6, 18).round(0),
            "起手", "把齿轮环带起来、换好挡需要多久；天生快的个体更早完成。"),
        /** 收招：基础 6 刻，碰撞箱高度每 1 格 +2，夹 6..14。 */
        aftermath: seconds(
            F.base(6).plus(F.body("height").times(2)).clamp(6, 14).round(0),
            "收招", "换挡后的收势；身板越高大越慢。"),
        /** 冷却：基础 120 刻，等级 52 起降到 100。 */
        wait: seconds(
            F.base(120).minus(F.when(F.level().gte(52), F.const(20), F.const(0))).clamp(100, 120).round(0),
            "冷却", "换一次挡要等多久；PP 10 的代价。")
    });

    describe("shiftgear", [
        { key: "description.0", values: ["attackGift", "speedGift"] },
        { key: "description.2", values: ["telegraph", "aftermath", "wait"] }
    ]);
}
