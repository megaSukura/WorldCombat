/** grudge：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const grudgeId = "grudge";
    export const grudgeEffect = "world_combat:grudge_watch";
    export const grudgeMark = "world_combat:grudge_mark";
    export const grudgeScene = "world_combat:move_grudge";
    export const grudgeStatus = "grudge";
    export const grudgeMarkText = "world_combat.move.grudge.text.mark";
    export const grudgeDrainText = "world_combat.move.grudge.text.drain";
    export const grudgeWastedText = "world_combat.move.grudge.text.wasted";
    export const grudgeLiftText = "world_combat.move.grudge.text.lift";

    function grudgePreference(): Formula.Node {
        return F.pref("deep", { key: "worldcombat.skill.grudge.preference.deep" });
    }

    actionParameters.define(grudgeId, {
        watchTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(3)).plus(F.stat("specialDefence").times(1.2))
                .times(F.when(grudgePreference(), F.const(1.5), F.const(0.85))).clamp(200, 900).round(0),
            "怨念时长", "这份怨念在身上留多久；等级与特防留得更久，刻骨 ×1.5、轻怨 ×0.85。"),
        eyeRadius: formula(
            F.base(0.4).plus(F.body("width").minus(0.9).max(0).times(0.2)).clamp(0.35, 0.9).round(2),
            "怨眼半径", {
                unit: " 格",
                description: "贴在脚下的怨眼圈大小；体型越宽圈越大。"
            }),
        motes: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.12)).clamp(10, 28).round(0),
            "怨念数量", {
                unit: " 个",
                description: "立下与扑咬画面里的怨念数量；特攻越高越密。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(40).max(0).times(0.02)).clamp(5, 14).round(0),
            "起手", "把这份怨念立起来需要多久；速度越快越早。"),
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).max(0).times(1.0)).clamp(5, 12).round(0),
            "收势", "立下怨念之后的收招。"),
        recharge: seconds(
            F.base(200).minus(F.level().minus(20).max(0).times(0.6))
                .times(F.when(grudgePreference(), F.const(1.2), F.const(0.85))).clamp(120, 300).round(0),
            "冷却", "两次立怨之间的等待；等级越高越熟练，刻骨更贵、轻怨更便宜。")
    });

    describe(grudgeId, [
        { key: "description.0", values: ["watchTicks"] },
        { key: "description.1", values: ["tempo", "recharge"] },
        { key: "deep.0", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.1", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] }
    ]);
}
