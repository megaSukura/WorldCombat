/** 守候真实准备/新起手。既有伤害记录不触发；复制仍有自己的准备、合法性与真实命中。 */
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
        { key: "description.1", values: ["surge"] },
        { key: "description.steal", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "patient.on", values: [], when: function (context) { return read(context.detail.values, ["patient"]) === true; } },
        { key: "patient.off", values: [], when: function (context) { return read(context.detail.values, ["patient"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
