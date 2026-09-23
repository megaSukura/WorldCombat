/**
 * 聚宝功 / payday —— 参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 40／命中 100／PP 20／目标单体／无附加效果／flags protect、mirror、metronome；
 *   原作另有一层「战斗结束后在身上留下金币」的战后奖励。
 *
 * 翻译：把「向对手投掷小金币」落成一记**撒币点射**——施法者把一小把钱在手里掂亮，随手朝目标甩出去；
 *   币串打在它身上（物理伤害），打偏和打剩的落在落点周围，是世界里真能捡的 `cobblemon:relic_coin`。
 *   本世界没有金币货币结算，战后奖励就用「落在场上、谁都能捡的真硬币」兑现：这招留下的东西就是它的念头。
 *   它是金币二式里**便宜、快、单发**的那一个：金币少而实，靠出手频率和留下的零钱施压。
 *
 * 数据分散（每项依赖不同的精灵数据，小差距因此会变成场上可见的差别）：
 *   coin        单发威力：物攻定甩币的力道，等级定币串的分量。
 *   coins       撒出的币数：速度决定一把能甩出几枚；它同时是云端与地面金光的发射量来源。
 *   scatter     落在落点、能捡起的真币数：等级与物攻共同决定（打得越狠、越老练，留下的越多）。
 *   throwSpeed  币串初速：速度决定飞得急不急。
 *   radius      飞行判定半径：碰撞箱高度决定币串的大小。
 *   reach       射程：速度决定能把币甩多远；它也是本招的实际射程来源。
 *   fling       散落初速：速度决定落地金币被甩开多远。
 *   tempo       起手：速度决定掂币出手的快慢。
 *   aftercast   收招：速度决定收势。
 *   wait        冷却：等级决定熟练度（越高越短）。
 *
 * 配置 `largesse`（大把撒钱）双向取舍：开启＝一次撒出的币数 ×1.5、落地真币 ×1.4，画面与场上都更阔，
 *   但单发威力 ×0.82、起手 +2 刻、冷却 +6 刻；关闭＝一手重币，出手更快、单发更痛、散钱较少。
 *   两向各有适用局面（用零钱铺场 vs. 用便宜单发换血）。
 *
 * 伤害段 `coin` 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("payday", {
        coin: formula(
            F.base(40)
                .plus(F.stat("attack").minus(50).times(0.22).clamp(-8, 26))
                .plus(F.level().minus(20).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("largesse", text("worldcombat.skill.payday.preference.largesse")), F.const(0.82), F.const(1)))
                .clamp(28, 78).round(1),
            "单发威力", {
                unit: "威力",
                description: "一把金币打在目标身上那一下的基础威力；物攻越高甩得越实，等级让币串更沉。对手防御、相性与暴击在命中时另算。"
            }),
        coins: formula(
            F.base(6)
                .plus(F.stat("speed").minus(50).times(0.12).clamp(-2, 14))
                .times(F.when(F.pref("largesse", text("worldcombat.skill.payday.preference.largesse")), F.const(1.5), F.const(1)))
                .clamp(5, 30).round(0),
            "撒出的币数", {
                unit: "枚",
                description: "一次甩向目标的币数；速度越快撒得越密。它同时决定命中时金光与云端币影的发射量。"
            }),
        scatter: formula(
            F.base(3)
                .plus(F.level().minus(20).times(0.08).clamp(0, 4))
                .plus(F.stat("attack").minus(50).times(0.01).clamp(0, 3))
                .times(F.when(F.pref("largesse", text("worldcombat.skill.payday.preference.largesse")), F.const(1.4), F.const(1)))
                .clamp(2, 12).round(0),
            "落地真币", {
                unit: "枚",
                description: "打偏和打剩、真正落在落点周围能捡起的 Relic Coin 枚数；等级与物攻越高留得越多。"
            }),
        throwSpeed: formula(
            F.base(1.2).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.2, 0.5)).clamp(0.9, 1.8).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "币串脱手时的初速；速度快的个体甩得更急，目标更难走位躲开。"
            }),
        radius: formula(
            F.base(0.18).plus(F.body("height").minus(1.4).times(0.05)).clamp(0.16, 0.38).round(2),
            "判定半径", {
                unit: "格",
                description: "币串飞行与命中的判定半径；体型越高币串越大。"
            }),
        reach: formula(
            F.base(12).plus(F.stat("speed").minus(50).times(0.05).clamp(-2, 4)).clamp(9, 17).round(1),
            "射程", {
                unit: "格",
                description: "能把金币甩到多远；速度高甩得远。它也是本招的实际射程来源。"
            }),
        fling: formula(
            F.base(0.25).plus(F.stat("speed").minus(50).times(0.003).clamp(-0.05, 0.15)).clamp(0.18, 0.5).round(2),
            "散落初速", {
                unit: "格/刻",
                description: "落地金币被甩开的初速；速度决定零钱撒得开不开。"
            }),
        tempo: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(50).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("largesse", text("worldcombat.skill.payday.preference.largesse")), F.const(2), F.const(0)))
                .clamp(5, 12).round(0),
            "起手", "掂亮手里这把钱再甩出的时间；速度越快越短，大把撒钱要多花一点。"),
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.02).clamp(-1.5, 2)).clamp(5, 10).round(0),
            "收招", "甩完一轮站稳的收势；速度越快越利落。"),
        wait: seconds(
            F.base(22)
                .minus(F.level().minus(20).times(0.05).clamp(-2, 6))
                .plus(F.when(F.pref("largesse", text("worldcombat.skill.payday.preference.largesse")), F.const(6), F.const(0)))
                .clamp(16, 30).round(0),
            "冷却", "再次掂币出手前的等待；等级越高越熟练，大把撒钱蓄得更久。")
    });

    defineDamage("payday", "coin", {});

    stages("payday", [
        { level: 30, values: { coin: 48, coins: 8 } },
        { level: 46, values: { coin: 56, scatter: 5 } }
    ]);

    describe("payday", [
        { key: "description.0", values: ["coin"] },
        { key: "description.1", values: ["reach", "throwSpeed"] },
        { key: "description.2", values: ["scatter", "fling"] },
        { key: "largesse.on", values: [], when: function (context) { return read(context.detail.values, ["largesse"]) === true; } },
        { key: "largesse.off", values: [], when: function (context) { return read(context.detail.values, ["largesse"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.coin"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.coin", "tier.1.scatter"] }
    ]);
}
