/**
 * 和睦相处 / Play Nice 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 —（必定命中）／PP 20／目标 normal（单体）／boosts={atk:-1}（降低攻击）／
 *       flags 含 reflectable、bypasssub（非声音、无法被替身挡下）。
 * 世界化：不是隔空扣等级，而是**当着对方摊开双手表示和睦**——手势以自身为圆心摊给看得见的人，
 *   所以它不需要瞄准，但必须站进人堆里、还要让别人看得见。命中后挂共享身份 world_combat:status/befriended
 *   的真实 MobEffect，再调用 NativeEffects.boost 下降攻击；更关键的是它当场平息对方的敌意（世界 native
 *   target 归零，并在身份存续期间维持），让追上来的东西先停手。宝可梦那一层照旧走原生攻击等级。
 * 「摊手」铺得广而浅，一次劝住更多人；「作揖」把手势收小，但降得更深、平静更久，起手与冷却更长。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   offerRadius  宽度 × 1.5 + 1.5 格，摊手 ×1.2／作揖 ×0.8，夹 1.6..4.5；体型越宽，手势摊得越开。
 *   atkDrop      基础 1 级，等级 ≥ 40 升到 2 级，作揖再 +1，夹 1..3；越熟练越能让人下不去手。
 *   calmTicks    80 + 亲密度 × 0.5，摊手 ×0.8／作揖 ×1.4，夹 50..220；越亲近越能把这份和睦维持住。
 *   maxTargets   2 + (等级 − 30) ÷ 20，摊手 ×1.25／作揖 ×0.8，夹 1..6 人；等级越高一次劝住越多。
 *   sparkles     16 + 亲密度 × 0.08，夹 14..36；越亲近，一次摊出的暖点越多（也是画面里的数量）。
 *   tempo        摊手 8／作揖 13 − (速度 − 60) × 0.03 刻，夹 5..15；速度越快越早摊手，作揖要多花几刻。
 *   recharge     摊手 120／作揖 165 + (体重 − 60) × 0.4 刻，夹 105..190；身体越沉，收势越慢。
 */
namespace PokemonSkills {
    export const playniceId = "playnice";
    export const playniceEffect = "world_combat:befriended_offer";
    export const playniceScene = "world_combat:move_playnice";
    export const playniceSpot = "world_combat:status/befriended";

    actionParameters.define(playniceId, {
        offerRadius: formula(
            F.body("width").times(1.5).plus(1.5)
                .times(F.when(F.pref("bow", text("worldcombat.skill.playnice.preference.bow")), F.const(0.8), F.const(1.2)))
                .clamp(1.6, 4.5).round(2),
            "和睦半径", {
                unit: " 格",
                description: "手势以自身为圆心摊开的半径；体型越宽摊得越开，摊手取向铺得更广。"
            }),
        atkDrop: formula(
            F.base(1).plus(F.when(F.level().gte(40), F.const(1), F.const(0)))
                .plus(F.when(F.pref("bow", text("worldcombat.skill.playnice.preference.bow")), F.const(1), F.const(0))).clamp(1, 3),
            "攻击下降", {
                unit: " 级",
                description: "被劝住者损失的攻击等级；等级达到 40 时 +1，作揖再 +1。"
            }),
        calmTicks: seconds(
            F.base(80).plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("bow", text("worldcombat.skill.playnice.preference.bow")), F.const(1.4), F.const(0.8)))
                .clamp(50, 220).round(0),
            "和睦时长", "对方停手并保持友善多久；施法者越亲近越能把这份和睦维持住，作揖明显更久。"),
        maxTargets: formula(
            F.base(2).plus(F.level().minus(30).max(0).div(20))
                .times(F.when(F.pref("bow", text("worldcombat.skill.playnice.preference.bow")), F.const(0.8), F.const(1.25)))
                .clamp(1, 6).round(0),
            "劝住人数", {
                unit: " 人",
                description: "一次最多劝住几个人；等级越高越多，摊手铺得更广、作揖更聚焦。"
            }),
        sparkles: formula(F.base(16).plus(F.individual("friendship").times(0.08)).clamp(14, 36).round(0), "暖点数", {
            unit: " 个",
            description: "一次摊出的暖点数量；施法者越亲近越多，画面里的暖点也按它画出。"
        }),
        tempo: seconds(
            F.when(F.pref("bow", text("worldcombat.skill.playnice.preference.bow")),
                F.base(13).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(9, 15),
                F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(5, 11)),
            "起手", "摊开手势需要多久；速度越快越早，作揖要多花几刻。"),
        recharge: seconds(
            F.when(F.pref("bow", text("worldcombat.skill.playnice.preference.bow")),
                F.base(165).plus(F.body("weight").minus(60).max(0).times(0.4)).clamp(150, 190),
                F.base(120).plus(F.body("weight").minus(60).max(0).times(0.4)).clamp(105, 160)),
            "冷却", "两次和睦相处之间的等待；身体越沉收势越慢。")
    });
    describe(playniceId, [
        { key: "description.0", values: ["atkDrop", "calmTicks"] },
        { key: "description.1", values: ["offerRadius","maxTargets","range"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
