/**
 * 换档 / shiftgear 的参数与数值来源。
 *
 * 原生事实：Steel、Status、威力 —、命中 —、PP 10、目标 self／boosts={atk:+1, spe:+2}。
 * 世界化：把自己当成一台机器换挡。两档在攻击与速度之间分配同一份总提升，换到另一档会替换上一档的贡献，
 * 提升只维持一段可见窗口，窗口走完或被清除时收回。
 * 攻速两项都走 NativeEffects.boostWindow：宝可梦写原生等级层，其他战斗者落共享阶梯。
 * 数值只依赖自己：速度决定起手多快把齿轮带起来；体型决定齿轮尺寸与收招。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   attackGift 扭力档 2／超速档 1，等级 50 起 +1；夹 1..3 级。总提升扭力=4、超速=4（50级），否则都是 3。
 *   speedGift  超速档 2／扭力档 1；夹 1..3 级。
 *   span       提升窗口固定 180 刻（9 秒）；再次换挡替换贡献并重新计时。
 *   telegraph  速度每比 60 快 1 少 0.05 刻；夹 6..18 刻。天生快的个体更早换好挡。
 *   aftermath  收招：基础 6 刻，碰撞箱高度每 1 格 +2；夹 6..14 刻。身板越大越慢。
 *   orbit      齿轮尺寸：基础 1.1 格，碰撞箱高度 ×0.35，夹 0.9..2.2。身板越大齿轮越开。
 *   wait       冷却：基础 120 刻，等级 52 起降到 100。PP 10 的代价。
 * 配置 gear（扭力档／超速档）总档位相同，只在攻速之间让渡，没有净收益更大的一侧。
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
                description: "换挡提升的攻击等级；扭力档给得更多。50级起两档都再 +1。"
            }),
        /** 速度档：超速 2／扭力 1，夹 1..3。 */
        speedGift: formula(
            F.when(F.pref("gear", text("worldcombat.skill.shiftgear.preference.gear")), F.base(2), F.const(1)).clamp(1, 3).round(0),
            "速度档", {
                unit: " 级",
                description: "换挡提升的速度等级；超速档给得更多，追得上人、出得了手。"
            }),
        /** 提升窗口固定 180 刻；重新换挡替换贡献并重新计时。 */
        span: seconds(
            F.base(180),
            "换挡续航", "换挡后攻速提升保留多久；再次换挡会替换本招贡献并重新计时。"),
        /** 齿轮尺寸：基础 1.1 格，碰撞箱高度 ×0.35，夹 0.9..2.2。 */
        orbit: formula(
            F.base(1.1).plus(F.body("height").times(0.35)).clamp(0.9, 2.2).round(2),
            "齿轮尺寸", {
                unit: " 格",
                description: "身侧那对咬合齿轮的尺寸；身板越大齿轮越开。"
            }),
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
        { key: "description.2", values: [] },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] }
    ]);
}
