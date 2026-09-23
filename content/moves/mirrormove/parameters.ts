/**
 * 鹦鹉学舌 / mirrormove —— 参数与机制数值来源。
 *
 * 核心念头：对手刚挥出的那一手被一面镜盾原样折回，打回它自己身上。它只还手，不主动出手；
 *   对手最近没出过可折的招时，镜面只裂出一地碎光。
 *
 * 原生事实（Showdown mirrormove）：Flying／变化／命中 —／PP 20／target normal；`onTryHit` 取 `target.lastMove`，
 *   要求带 `mirror` 旗标（大多数伤害招式都有），否则失败；`useMove(move.id, pokemon, target)` 把那一手打到目标身上。
 * 世界化：读目标最近一次真正提交的招式（NativeEffects.lastMove），限定在 focus 记忆窗口内并要求 flags.mirror；
 *   折返沿用同一笔提交（NativeLoadout.call），目标锁定为那一手的主人。配置 keen（锐镜）给折返加一份威力，
 *   由本单元的伤害元数据在结算前乘上，与执行、悬浮同源。
 *
 * 每个参数读不同的精灵数据（分散到不同参数）：
 *   reach      镜盾能折到多远：特攻与身高共同决定，也是本招的实际射程来源。
 *   focus      记忆窗口：能折多久以前的那次出手；特攻记得更久，锐镜更久。
 *   mirrors    镜面数量：特攻决定表现里的镜面层数。
 *   edge       折返增幅：锐镜开启时 ×1.2，否则 ×1。
 *   tempo      起手：速度越快越快立盾；锐镜要多摆一拍。
 *   aftercast  收势：速度越快越快收镜。
 *   recharge   冷却：速度越快越快复位；锐镜更贵。
 * 配置 keen（锐镜）双向取舍：折返威力 ×1.2、记忆略长，但起手更慢、冷却 ×1.3；关闭则是快而平的还手。
 */
namespace PokemonSkills {
    export const mirrormoveId = "mirrormove";
    export const mirrorScene = "world_combat:move_mirrormove";
    export const mirrorGlossEffect = "world_combat:mirror_gloss";
    export const mirrorReflectText = "world_combat.move.mirrormove.text.reflect";
    export const mirrorDullText = "world_combat.move.mirrormove.text.dull";

    actionParameters.define(mirrormoveId, {
        reach: formula(
            F.base(7).plus(F.stat("specialAttack").times(0.03)).plus(F.body("height").times(1.2)).clamp(5, 16).round(1),
            "折返距离", {
                unit: "格",
                description: "镜盾能把那一手折到多远；特攻越高、身板越大够得越远。它也是本招的实际射程来源。"
            }),
        focus: seconds(
            F.base(100).plus(F.stat("specialAttack").times(0.6)).plus(F.level().times(0.5))
                .times(F.when(F.pref("keen"), F.const(1.25), F.const(1)))
                .clamp(80, 260).round(0),
            "镜面记忆", "能折多久以前的那次出手；特攻越高、锐镜时记得越久，太久以前的招式折不动。"),
        mirrors: formula(
            F.base(6).plus(F.stat("specialAttack").div(7)).clamp(6, 18).round(0),
            "镜面层数", {
                unit: "层",
                description: "身前立起的镜面数量；特攻越高越密，也驱动折返的表现。"
            }),
        edge: formula(
            F.when(F.pref("keen"), F.const(1.2), F.const(1)),
            "折返增幅", {
                unit: "×",
                description: "折返回去那一手的威力倍率；锐镜开启时 ×1.2，否则原样折回。对手的防御、相性与暴击照常另算。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("keen"), F.const(3), F.const(0)))
                .clamp(2, 12).round(0),
            "起手", "从立起镜盾到折出的时间；速度越快越短，锐镜要多摆一拍。"),
        aftercast: seconds(
            F.base(4).minus(F.stat("speed").times(0.005)).clamp(2, 7).round(0),
            "收势", "折返后的收镜；速度越快越短。"),
        recharge: seconds(
            F.base(55).minus(F.stat("speed").times(0.07))
                .times(F.when(F.pref("keen"), F.const(1.3), F.const(1)))
                .clamp(28, 95).round(0),
            "冷却", "两次折返之间的等待；速度快的个体更快，锐镜更贵。")
    });

    describe(mirrormoveId, [
        { key: "world", values: ["focus", "edge"] },
        { key: "description.0", values: ["reach", "focus"] },
        { key: "description.1", values: ["edge"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "keen.on", values: [], when: function (context) { return read(context.detail.values, ["keen"]) === true; } },
        { key: "keen.off", values: [], when: function (context) { return read(context.detail.values, ["keen"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
