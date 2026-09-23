/**
 * 长嚎 / howl 的参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 20、目标 self（第八世代起连同己方全员）、boosts { atk: +1 }。
 *
 * 核心念头：仰头一声长嗥，把身边整群伙伴的气势一起吼起来——声浪一圈圈荡开，被震到的伙伴身上升起一道向上的斗志，
 *   攻击一起抬高；嗥声在空气里回荡一阵，斗志也随之消散。
 *
 * 世界化：把「提高自己和同伴的攻击」翻成以自身为锚、以声浪半径覆盖友方的**集结窗口**：施法者与半径内的友方
 *   各抬攻击若干级（NativeEffects.boost，宝可梦与普通生物同一路径），并各挂共享身份 world_combat:status/howl
 *   的真实 MobEffect（物品栏可见、/effect 可用）；嗥声在窗口内每 20 刻向外回荡一次，把后来走进范围的伙伴也吼起来。
 *   窗口走完或被清除时，这段斗志抬起的等级原样收回——对手因此有一次拖过窗口的反制。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   raise     攻击等级：群嚎 1 级／独啸 2 级；夹 1..2。原生「+1 物攻」的对位，独啸把气势集中在自己身上。
 *   radius    声浪半径：基础 3 格 + 身高×0.8 + 等级×0.04；夹 1..6.5。身板大、等级高吼得越远，独啸只及自身。
 *   rallyTicks 集结时长：基础 220 刻 + 等级×2.5 + 物攻×0.35；夹 150..620。等级 35／50 阶梯再抬。
 *   motes     声点数量：基础 20 + 物攻×0.08 + 等级×0.2；夹 16..52。驱动画面密度。
 *   tempo     起手：基础 8 刻 − 速度×0.02；夹 4..12。
 *   aftercast 收招：基础 5 刻 + 身高×1.2；夹 5..10。
 *   wait      冷却：基础 120 刻 − 等级×0.5；夹 75..150。PP 20 的代价。
 * 配置 cry（嚎法）双向取舍：群嚎＝自己与半径内每个伙伴各 +1 级、范围大、窗口长，但起手 +1、冷却 ×1.1，单人所获较少；
 *   独啸＝只吼自己、+2 级、起手 −1、冷却 ×0.9，但完全不顾队友。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("howl", {
        /** 攻击等级：群嚎 1 级／独啸 2 级。 */
        raise: formula(
            F.when(F.pref("cry", text("worldcombat.skill.howl.preference.cry")), F.const(1), F.const(2)).clamp(1, 2).round(0),
            "攻击等级", {
                unit: " 级",
                description: "这声嗥把攻击抬高多少级；群嚎 1 级给全队，独啸 2 级只给自己。"
            }),
        /** 声浪半径：身板与等级决定吼得多远。 */
        radius: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.level().times(0.04))
                .times(F.when(F.pref("cry", text("worldcombat.skill.howl.preference.cry")), F.const(1), F.const(0.35)))
                .clamp(1.0, 6.5).round(2),
            "声浪半径", {
                unit: " 格",
                description: "嗥声能吼到多大一圈伙伴；身板越大、等级越高越远，独啸只及自身周围一小圈。"
            }),
        /** 集结时长：窗口走完攻击等级收回。 */
        rallyTicks: seconds(
            F.base(220).plus(F.level().times(2.5)).plus(F.stat("attack").times(0.35))
                .times(F.when(F.pref("cry", text("worldcombat.skill.howl.preference.cry")), F.const(1), F.const(0.8)))
                .clamp(150, 620).round(0),
            "集结时长", "斗志在身上撑多久；等级与物攻越高越久，独啸更短。窗口走完，这声嗥抬起的等级一并收回。"),
        /** 声点数量：物攻越高吼出的声点越多。 */
        motes: formula(
            F.base(20).plus(F.stat("attack").times(0.08)).plus(F.level().times(0.2)).clamp(16, 52).round(0),
            "声点数量", {
                unit: " 点",
                description: "声浪里迸出的声点数量；物攻与等级越高越密，也驱动画面密度。"
            }),
        /** 起手：越快越利落。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("cry", text("worldcombat.skill.howl.preference.cry")), F.const(1), F.const(-1)))
                .clamp(4, 12).round(0),
            "起手", "仰头蓄势到吼出需要多久；速度越快越短，独啸更利落。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 10).round(0),
            "收招", "嗥声落下之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("cry", text("worldcombat.skill.howl.preference.cry")), F.const(1.1), F.const(0.9)))
                .clamp(75, 150).round(0),
            "冷却", "两声长嚎之间的等待；等级越高越短，独啸更短。PP 20 的代价。")
    });

    stages("howl", [
        { level: 35, values: { rallyTicks: 360, wait: 100 } },
        { level: 50, values: { rallyTicks: 430, wait: 90 } }
    ]);

    describe("howl", [
        { key: "description.0", values: ["raise","radius"] },
        { key: "description.1", values: ["rallyTicks"] },
        { key: "cry.pack", values: [], when: function (context) { return read(context.detail.values, ["cry"]) === 1; } },
        { key: "cry.solo", values: [], when: function (context) { return read(context.detail.values, ["cry"]) !== 1; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rallyTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rallyTicks"] }
    ]);
}
