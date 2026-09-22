/**
 * 怨念 / grudge —— 参数与机制数值来源。
 *
 * 原生事实：Ghost、变化、威力 —、命中 必中、PP 5、目标自身；挂 volatile `grudge`，
 *   使用者因对手的招式陷入濒死时，把对手最后使用的那一招的 PP 全部清空。
 *
 * 世界化：把这一手记在心里——施法者当场立下一段怨念，接下来的时间里只要有人亲手把它打倒，
 *   这份怨念就扑到凶手身上，把它刚刚用来送走自己的那一招 PP 全部掏空。它不护住使用者，
 *   只是让「亲手了结我」这件事在事后付出代价；对手可以收住最后一击、改用环境或别的来源了结，
 *   或干脆等怨念自己散掉。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数）：
 *   watchTicks   300 + (等级 − 20)×3 + 特防×1.2，刻骨 ×1.5、轻怨 ×0.85，夹 200..900 刻；等级与特防让怨念留更久——
 *                它要能撑到你倒下，所以窗口天生偏长。
 *   eyeRadius    0.4 + (宽度 − 0.9)×0.2，夹 0.35..0.9 格；怨眼圈随体型。
 *   motes        10 + 特攻×0.12，夹 10..28 个；画面里的怨念数量。
 *   tempo        10 − (速度 − 40)×0.02，夹 5..14 刻；出手越快越早立下。
 *   aftercast    7 + (身高 − 1.4)×1.0，夹 5..12 刻。
 *   recharge     200 − (等级 − 20)×0.6，刻骨 ×1.2、轻怨 ×0.85，夹 120..300 刻。
 * 配置 deep（刻骨）双向取舍：开启＝怨念更久，但整段时间被钉在原地、冷却更长；
 *   关闭（轻怨）＝更短，但可以自由走位、冷却更短——更短意味着更容易被对手等过去。
 */
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
        { key: "description.0", values: ["watchTicks", "eyeRadius"] },
        { key: "description.1", values: ["motes", "tempo", "recharge"] },
        { key: "deep.0", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.1", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
