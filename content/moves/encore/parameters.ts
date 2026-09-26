/** encore：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const encoreId = "encore";
    export const encoreEffect = "world_combat:encore_call";
    export const encoreLoop = "world_combat:encore_loop";
    export const encoreScene = "world_combat:move_encore";
    export const encoreStatus = "encore";
    export const encoreLockText = "world_combat.move.encore.text.lock";
    export const encoreFadeText = "world_combat.move.encore.text.fade";
    export const encoreMissText = "world_combat.move.encore.text.miss";
    export const encoreRejectText = "world_combat.move.encore.text.reject";

    function encorePreference(): Formula.Node {
        return F.pref("strict", { key: "worldcombat.skill.encore.preference.strict" });
    }

    actionParameters.define(encoreId, {
        reach: formula(
            F.base(4).plus(F.stat("specialAttack").minus(40).max(0).times(0.02)).plus(F.body("height").times(0.8))
                .times(F.when(encorePreference(), F.const(0.8), F.const(1.15))).clamp(3, 9).round(1),
            "点名距离", {
                unit: " 格",
                description: "能把「再来一次」点到多远；特攻越高、身板越大喊得越远，严令更近、轻唤更远。它也是本招的实际射程来源。"
            }),
        callTicks: seconds(
            F.base(100).plus(F.level().minus(20).max(0).times(2)).plus(F.stat("specialDefence").times(0.6))
                .times(F.when(encorePreference(), F.const(1.3), F.const(0.8))).clamp(80, 420).round(0),
            "重复时长", "被点名者只能重复那一手的时长；等级与特防撑住回声，严令更久、轻唤更短。"),
        memory: seconds(
            F.base(200).plus(F.level().minus(20).max(0).times(2)).clamp(160, 420).round(0),
            "记忆窗口", "「最后使出的招式」在多长时间内还算数；更久以前的那一手不再点名，这一手会落空。"),
        motes: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.15)).clamp(10, 30).round(0),
            "回声数量", {
                unit: " 个",
                description: "扣上回声与持续画面里的音符数量；特攻越高越密。"
            }),
        loopRadius: formula(
            F.base(0.35).plus(F.body("width").minus(0.9).max(0).times(0.18)).clamp(0.3, 0.8).round(2),
            "回声半径", {
                unit: " 格",
                description: "扣在目标头上的回声圈大小；体型越宽圈越大。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(40).max(0).times(0.02))
                .plus(F.when(encorePreference(), F.const(2), F.const(-1))).clamp(4, 13).round(0),
            "起手", "把这一句点出去需要多久；速度越快越早完成，严令更慢、轻唤更快。"),
        aftercast: seconds(
            F.base(5).plus(F.body("height").minus(1.4).max(0).times(1.2)).clamp(4, 10).round(0),
            "收势", "点名之后的收招。"),
        recharge: seconds(
            F.base(120).minus(F.level().minus(20).max(0).times(0.4))
                .times(F.when(encorePreference(), F.const(1.15), F.const(0.85))).clamp(70, 150).round(0),
            "冷却", "两次点名之间的等待；等级越高越熟练，严令更贵、轻唤更便宜。")
    });

    describe(encoreId, [
        { key: "description.0", values: ["callTicks", "memory"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "strict.0", values: [], when: function (context) { return read(context.detail.values, ["strict"]) === true; } },
        { key: "strict.1", values: [], when: function (context) { return read(context.detail.values, ["strict"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
