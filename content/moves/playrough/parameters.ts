/**
 * 嬉闹 / playrough —— 参数与伤害段。
 *
 * 原生事实：Fairy／物理／威力 90／命中 90／PP 10／接触；10%% 概率使目标攻击下降 1 级
 *   （Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「与对手嬉闹并攻击」落成一记**滚翻扑撞的撒欢**——压低身子冲上去、用整个身体把对手撞得
 * 人仰马翻，撞翻一个若旁边还站着别人，就顺势再翻过去滚第二下；被撞翻的人攻击下降。它自己撞得远、
 * 撞得动，是本组唯一会移动的物理招，身份是「滚翻」而不是「站定一记」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   romp       扑撞威力：物攻定这一撞的分量。
 *   tumble     翻滚威力：撞翻后再翻到旁边那一下，由物攻决定，比第一下轻。
 *   lunge      扑撞距离：速度决定扑出去多远，也决定实际射程。
 *   cruise     扑撞速度：速度决定翻滚得多快。
 *   radius     判定半径：体型高度决定滚动的身子多粗。
 *   push       撞飞距离：自身重量决定把对手顶开多远（沉的人撞得动）。
 *   atkChance  降攻概率：原生 10%% 起，物攻与等级提高，撒欢式降低。
 *   atkStages  降攻级数：固定 1 级。
 *   bounceRange 翻身范围：速度决定撞翻后还能翻到多远的另一个目标。
 *   sparkles   彩色纸屑数：物攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `romp`（撒欢）双向取舍：开启＝扑得更远、撞得更快、顶得更开、翻身范围更大、起手与冷却更短，
 * 但两下都更轻、降攻概率更低；关闭（实撞）＝更短的一撞、两下都更重、更容易把对手撞得攻击下降。
 *
 * 伤害段 `romp`（第一下）与 `tumble`（翻身第二下）走共享换算（原始类别 Physical），均带 contact。
 */
namespace PokemonSkills {
    export const playroughId = "playrough";
    export const playroughScene = "world_combat:move_playrough";
    export const playroughDownText = "world_combat.move.playrough.text.down";
    export const playroughAtkText = "world_combat.move.playrough.text.atk";
    export const playroughMissText = "world_combat.move.playrough.text.miss";

    actionParameters.define(playroughId, {
        /** 扑撞威力：64 + 物攻偏移[−14,34] + 等级(≥25)偏移[0,12]，撒欢 ×0.9；夹 44..120。 */
        romp: formula(
            F.base(64)
                .plus(F.stat("attack").minus(60).times(0.28).clamp(-14, 34))
                .plus(F.level().minus(25).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("romp"), F.const(0.9), F.const(1)))
                .clamp(44, 120).round(1),
            "扑撞威力", {
                unit: "威力",
                description: "第一下扑撞的基础威力；物攻越高撞得越狠，撒欢式把这一下摊薄到滚动里。对手防御、相性与暴击在命中时另算。"
            }),
        /** 翻滚威力：30 + 物攻偏移[−6,16]，撒欢 ×1.1；夹 18..58。 */
        tumble: formula(
            F.base(30)
                .plus(F.stat("attack").minus(60).times(0.14).clamp(-6, 16))
                .times(F.when(F.pref("romp"), F.const(1.1), F.const(1)))
                .clamp(18, 58).round(1),
            "翻滚威力", {
                unit: "威力",
                description: "把第一个目标撞翻后，再翻到旁边另一个目标那一下的基础威力；物攻越高越重，撒欢式把力量分给滚动。"
            }),
        /** 扑撞距离：3.0 + 速度偏移[−0.2,0.6]，撒欢 ×1.25；夹 2.4..4.4。 */
        lunge: formula(
            F.base(3.0)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.6))
                .times(F.when(F.pref("romp"), F.const(1.25), F.const(1)))
                .clamp(2.4, 4.4).round(2),
            "扑撞距离", {
                unit: "格",
                description: "这一记扑撞能冲多远；速度快的个体扑得更远，撒欢式滚得更开。它也是本招的实际射程来源。"
            }),
        /** 扑撞速度：0.55 + 速度偏移[−0.05,0.15]，撒欢 ×1.1；夹 0.45..0.8。 */
        cruise: formula(
            F.base(0.55)
                .plus(F.stat("speed").minus(55).times(0.004).clamp(-0.05, 0.15))
                .times(F.when(F.pref("romp"), F.const(1.1), F.const(1)))
                .clamp(0.45, 0.8).round(2),
            "扑撞速度", {
                unit: "格/刻",
                description: "扑撞每一刻推进的距离；速度越快翻滚越急，目标越难走位躲开。"
            }),
        /** 判定半径：0.45 + 碰撞箱高度偏移[−0.06,0.2]，撒欢 ×1.1；夹 0.38..0.72。 */
        radius: formula(
            F.base(0.45)
                .plus(F.body("height").minus(1.4).times(0.08).clamp(-0.06, 0.2))
                .times(F.when(F.pref("romp"), F.const(1.1), F.const(1)))
                .clamp(0.38, 0.72).round(2),
            "判定半径", {
                unit: "格",
                description: "滚动途中撞到东西的判定粗细；体型越高身子越粗，撒欢式滚得更胀。"
            }),
        /** 撞飞距离：1.0 + 体重偏移[−0.2,0.8]，撒欢 ×1.25；夹 0.6..2.2。 */
        push: formula(
            F.base(1.0)
                .plus(F.body("weight").minus(30).times(0.004).clamp(-0.2, 0.8))
                .times(F.when(F.pref("romp"), F.const(1.25), F.const(1)))
                .clamp(0.6, 2.2).round(2),
            "撞飞距离", {
                unit: "格",
                description: "被撞到的人被顶开多远；自己越沉撞得越动，撒欢式滚得更远。"
            }),
        /** 降攻概率：10% + 物攻偏移[−4%,12%] + 等级偏移[0,5%]，撒欢 ×0.75；夹 6%..32%。 */
        atkChance: percent(
            F.base(0.10)
                .plus(F.stat("attack").minus(60).times(0.0014).clamp(-0.04, 0.12))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.05))
                .times(F.when(F.pref("romp"), F.const(0.75), F.const(1)))
                .clamp(0.06, 0.32).round(3),
            "降攻概率", "每撞到一个目标时让它的攻击下降 1 级的概率；原生 10% 起，物攻与等级越高越容易，撒欢式把力气花在滚动上所以更低。"),
        /** 降攻级数：固定 1 级。 */
        atkStages: formula(
            F.base(1),
            "降攻级数", {
                unit: "级",
                description: "一次撞翻让目标攻击下降的能力等级。"
            }),
        /** 翻身范围：3.2 + 速度偏移[0,1.4]，撒欢 ×1.3；夹 2.6..5.5。 */
        bounceRange: formula(
            F.base(3.2)
                .plus(F.stat("speed").minus(55).times(0.03).clamp(0, 1.4))
                .times(F.when(F.pref("romp"), F.const(1.3), F.const(1)))
                .clamp(2.6, 5.5).round(2),
            "翻身范围", {
                unit: "格",
                description: "撞翻第一个目标后，还能翻到多远处站着的另一个敌人；速度快的个体滚得更远，撒欢式范围更大。"
            }),
        /** 前探系数：固定 1.15；每刻按本刻位移的多少向前探路，决定判定的稳妥程度。 */
        traceAhead: formula(
            F.base(1.15),
            "前探系数", {
                unit: "倍",
                description: "每刻沿本刻位移向前多探出的比例，避免高速滚动穿过目标；固定值，不随精灵数据变化。"
            }),
        /** 彩色纸屑数：12 + 物攻偏移[0,18] + 等级(≥20)偏移[0,10]；夹 12..42。 */
        sparkles: formula(
            F.base(12)
                .plus(F.stat("attack").minus(60).times(0.12).clamp(0, 18))
                .plus(F.level().minus(20).times(0.3).clamp(0, 10))
                .clamp(12, 42).round(0),
            "彩色纸屑数", {
                unit: "点",
                description: "撞翻时炸开的彩色纸屑数量，随物攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：8 − 速度偏移[−2.5,3]，撒欢 −1；夹 4..12。 */
        tempo: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-2.5, 3))
                .minus(F.when(F.pref("romp"), F.const(1), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "压低身子起滚的时间；速度越快越短，撒欢式起得更快。"),
        /** 收招：8 − 速度偏移[−1.5,3]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 3)).clamp(5, 12).round(0),
            "收招", "滚完站稳的收势；速度越快越利落。"),
        /** 冷却：26 − 速度偏移[−4,7]，撒欢 −3；夹 16..40。 */
        recharge: seconds(
            F.base(26)
                .minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7))
                .minus(F.when(F.pref("romp"), F.const(3), F.const(0)))
                .clamp(16, 40).round(0),
            "冷却", "再次撒欢前的等待；速度越快回得越快，撒欢式循环更顺。")
    });

    defineDamage(playroughId, "romp", {}, { contact: true });
    defineDamage(playroughId, "tumble", {}, { contact: true });

    stages(playroughId, [
        { level: 32, values: { romp: 74, tumble: 34 } },
        { level: 48, values: { romp: 82, atkChance: 0.18 } }
    ]);

    describe(playroughId, [
        { key: "description.0", values: ["romp", "tumble", "bounceRange"] },
        { key: "description.1", values: ["atkChance", "atkStages"] },
        { key: "description.2", values: ["lunge", "cruise", "push"] },
        { key: "romp.on", values: [], when: function (context) { return read(context.detail.values, ["romp"]) === true; } },
        { key: "romp.off", values: [], when: function (context) { return read(context.detail.values, ["romp"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.romp", "tier.0.tumble"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.romp", "tier.1.atkChance"] }
    ]);
}
