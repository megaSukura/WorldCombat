/**
 * 碉堡 / banefulbunker 的参数。
 *
 * 原生事实：Poison、Status、自身、优先度 +4、PP 10；防住对手攻击的同时让接触到自己的对手中毒（Cobblemon 1.8 数据）。
 *
 * 翻译：把“毒 + 守”翻成一座**从地面鼓起的毒壁碉堡**——它像守住一样按总量挡下每一击，而每一次直接的接触
 * 让攻击者被壁上的倒钩灌进毒液（走 CombatStatus.inflict 的共享主异常 `poison`，宝可梦那侧同步成原生异常，
 * 队伍 UI 与原生特性道具都跟着生效）。**对已经中毒的接触者改灌剧毒**，把战场上已有的状态当材料。
 *
 * 与家族分开：同族里尖刺防守当场掉血、王者盾牌削攻击、线阱黏速度，只有碉堡**后续持续掉血**；
 * 与尖刺防守同为“全封”（连变化招式一起挡），区别在这里结算的是一条会自己走的毒。
 *
 * 数值分散到多类精灵数据（每项读不同的量）：
 *   raise      鼓壁快慢：体重。
 *   window     碉堡持续：防御、配置取向。
 *   capacity   碉堡能完整挡下的总量：当前生命 + 防御、配置取向。
 *   venom      灌入的毒时长：特攻 + 等级（毒液越浓走得越久），走共享主异常时长；对已中毒者改灌剧毒。
 *   radius     碉堡半径：碰撞箱高度。
 *   charge     冷却：等级。
 *   fizzle     连用失误率：本招自己的连用计数 + 等级。
 *
 * 配置 `venomous`（淬毒／厚壁）双向取舍：开＝灌毒时长 ×1.35，但总量 ×0.8、持续 ×0.85、收招 8 刻；
 * 关＝总量 ×1.25、持续 ×1.15、收招 5 刻，但灌毒 ×0.8。两向各有局面（磨死 vs 硬挡）。
 */
namespace PokemonSkills {
    actionParameters.define("banefulbunker", {
        /** 立起时间：基础 9 刻 + 体重 ×0.002，夹在 7..17。 */
        raise: formula(
            F.base(9).plus(F.body("weight").times(0.002)).clamp(7, 17).round(0),
            "立起时间", {
                unit: "刻",
                description: "从起手到毒壁合拢的时间；重身板鼓得慢。"
            }),
        /** 碉堡持续：基础 26 刻，防御每比 60 高 1 +0.12 刻；淬毒 ×0.85、厚壁 ×1.15，夹在 14..52。 */
        window: formula(
            F.base(26).plus(F.stat("defence").minus(60).max(0).times(0.12))
                .times(F.when(F.pref("venomous"), F.const(0.85), F.const(1.15)))
                .clamp(14, 52).round(0),
            "碉堡持续", {
                unit: "刻",
                description: "毒壁从合拢到塌下的时间；防御越高撑得越久，淬毒取向更短。"
            }),
        /** 碉堡总量：基础 17 点，当前生命 ×0.22、防御 ×0.30；淬毒 ×0.8、厚壁 ×1.25，夹在 10..120。 */
        capacity: formula(
            F.base(17)
                .plus(F.actor("health").times(0.22))
                .plus(F.stat("defence").times(0.30))
                .times(F.when(F.pref("venomous"), F.const(0.8), F.const(1.25)))
                .clamp(10, 120).round(1),
            "碉堡总量", {
                unit: "点",
                description: "毒壁能完整挡下的伤害总量；残血更薄，肉盾的壁更耐打。"
            }),
        /** 灌毒时长：基础 240 刻 + 特攻 ×0.9 + 等级 ×4；淬毒 ×1.35、厚壁 ×0.8，夹在 160..800。 */
        venom: seconds(
            F.base(240)
                .plus(F.stat("specialAttack").times(0.9))
                .plus(F.level().times(4))
                .times(F.when(F.pref("venomous"), F.const(1.35), F.const(0.8)))
                .clamp(160, 800).round(0),
            "灌毒时长", "接触者中毒后持续掉血的时间；特攻越高、等级越高毒得越久。对已经中毒者改为剧毒。"),
        /** 碉堡半径：基础 1.6 格 + 碰撞箱高度 ×0.45，夹在 1.5..3.0。 */
        radius: formula(
            F.base(1.6).plus(F.body("height").times(0.45)).clamp(1.5, 3.0).round(2),
            "碉堡半径", {
                unit: "格",
                description: "毒壁护住的横向半径；身板越大壁越宽，画面与判定同半径。"
            }),
        /** 冷却：基础 85 刻 + 等级 ×0.5，夹在 85..140。 */
        charge: formula(
            F.base(85).plus(F.level().times(0.5)).clamp(85, 140).round(0),
            "冷却", {
                unit: "刻",
                description: "再次合拢碉堡前的等待；等级越高成本越大。"
            }),
        /** 连用失误率：连用计数每多 1 次 +0.25，30 级起每级 −0.003，夹在 0..0.85。 */
        fizzle: percent(
            F.state(GuardEffects.stallKey, "连用计数", "stall").times(0.25)
                .minus(F.level().minus(30).max(0).times(0.003))
                .clamp(0, 0.85),
            "连用失误率", "兑现“连续使出容易失败”：短时间内反复合拢碉堡会越来越容易失败。"),
        /** 连用计数重置：超过这么久没用就归零。 */
        stallReset: hidden(240)
    });

    describe("banefulbunker", [
        { key: "description.0", values: ["window","capacity","venom"] },
        { key: "description.ward", values: [] },
        { key: "description.1", values: ["raise","charge"] },
        { key: "description.2", values: ["fizzle"] }
    ]);
}
