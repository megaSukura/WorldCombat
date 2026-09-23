/**
 * 冷笑话 / chillyreception 的参数。
 *
 * 原生事实：Ice／变化／威力 —／命中 —／PP 10／讲一个冷到极点的笑话后与后备宝可梦替换；场上下雪 5 回合。
 * 世界化：这招的念头是「冷场的交接」——施法者抛出一句冷到没人接得住的话，全场安静下来：身边的敌人被这阵
 * 尴尬冻住（共享身份 `world_combat:status/cold_silence`，当前动作被打断、仇恨暂时松开），雪随之落下；
 * 施法者趁这片安静抽身退开，把场子留给下一只上来的伙伴。**有合法后备时由原生队伍操作收回自己、让后备在抽身落点登场；
 * 没有后备时保留可观察到的冷场与退场部分。**
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather         起手：基础 14 刻，速度每快 1 点减 0.05，夹在 9..22；话讲得越快，冷场越早。
 *   settle         收招：基础 10 刻，速度每快 1 点减 0.02，夹在 6..15。
 *   silenceRadius  冷场半径：基础 7 格 +（特攻超过 60）×0.02 +（身高超过 1.4）×1.2，再乘梗法系数，夹在 4..13。
 *   pauseTicks     冷场时长：基础 24 刻 +（特攻超过 60）×0.05，再乘梗法系数，夹在 12..44；敌人被打断多久。
 *   hushTicks      余冷：基础 40 刻 + 亲密度 ÷ 8，夹在 40..90；身份留多久，越亲近讲的梗越冷。
 *   snowRadius     雪区半径：基础 8 格 +（特攻超过 60）×0.015 +（身高超过 1.4）×1.0，再乘梗法系数，夹在 5..14。
 *   snowTicks      雪区持续：基础 260 刻 + 20 级起每级 4 刻，再乘梗法系数，夹在 180..460；比雪景短。
 *   snowDensity    雪花密度：基础 26 + 特攻 ÷ 9，再乘梗法系数，夹在 14..64；直接驱动粒子数量。
 *   withdraw       抽身距离：基础 6 格 +（速度超过 40）×0.05，夹在 4..10。
 * 配置 punchline 在「重梗」和「轻描淡写」之间取舍：重梗冷场更大更久、余冷更长，但雪更短、冷却更长；
 * 轻描淡写冷场更小，但雪下得更久、冷却更短。
 */
namespace PokemonSkills {
    export const chillyScene = "world_combat:move_chillyreception";
    export const chillyField = "world_combat:field/chillyreception";
    export const chillySnow = "world_combat:chillyreception_snow";
    export const chillySilence = "world_combat:cold_silence";
    export const chillyJokeText = "world_combat.move.chillyreception.text.joke";
    export const chillyHushText = "world_combat.move.chillyreception.text.hush";
    export const chillyBowText = "world_combat.move.chillyreception.text.bow";
    export const chillySwitchText = "world_combat.move.chillyreception.text.switch";
    // 语义天气：冷笑话留下的雪与雪景共用同一「正在下雪」的天气身份。
    WorldEnvironment.defineWeather("snow", { sunlight: 0.4 });

    actionParameters.define("chillyreception", {
        gather: seconds(F.base(14).plus(F.stat("speed").minus(40).max(0).times(0.05).clamp(0, 7)).clamp(9, 22),
            "起手", "把笑话讲完需要多少时间；速度越快，冷场来得越早。"),
        settle: seconds(F.base(10).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 5)).clamp(6, 15),
            "收招", "退开后的收势时间；速度越快越利落。"),
        silenceRadius: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).max(0).times(0.02))
                .plus(F.body("height").minus(1.4).max(0).times(1.2))
                .times(F.when(F.pref("punchline"), F.const(1.25), F.const(0.85)))
                .clamp(4, 13).round(2),
            "冷场半径", { unit: " 格", description: "笑话冷到多大的一片区域；特攻越高、体型越大越广，重梗 ×1.25、轻描淡写 ×0.85。" }),
        pauseTicks: seconds(
            F.base(24).plus(F.stat("specialAttack").minus(60).max(0).times(0.05))
                .times(F.when(F.pref("punchline"), F.const(1.3), F.const(0.8)))
                .clamp(12, 44).round(),
            "冷场时长", "身边的敌人被这阵尴尬冻住多久；特攻越高越久，重梗更久。"),
        hushTicks: seconds(
            F.base(40).plus(F.individual("friendship").div(8))
                .times(F.when(F.pref("punchline"), F.const(1.3), F.const(0.85)))
                .clamp(40, 90).round(),
            "余冷", "冷场的身份在敌人身上留多久；越亲近讲的梗越冷，重梗更久。"),
        snowRadius: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).max(0).times(0.015))
                .plus(F.body("height").minus(1.4).max(0).times(1.0))
                .times(F.when(F.pref("punchline"), F.const(1.15), F.const(0.9)))
                .clamp(5, 14).round(2),
            "雪区半径", { unit: " 格", description: "冷笑话带来的雪落满多大一片；特攻越高、体型越大越广。" }),
        snowTicks: seconds(
            F.base(260).plus(F.level().minus(20).max(0).times(4))
                .times(F.when(F.pref("punchline"), F.const(0.8), F.const(1.2)))
                .clamp(180, 460),
            "雪区持续", "这片雪下多久；轻描淡写更久（×1.2）、重梗更短（×0.8），等级提升会延长。"),
        snowDensity: formula(
            F.base(26).plus(F.stat("specialAttack").div(9))
                .times(F.when(F.pref("punchline"), F.const(1.3), F.const(0.85)))
                .clamp(14, 64).round(),
            "雪花密度", { unit: " 点", description: "雪区里雪花的数量；特攻越高铺得越密，粒子直接按它发射。" }),
        withdraw: formula(
            F.base(6).plus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(4, 10).round(2),
            "抽身距离", { unit: " 格", description: "趁冷场退开多远；速度越快退得越远。" })
    });

    stages("chillyreception", [{ level: 40, values: { cooldown: 140 } }, { level: 55, values: { cooldown: 120 } }]);
    describe("chillyreception", [
        { key: "description.0", values: ["silenceRadius","pauseTicks","hushTicks"] },
        { key: "description.1", values: ["snowRadius","snowTicks"] },
        { key: "description.2", values: ["withdraw"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
