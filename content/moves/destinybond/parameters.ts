/**
 * 同命 / destinybond —— 参数与机制数值来源。
 *
 * 原生事实：Ghost、变化、威力 —、命中 必中、PP 5、目标自身；挂 volatile `destinybond`，
 *   使用者被对手的招式打倒时，对手也一同濒死；连续使出会失败（已有 volatile 时 onPrepareHit 返回失败）。
 *
 * 世界化：把两个人的命拴在一根红线上——施法者当众系结，接下来任何非友方的一击只要真的把它打倒，
 *   线就绷紧，杀它的那个也一起倒下。它不减免伤害、不护住自己，只是把「你来杀我」的代价摆到明面上；
 *   对手在这段时间里收住最后一击、改用环境或其他来源了结、或干脆走开等线松开，都是正经的反制。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数）：
 *   bondTicks    80 + (等级 − 20)×2 + 特防×0.8，死结 ×1.5、松结 ×0.7，夹 70..400 刻；等级与特防把结系得更久。
 *   markRadius   0.4 + (宽度 − 0.9)×0.2，夹 0.35..0.9 格；绳结圈随体型。
 *   threads      8 + 特攻×0.1，夹 8..24 根；画面里的线头数量。
 *   tempo        9 − (速度 − 40)×0.02，夹 5..13 刻；出手越快越早系好。
 *   aftercast    6 + (身高 − 1.4)×1.1，夹 5..11 刻。
 *   recharge     160 − (等级 − 20)×0.5，死结 ×1.2、松结 ×0.85，夹 100..220 刻。
 * 配置 tight（死结）双向取舍：开启＝结系得更久，但全程被钉在原地、冷却更长；
 *   关闭（松结）＝结更短，但可以自由走位、冷却更短——更短意味着对手更容易等它松开。
 */
namespace PokemonSkills {
    export const destinyId = "destinybond";
    export const destinyEffect = "world_combat:destiny_bond";
    export const destinyMark = "world_combat:destiny_bond_mark";
    export const destinyScene = "world_combat:move_destinybond";
    export const destinyStatus = "destiny_bond";
    export const destinyBindText = "world_combat.move.destinybond.text.bind";
    export const destinyDragText = "world_combat.move.destinybond.text.drag";
    export const destinyLiftText = "world_combat.move.destinybond.text.lift";

    function destinyPreference(): Formula.Node {
        return F.pref("tight", { key: "worldcombat.skill.destinybond.preference.tight" });
    }

    actionParameters.define(destinyId, {
        bondTicks: seconds(
            F.base(80).plus(F.level().minus(20).max(0).times(2)).plus(F.stat("specialDefence").times(0.8))
                .times(F.when(destinyPreference(), F.const(1.5), F.const(0.7))).clamp(70, 400).round(0),
            "系结时长", "这条命线在你身上留多久；等级与特防撑得更久，死结 ×1.5、松结 ×0.7。"),
        markRadius: formula(
            F.base(0.4).plus(F.body("width").minus(0.9).max(0).times(0.2)).clamp(0.35, 0.9).round(2),
            "绳结半径", {
                unit: " 格",
                description: "缠在身上的绳结圈大小；体型越宽圈越大。"
            }),
        threads: formula(
            F.base(8).plus(F.stat("specialAttack").times(0.1)).clamp(8, 24).round(0),
            "线头数量", {
                unit: " 根",
                description: "系结与断裂画面里的线头数量；特攻越高越密。"
            }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(40).max(0).times(0.02)).clamp(5, 13).round(0),
            "起手", "把这条线系好需要多久；速度越快越早。"),
        aftercast: seconds(
            F.base(6).plus(F.body("height").minus(1.4).max(0).times(1.1)).clamp(5, 11).round(0),
            "收势", "系结之后的收招。"),
        recharge: seconds(
            F.base(160).minus(F.level().minus(20).max(0).times(0.5))
                .times(F.when(destinyPreference(), F.const(1.2), F.const(0.85))).clamp(100, 220).round(0),
            "冷却", "两次系结之间的等待；等级越高越熟练，死结更贵、松结更便宜。")
    });

    describe(destinyId, [
        { key: "description.0", values: ["bondTicks"] },
        { key: "description.1", values: ["tempo", "recharge"] },
        { key: "tight.0", values: [], when: function (context) { return read(context.detail.values, ["tight"]) === true; } },
        { key: "tight.1", values: [], when: function (context) { return read(context.detail.values, ["tight"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
