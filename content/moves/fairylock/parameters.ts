/**
 * 妖精之锁 / fairylock —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：妖精、变化、威力 0、命中 必中、PP 10、优先度 0、目标 全场；
 *   `pseudoWeather: "fairylock"` 持续 2（一个回合），`onTrapPokemon` 让场上每一只宝可梦都无法逃走。
 *   原生介绍「通过封锁，下一回合所有的宝可梦都无法逃走。」
 *
 * 世界化：把「封住一整块场地一个回合」落成**一圈会收拢的妖精光栅**——落地时把半径内每个活体
 *   （包括术者自己与队友）都钉在原地，谁也走不出这块地，直到封印松开。它天生是**对等的**：你自己也被锁住，
 *   所以使用时机是「先把对手关进来、再由队友集火」；站到半径之外就不受影响。
 *   光栅会在这段时间里持续扫描，走进去的活体同样被扣住；被外力推出去则脱锁。
 *
 * 与同族分开：黑色目光把术者自己钉在原地当锁、蛛网缠在目标身上怕火、挡路立墙封退路；
 *   妖精之锁是一块短时的对等场地，把所有站进来的活体一起锁住，术者也跑不掉。
 *
 * 数值来源（每项读不同的个体数据，落到不同参数）：
 *   radius     封印半径：等级与身板决定光栅铺多大；深锁式收窄。
 *   sealTicks  封印时长：特防决定撑多久；深锁式更长。
 *   lattice    光栅道数：特攻换算，驱动画面里竖向光栅的密度。
 *   bars       光栅立柱数：等级换算，画面里立柱越多。
 *   tempo／aftercast／recharge：速度、身形与等级定节奏。
 *
 * 配置 `deep`（深锁）双向取舍（默认关）：
 *   开（深锁）：封印时长 ×1.4；代价是半径 ×0.8、起手 +4 刻、冷却 +20 刻——锁得更久，但圈更小、更慢更费。
 *   关（广域锁）：圈更大、更快、冷却更短；代价是锁得更短。
 */
namespace PokemonSkills {
    export const fairyId = "fairylock";
    export const fairyScene = "world_combat:move_fairylock";
    export const fairySeal = "world_combat:fairy_lock";
    export const fairyNet = "world_combat:fairy_lock_net";
    export const fairySealText = "world_combat.move.fairylock.text.seal";
    export const fairyReleaseText = "world_combat.move.fairylock.text.release";
    export const fairyCaughtText = "world_combat.move.fairylock.text.caught";

    actionParameters.define(fairyId, {
        radius: formula(
            F.base(5).plus(F.level().times(0.04).as("经验")).plus(F.body("height").times(0.3).as("身板"))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(0.8), F.const(1)))
                .clamp(4, 8).round(1),
            "封印半径", {
                unit: " 格",
                description: "光栅围住多大一圈；圈内每个活体（含术者）都会被钉住。等级与身板越大越广，深锁式收窄。"
            }),
        sealTicks: seconds(
            F.base(60).plus(F.stat("specialDefence").times(1.0).as("特防"))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(1.4), F.const(1)))
                .clamp(50, 140).round(0),
            "封印时长", "光栅维持多久；特防越高撑得越久，深锁式再延长。时长一到光栅散开、全员恢复自由。"),
        lattice: formula(
            F.base(14).plus(F.stat("specialAttack").times(0.2).as("特攻")).clamp(14, 34).round(0),
            "光栅道数", {
                unit: " 道",
                description: "竖向光栅的密度；特攻越高越密，也是画面里光栅粒子的数量。"
            }),
        bars: formula(
            F.base(6).plus(F.level().times(0.1).as("经验")).clamp(6, 14).round(0),
            "光栅立柱", {
                unit: " 根",
                description: "一圈立柱的根数；等级越高越多，画面里立柱也随之增多。"
            }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).as("速度"))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(4), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把光栅从天上召下来需要多久；速度越快越短，深锁式要多聚几刻。"),
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.8).as("身高")).clamp(5, 12).round(0),
            "收招", "光栅落地后的收势；身量越大收得越慢。"),
        recharge: seconds(
            F.base(120).minus(F.level().times(0.5).as("经验"))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fairylock.preference.deep")), F.const(20), F.const(0)))
                .clamp(80, 160).round(0),
            "冷却", "两次封印之间的等待；等级越高越熟练，深锁式更费。PP 10 的代价。")
    });

    stages(fairyId, [
        { level: 45, values: { radius: 6.0, recharge: 100 } }
    ]);

    describe(fairyId, [
        { key: "description.0", values: ["radius","sealTicks"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo","aftercast","recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.radius", "tier.0.recharge"] }
    ]);
}
