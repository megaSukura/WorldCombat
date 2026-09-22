/**
 * 龙声鼓舞 / Dragon Cheer —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Dragon、变化、威力 0、命中必中、PP 15、优先度 0、目标 adjacentAlly；
 *   volatileStatus dragoncheer，`onModifyCritRatio` 普通 +1、龙属性目标 +2；与 volatileStatus focusenergy 互斥
 *   （onStart 时若目标已带聚气则施加失败）。
 *
 * 世界化：不是「给邻位队友加一个 volatile」，而是**一声龙吟般的鼓舞压过战场**：施法者从胸腔里吼出这道声浪，
 *   沿地面推成一圈圈光波，罩住半径内所有友方（含自己），给他们一段可见的士气窗口（共享身份
 *   world_combat:status/dragoncheer）；龙属性的友方被激得最狠——同一身份、更高的附加要害概率。它是这一族里
 *   唯一**成片施于队友**的一招，与聚气的「只作用于自己的深呼吸」互为反面。原生「+1／龙属性 +2 要害等级」落成
 *   两档附加概率。与聚气互斥：已聚气的队友不会被鼓舞（原生同一份 volatile 不能并存），跳过他们。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   cheerTicks  士气时长：基础 220 刻 + 亲密度×0.5 + 特防×0.4；长啸 ×1.25／短吼 ×0.8；夹 160..560；
 *               等级由成长阶梯另加。感情与定力越足，这声吼压得越久。
 *   cheerRadius 鼓舞半径：基础 3.8 格 + 身高×0.8 + 特攻×0.01；长啸 ×1.15／短吼 ×0.9；夹 3..8.5。身板与气势越大，声浪铺得越广。
 *   cheerChance 普通附加比例：基础 22% + 特攻×0.0005；长啸 ×1.1／短吼 ×0.9；夹 18%..45%。非龙属性友方多出的要害概率。
 *   dragonChance 龙属性附加比例：基础 45% + 特攻×0.0006 + 等级×0.001；夹 40%..80%。龙属性友方多出的要害概率，始终更高。
 *   motes       鼓舞光点：基础 24 + 特攻×0.1 + 等级×0.2；夹 18..64。气势越大，一次鼓舞飞出的光点越多，粒子按它发射。
 *   waves       声浪圈数：基础 2 + 等级÷22；夹 2..4。等级越高，声浪多推几圈。
 *   tempo       起手：基础 9 刻 − 速度×0.02，长啸再 +4；夹 5..16。越快的个体吼得越利落，长啸更慢。
 *   aftercast   收招：基础 6 刻 + 碰撞箱高×0.9；夹 5..11。
 *   wait        冷却：基础 130 刻 − 等级×0.5，长啸 ×1.2／短吼 ×0.85；夹 70..180。PP 15 的代价。
 * 配置 roar（长啸）双向取舍：长啸＝半径 ×1.15、时长 ×1.25、附加比例更高，但起手 +4 刻、冷却 ×1.2，适合开打前一次罩住全队；
 *   短吼＝半径 ×0.9、时长 ×0.8、附加比例略低，换来起手与冷却都更低，适合拉锯里随时补士气。两个方向各有局面。
 */
namespace PokemonSkills {
    export const dragonCheerId = "dragoncheer";
    export const dragonCheerScene = "world_combat:move_dragoncheer";
    export const dragonCheerEffect = "world_combat:dragon_cheer";
    export const dragonCheerMark = "world_combat:dragoncheer_mark";
    export const dragonCheerStatus = "dragoncheer";
    export const dragonCheerReadyText = "world_combat.move.dragoncheer.text.ready";
    export const dragonCheerRallyText = "world_combat.move.dragoncheer.text.rally";
    export const dragonCheerFadeText = "world_combat.move.dragoncheer.text.fade";

    actionParameters.define(dragonCheerId, {
        /** 士气时长：亲密度与特防决定这声吼压多久，长啸更久。 */
        cheerTicks: seconds(
            F.base(220).plus(F.individual("friendship").times(0.5)).plus(F.stat("specialDefence").times(0.4))
                .times(F.when(F.pref("roar", text("worldcombat.skill.dragoncheer.preference.roar")), F.const(1.25), F.const(0.8)))
                .clamp(160, 560).round(0),
            "士气时长", "这声鼓舞在友方身上留多久；越亲近、定力越足压得越久，长啸明显更长。"),
        /** 鼓舞半径：身高与特攻决定声浪铺多广。 */
        cheerRadius: formula(
            F.base(3.8).plus(F.body("height").times(0.8)).plus(F.stat("specialAttack").times(0.01))
                .times(F.when(F.pref("roar", text("worldcombat.skill.dragoncheer.preference.roar")), F.const(1.15), F.const(0.9)))
                .clamp(3, 8.5).round(2),
            "鼓舞半径", {
                unit: " 格",
                description: "声浪罩住多大一圈友方；身板越高大、气势越足铺得越广，长啸更远。它也是判定半径。"
            }),
        /** 普通附加比例：非龙属性友方多出的要害概率。 */
        cheerChance: percent(
            F.base(0.22).plus(F.stat("specialAttack").times(0.0005))
                .times(F.when(F.pref("roar", text("worldcombat.skill.dragoncheer.preference.roar")), F.const(1.1), F.const(0.9)))
                .clamp(0.18, 0.45),
            "普通附加比例", "非龙属性友方在这段时间内每次伤害命中多出的要害概率；特攻越高越足，长啸更准。"),
        /** 龙属性附加比例：龙属性友方多出的要害概率，始终更高。 */
        dragonChance: percent(
            F.base(0.45).plus(F.stat("specialAttack").times(0.0006)).plus(F.level().times(0.001)).clamp(0.4, 0.8),
            "龙属性附加比例", "龙属性友方在这段时间内多出的要害概率；特攻与等级一起把它抬得更高，始终高于普通档。"),
        /** 鼓舞光点：气势越大越多。 */
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").times(0.1)).plus(F.level().times(0.2)).clamp(18, 64).round(0),
            "鼓舞光点", {
                unit: " 点",
                description: "一次鼓舞飞出的光点数量；特攻与等级越高越多，粒子按它发射。"
            }),
        /** 声浪圈数：等级越高多推几圈。 */
        waves: formula(
            F.base(2).plus(F.level().div(22)).clamp(2, 4).round(0),
            "声浪圈数", {
                unit: " 圈",
                description: "声浪推开几圈；等级越高越多，画面按它一圈圈铺开。"
            }),
        /** 起手：速度决定吼得多利落，长啸更慢。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("roar", text("worldcombat.skill.dragoncheer.preference.roar")), F.const(4), F.const(0)))
                .clamp(5, 16).round(0),
            "起手", "蓄足声势吼出去需要多久；速度越快越短，长啸更慢（也更容易被打断）。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(0.9)).clamp(5, 11).round(0),
            "收招", "吼完之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越短，长啸更长。 */
        wait: seconds(
            F.base(130).minus(F.level().times(0.5))
                .times(F.when(F.pref("roar", text("worldcombat.skill.dragoncheer.preference.roar")), F.const(1.2), F.const(0.85)))
                .clamp(70, 180).round(0),
            "冷却", "两次鼓舞之间的等待；等级越高越短，长啸更长。PP 15 的代价。")
    });

    stages(dragonCheerId, [
        { level: 25, values: { cheerTicks: 260 } },
        { level: 45, values: { cheerTicks: 320 } },
        { level: 65, values: { cheerTicks: 390 } }
    ]);

    describe(dragonCheerId, [
        { key: "description.0", values: ["cheerChance", "dragonChance"] },
        { key: "roar.on", values: ["tempo", "wait"], when: function (context) { return read(context.detail.values, ["roar"]) === true; } },
        { key: "roar.off", values: [], when: function (context) { return read(context.detail.values, ["roar"]) !== true; } },
        { key: "description.1", values: ["cheerTicks", "cheerRadius"] },
        { key: "description.2", values: ["motes", "waves"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cheerTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cheerTicks"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.cheerTicks"] }
    ]);
}
