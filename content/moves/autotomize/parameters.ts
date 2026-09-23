/**
 * 身体轻量化 / autotomize — 参数与数值来源。
 *
 * 原生事实：Steel、变化、威力 —、命中必中、PP 15、目标 self、boosts { spe: +2 }；
 *   onHit 把 weighthg 减 1000（最低 1），即削掉 100kg 体重。
 *
 * 翻译：把「削掉身体上没用的部分」翻成**当场卸下真实部件**——身上一块块没用的甲片被撬下来甩到地上，
 *   身体一下子轻了、快得离谱；轻身窗口里重力变小，整个人浮起来。取原生「+2 速度、15 PP、体重变轻」；
 *   放弃回合制里永久保留的等级 → 即时交战里速度等级立刻写入公共能力阶梯，卸下的部件是世上真东西，
 *   轻身窗口内重力下调（这是「变轻」在世界里的兑现，也是它的形状）。
 *   本族里它是唯一会在场上留下可拾取残件、并且真的改变身体重感的一招。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift       提速等级：基础 2，体重 ≥ 200kg 再 +1；夹 2..3。越沉的身体能卸下的越多、提速越多。
 *   parts      卸下件数：基础 2 + 体重（kg）/120；夹 2..6。身体越沉，掉下来的部件越多。
 *   buoyancy   轻身浮力：基础 0.15 + 体重（kg）×0.0004；夹 0.15..0.35。越沉的身体卸完越轻，重力降得越多。
 *   fling      卸件速度：基础 0.2 格/刻 + 碰撞箱宽度×0.12；夹 0.15..0.45。越宽的身体甩得越开。
 *   lightTicks 轻身窗口：基础 120 刻 + 等级×2；夹 120..300。等级越高，轻身状态维持越久。
 *   tempo      起手：基础 6 刻 + 体重（kg）×0.012；夹 6..14。越沉，撬下部件花的时间越长。
 *   aftercast  收招：基础 5 刻 + 碰撞箱高度×1.4；夹 5..10。身板越高大收得越慢。
 *   wait       冷却：基础 80 刻 − 等级×0.3；夹 55..90。PP 15 的代价。
 * 无玩法配置项：部件一旦卸下就回不去，取舍只在「什么时候用它换速度」。
 */
namespace PokemonSkills {
    actionParameters.define("autotomize", {
        /** 提速等级：越沉卸得越多、提速越多。 */
        gift: formula(
            F.base(2).plus(F.when(F.body("weight").gte(2000), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "提速等级", {
                unit: " 级",
                description: "卸下部件后抬高的速度等级；体重 200kg 以上的身体多卸一级。"
            }),
        /** 卸下件数：体重越大掉得越多。 */
        parts: formula(
            F.base(2).plus(F.body("weight").div(10).div(120)).clamp(2, 6).round(0),
            "卸下件数", {
                unit: " 件",
                description: "一次撬下多少块部件；身体越沉掉得越多，也是画面里残件的数量。"
            }),
        /** 轻身浮力：轻身窗口里重力下调的比例。 */
        buoyancy: percent(
            F.base(0.15).plus(F.body("weight").div(10).times(0.0004)).clamp(0.15, 0.35).round(3),
            "轻身浮力", "轻身窗口内重力下调的比例；身体越沉卸完越轻，浮得越明显。"),
        /** 卸件速度：越宽甩得越开。 */
        fling: formula(
            F.base(0.2).plus(F.body("width").times(0.12)).clamp(0.15, 0.45).round(2),
            "卸件速度", {
                unit: " 格/刻",
                description: "卸下的部件被甩出去的速度；身体越宽甩得越开。"
            }),
        /** 轻身窗口：等级越高维持越久。 */
        lightTicks: seconds(
            F.base(120).plus(F.level().times(2)).clamp(120, 300).round(0),
            "轻身窗口", "「轻身」在身上留多久；等级越高越久。窗口内重力下调、身体浮起，AI 也不会重复施放。"),
        /** 起手：越沉撬得越久。 */
        tempo: seconds(
            F.base(6).plus(F.body("weight").div(10).times(0.012)).clamp(6, 14).round(0),
            "起手", "撬下第一块部件需要多久；身体越沉越慢。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.4)).clamp(5, 10).round(0),
            "收招", "卸完站定的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(80).minus(F.level().times(0.3)).clamp(55, 90).round(0),
            "冷却", "两次卸件之间的等待；等级越高越短。PP 15 的代价。")
    });

    stages("autotomize", [
        { level: 40, values: { lightTicks: 180, wait: 70 } },
        { level: 55, values: { lightTicks: 220, wait: 62 } }
    ]);

    describe("autotomize", [
        { key: "description.0", values: ["gift","parts","fling"] },
        { key: "description.1", values: ["lightTicks","buoyancy"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lightTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lightTicks", "tier.1.wait"] }
    ]);
}
