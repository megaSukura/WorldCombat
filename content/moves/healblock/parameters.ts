/**
 * 回复封锁 / healblock —— 第 159 组「资源线的封锁与转手」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：超能力、变化、威力 —、命中 100、PP 15、相邻的全体敌人；
 *   `volatileStatus: healblock`，持续 5 回合：无法通过招式、特性或携带的道具回复 HP。
 * - 即时战斗翻译：一道镇住回复的紫环套在目标身上——在这段时间里，任何往回涨的生命都被环抽走、按回原位。
 *   单体、跟随，封的是「回血」这条线。治疗后手（回复、吸取、特性回血）最怕它。
 * - 与同组分开：查封（embargo）封的是道具通道，腐蚀气体（corrosivegas）是范围里当场溶毁道具，
 *   传递礼物（bestow）是把道具送出去。回复封锁只封住目标一个人的回血，不动道具分毫。
 *
 * 参数分散到精灵数据：时长取等级（熟练）与特防（镇得稳），射程取体型高度与等级，环大小取体型高度，
 * 起手取速度，收招取特防，冷却取等级，锁环数取特攻，镇条数取等级。配置 hold 双向取舍。本招不造成伤害。
 */
namespace PokemonSkills {
    export const healBlockScene = "world_combat:move_healblock";
    export const healBlockEffect = "world_combat:healblock";
    export const healBlockStatus = "healblock";
    export const healBlockTextDenied = "world_combat.move.healblock.text.denied";
    export const healBlockTextOpen = "world_combat.move.healblock.text.open";
    export const healBlockTextBreak = "world_combat.move.healblock.text.break";
    export const healBlockTextSeal = "world_combat.move.healblock.text.seal";
    export const healBlockTextMiss = "world_combat.move.healblock.text.miss";

    actionParameters.define("healblock", {
        /** 封锁时长：基础 200 刻；等级每级 +2.4（夹 48..192），特防每 1 点 +0.8（夹 16..96）；
         *  hold 开 ×1.35、关 ×0.75；夹在 120..560 刻。 */
        lock: seconds(
            F.base(200)
                .plus(F.level().times(2.4).as("等级"))
                .plus(F.stat("specialDefence").times(0.8).as("特防"))
                .times(F.when(F.pref("hold"), F.const(1.35), F.const(0.75)).as("镇法"))
                .clamp(120, 560).round(0),
            "封锁时长", "这道紫环把目标的回血按住多久；等级与特防越高越久，久镇 ×1.35、急镇 ×0.75。到期自动松开。"),
        /** 施放距离：基础 10 格；体型高度每比 1.4 高 1 格 +0.4，20 级起每级 +0.06；夹在 7..15 格。 */
        reach: formula(
            F.base(10)
                .plus(F.body("height").minus(1.4).times(0.4).as("体型"))
                .plus(F.level().minus(20).max(0).times(0.06).as("等级"))
                .clamp(7, 15).round(1),
            "施放距离", { unit: " 格", description: "能把紫环送到多远；个头越大、等级越高够得越远。它也是本招实际射程的来源。" }),
        /** 环大小：基础 0.34 格；体型高度每比 1.4 高 1 格 +0.1；夹在 0.24..0.6 格。 */
        radius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.1).as("体型")).clamp(0.24, 0.6).round(2),
            "环大小", { unit: " 格", description: "套在目标身上的镇环大小；个头越大环越大，判定与画面按它铺开。" }),
        /** 起手：基础 12 刻，速度每点 −0.05 刻；夹在 7..15 刻。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.05).as("速度")).clamp(7, 15).round(0),
            "起手", "把镇环拢起来需要多久；速度越快起得越短。"),
        /** 收招：基础 8 刻，特防每点 −0.02 刻；夹在 5..11 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("specialDefence").times(0.02).as("特防")).clamp(5, 11).round(0),
            "收招", "套上镇环后的收势；特防越稳收得越快。"),
        /** 冷却：基础 100 刻 − 等级 ×0.6；hold 开 +16、关 −10；夹在 60..130 刻。 */
        recharge: seconds(
            F.base(100).minus(F.level().times(0.6).as("等级"))
                .plus(F.when(F.pref("hold"), F.const(16), F.const(-10)).as("镇法"))
                .clamp(60, 130).round(0),
            "冷却", "两次回复封锁之间的等待；久镇更长、急镇更短，等级越高越熟练。"),
        /** 锁环数量：基础 10 个，特攻每 9 点 +1；夹在 8..22 个。 */
        rings: formula(
            F.base(10).plus(F.stat("specialAttack").div(9).as("特攻")).clamp(8, 22).round(0),
            "锁环数量", { unit: " 个", description: "套在目标身上收紧的镇环数量；特攻越高越多，粒子按它发射。" }),
        /** 镇条数量：基础 8 条，等级每 5 级 +1；夹在 8..20 条。 */
        veils: formula(
            F.base(8).plus(F.level().div(5).as("等级")).clamp(8, 20).round(0),
            "镇条数量", { unit: " 条", description: "从施法者手中飞出的紫条数量；等级越高越多，驱动飞行粒子。" })
    });

    stages("healblock", [
        { level: 30, values: { lock: 260 } },
        { level: 50, values: { lock: 320, rings: 16 } }
    ]);

    describe("healblock", [
        { key: "description.0", values: ["lock", "reach"] },
        { key: "description.1", values: ["radius", "rings"] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lock"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lock", "tier.1.rings"] }
    ]);
}
