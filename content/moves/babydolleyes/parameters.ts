/**
 * 圆瞳 / Baby-Doll Eyes 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fairy、变化、威力 0、命中 100、PP 30、**优先度 +1**、
 *   目标 normal（单体）、boosts { atk: −1 }（降低攻击）。原文「必定能够先制攻击」。
 *
 * 世界化：不是隔空扣等级，而是**睁大一双圆眼睛盯住对手**——它举起的手先软下来。它是一件单体的凝视，
 *   需要视线，只认一个目标；命中后先挂共享身份 world_combat:status/charmed 的真实 MobEffect，再
 *   NativeEffects.boost 下降攻击：宝可梦损失原生攻击等级，其他生物落到攻击属性。
 *   原生的 +1 优先度翻成**极短的起手**（比同族任何一招都先落下），让它真能抢在对手出手前压低它。
 * 「疾视」快、范围小、卸得浅；「凝视」卸得更深更久、范围更远，但起手与冷却都更长，先手优势变小。
 *   视线与距离是它天然的空门。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   drop         攻击下降：凝视 2 级／疾视 1 级，夹 1..2；送法决定深度。
 *   gazeRange    凝视距离：基础 3.5 + 身高 × 0.8，凝视 ×1.25，夹 3..7；身形越高够得越远。
 *   softenTicks  心软时长：基础 100 刻 + 亲密度 × 0.9，凝视 ×1.4，夹 80..280；越亲近越留得住。
 *   glints       眼波量：基础 14 + 特攻 × 0.15，凝视 ×1.15，夹 10..32；心神越盛，画面里的眼波越多。
 *   tempo        起手：基础 5 − (速度 − 60) × 0.02（只取正值），凝视 +3，夹 3..10；速度越快越早睁眼。
 *   recover      收招：基础 4 + 碰撞箱高度 × 1.1，夹 3..8。
 *   recharge     冷却：基础 70 − 等级 × 0.2，凝视 +18，夹 45..110。PP 30。
 */
namespace PokemonSkills {
    export const babydolleyesId = "babydolleyes";
    export const babydolleyesScene = "world_combat:move_babydolleyes";
    export const babydolleyesEffect = "world_combat:babydoll_eyes";
    export const babydolleyesMark = "world_combat:babydolleyes_mark";
    export const babydolleyesStatus = "charmed";
    export const babydolleyesGazeText = "world_combat.move.babydolleyes.text.gaze";
    export const babydolleyesBlockedText = "world_combat.move.babydolleyes.text.blocked";

    actionParameters.define(babydolleyesId, {
        drop: formula(
            F.when(F.pref("stare", text("worldcombat.skill.babydolleyes.preference.stare")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "攻击下降", {
                unit: " 级",
                description: "被圆瞳看软者损失的攻击等级；凝视卸 2 级，疾视只卸 1 级。"
            }),
        gazeRange: formula(
            F.base(3.5).plus(F.body("height").times(0.8))
                .times(F.when(F.pref("stare", text("worldcombat.skill.babydolleyes.preference.stare")), F.const(1.25), F.const(1)))
                .clamp(3, 7).round(1),
            "凝视距离", {
                unit: " 格",
                description: "圆瞳能被看见、能被看软的距离；身形越高够得越远，凝视明显更远，也是玩家瞄准能接受的范围。"
            }),
        softenTicks: seconds(
            F.base(100).plus(F.individual("friendship").times(0.9))
                .times(F.when(F.pref("stare", text("worldcombat.skill.babydolleyes.preference.stare")), F.const(1.4), F.const(1)))
                .clamp(80, 280).round(0),
            "心软时长", "对手下不去手多久；施法者越亲近留得越久，凝视更长。"),
        glints: formula(
            F.base(14).plus(F.stat("specialAttack").times(0.15))
                .times(F.when(F.pref("stare", text("worldcombat.skill.babydolleyes.preference.stare")), F.const(1.15), F.const(1)))
                .clamp(10, 32).round(0),
            "眼波量", {
                unit: " 点",
                description: "一次圆瞳洒出的眼波光点数量；心神越盛的施法者越多，画面里的眼波与它一致。"
            }),
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("stare", text("worldcombat.skill.babydolleyes.preference.stare")), F.const(3), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "睁圆眼睛需要多久；速度越快越早，凝视要多花几刻，先手优势随之变小。"),
        recover: seconds(
            F.base(4).plus(F.body("height").times(1.1)).clamp(3, 8).round(0),
            "收招", "看一眼之后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(70).minus(F.level().times(0.2))
                .plus(F.when(F.pref("stare", text("worldcombat.skill.babydolleyes.preference.stare")), F.const(18), F.const(0)))
                .clamp(45, 110).round(0),
            "冷却", "两次圆瞳之间的等待；等级越高越熟练，凝视更费力。PP 30。")
    });

    describe(babydolleyesId, [
        { key: "description.0", values: ["drop","softenTicks"] },
        { key: "description.1", values: ["gazeRange"] },
        { key: "stare.on", values: ["tempo","recharge"], when: function (context) { return read(context.detail.values, ["stare"]) === true; } },
        { key: "stare.off", values: [], when: function (context) { return read(context.detail.values, ["stare"]) !== true; } },
        { key: "description.2", values: ["tempo", "recover"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
