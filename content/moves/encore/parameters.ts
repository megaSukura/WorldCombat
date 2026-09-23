/**
 * 再来一次 / encore —— 参数与机制数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中 100、PP 5、单体；命中后挂 volatile `encore`，
 *   强制目标连续 3 回合只能用「最后使出的那一招」；目标没有可点名的招、最后那招带 failencore、
 *   PP 为 0、或不再记得它时失败。
 *
 * 世界化：把「刚才那一手」从对手身上点名出来，逼它再演一遍——一道亮色的环形回声扣在目标头上；
 *   在回声散去前，它只能重复最后使出的那一招。扣上之后由共享原生招式锁定（`only`）承担，
 *   宝可梦面板、AI 候选与提交闸门读到的是同一份「只能用这一招」。最后那一招 PP 耗尽或不再记得时，
 *   回声自行散开；被牛奶或清除效果解掉则安静收场。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数）：
 *   reach        4 + (特攻 − 40)×0.02 + 身高×0.8，严令 ×0.8、轻唤 ×1.15，夹 3..9；嗓门与身板决定点名距离。
 *   callTicks    100 + (等级 − 20)×2 + 特防×0.6，严令 ×1.3、轻唤 ×0.8，夹 80..420；等级与特防撑住回声。
 *   memory       200 + (等级 − 20)×2，夹 160..420 刻；能记住多久以前的那次出手。
 *   motes        10 + 特攻×0.15，夹 10..30 个；画面里的音符数量。
 *   loopRadius   0.35 + (宽度 − 0.9)×0.18，夹 0.3..0.8 格；回声圈随体型。
 *   tempo        8 − (速度 − 40)×0.02，严令 +2、轻唤 −1，夹 4..13 刻；出手越快越早点名。
 *   aftercast    5 + (身高 − 1.4)×1.2，夹 4..10 刻。
 *   recharge     120 − (等级 − 20)×0.4，严令 ×1.15、轻唤 ×0.85，夹 70..150 刻。
 * 配置 strict（严令）双向取舍：开启＝回声更久，但点得更近、更慢更贵；关闭＝回声更短，但够得更远、更快更便宜。
 */
namespace PokemonSkills {
    export const encoreId = "encore";
    export const encoreEffect = "world_combat:encore_call";
    export const encoreLoop = "world_combat:encore_loop";
    export const encoreScene = "world_combat:move_encore";
    export const encoreStatus = "encore";
    export const encoreLockText = "world_combat.move.encore.text.lock";
    export const encoreFadeText = "world_combat.move.encore.text.fade";
    export const encoreMissText = "world_combat.move.encore.text.miss";

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
