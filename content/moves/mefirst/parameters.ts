/**
 * 抢先一步 / mefirst —— 参数与机制数值来源。
 *
 * 核心念头：压住身位，抢在对手抬手的下一拍把那一下夺过来先打出去，还比它更重。它的价值全在时机：
 *   对手在守候窗口里没再出手，这一手就白抢。
 *
 * 原生事实（Showdown mefirst）：Normal／变化／命中 —／PP 20／target normal；`onTryHit` 读 `queue.willMove(target)`
 *   （对手本回合准备使出的招），没有 / 是变化招 / 带 failmefirst 就失败；把那一手以 1.5 倍基础威力抢先用出，
 *   对手随后照常行动。世界化后没有回合队列，于是把「抢先」翻成一段守候：提交时记下目标此刻的最近一次出手，
 *   在 vigil 窗口里等它下一次真正提交；一旦出现可抢的伤害招，就沿同一笔提交（NativeLoadout.call）夺过来先打，
 *   并由本单元的伤害元数据把威力乘上 surge。守候窗口走完还没动静就落空（PP 照扣，与原作失败一致）。
 *
 * 每个参数读不同的精灵数据（分散到不同参数）：
 *   reach      能锁住多远的目标：特攻与身高共同决定，也是本招的实际射程来源。
 *   vigil      守候窗口：等对手下一拍等多久；等级延长、速度略增，耐心时更长。
 *   surge      夺来那一手的威力倍率：速度越快抢得越重。
 *   sparks     起手聚起的抢招光痕数量：特攻决定表现。
 *   tempo      起手：几乎瞬发，速度决定；耐心要多压一拍。
 *   aftercast  收势：速度越快越快回身。
 *   recharge   冷却：速度越快越快再抢；耐心更贵。
 * 配置 patient（耐心）双向取舍：守候窗口更长、更容易等到对手出手，但起手更慢、冷却更长；关闭是短促的抢拍。
 *   它通过 F.pref("patient") 进入公式。
 */
namespace PokemonSkills {
    export const mefirstId = "mefirst";
    export const mefirstScene = "world_combat:move_mefirst";
    export const mefirstTakeText = "world_combat.move.mefirst.text.take";
    export const mefirstMissText = "world_combat.move.mefirst.text.miss";

    actionParameters.define(mefirstId, {
        reach: formula(
            F.base(8).plus(F.stat("specialAttack").times(0.03)).plus(F.body("height").times(1.2)).clamp(6, 18).round(1),
            "抢先距离", {
                unit: "格",
                description: "能锁住多远的对手；特攻越高、身板越大看得越远。它也是本招的实际射程来源。"
            }),
        vigil: seconds(
            F.base(90).plus(F.level().times(1.2)).plus(F.stat("speed").times(0.4))
                .times(F.when(F.pref("patient"), F.const(1.5), F.const(1)))
                .clamp(70, 260).round(0),
            "守候窗口", "在对手下一拍出手之前守候多久；等级越高、速度越快守得越久，耐心时更长。窗口走完还没等到就落空。"),
        snap: seconds(
            F.base(24).plus(F.stat("speed").times(0.08)).clamp(18, 44).round(0),
            "同拍窗口", "对手刚出手后，还能追上去把这同一拍抢过来的反应时间；速度越快反应越久。它让抢先一步不必非等到下一拍。"),
        surge: formula(
            F.base(1.35).plus(F.stat("speed").times(0.004)).clamp(1.3, 1.75).round(2),
            "夺招增幅", {
                unit: "×",
                description: "夺来那一手的威力倍率；速度越快抢得越重。对手的防御、相性与暴击照常另算。"
            }),
        sparks: formula(
            F.base(6).plus(F.stat("specialAttack").div(8)).clamp(6, 18).round(0),
            "抢招光痕", {
                unit: "点",
                description: "起手时聚在脚下的抢先光痕数量；特攻越高越密，也驱动表现。"
            }),
        tempo: seconds(
            F.base(5).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("patient"), F.const(3), F.const(0)))
                .clamp(1, 10).round(0),
            "起手", "压下身体、进入守候的时间；几乎瞬发，速度越快越短，耐心要多压一拍。"),
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").times(0.006)).clamp(3, 8).round(0),
            "收势", "抢完或抢空后回身的时间；速度越快越短。"),
        recharge: seconds(
            F.base(50).minus(F.stat("speed").times(0.06))
                .times(F.when(F.pref("patient"), F.const(1.25), F.const(1)))
                .clamp(26, 90).round(0),
            "冷却", "两次抢拍之间的等待；速度快的个体更快，耐心更贵。")
    });

    describe(mefirstId, [
        { key: "description.0", values: ["reach", "vigil"] },
        { key: "description.1", values: ["surge","snap"] },
        { key: "description.steal", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "patient.on", values: [], when: function (context) { return read(context.detail.values, ["patient"]) === true; } },
        { key: "patient.off", values: [], when: function (context) { return read(context.detail.values, ["patient"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
