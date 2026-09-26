/** 原地庆典按圈内真实敌方死亡产生额外可拾取钱币。 */
namespace PokemonSkills {
    actionParameters.define("happyhour", {
        /** 光环时长：300 + 等级(≥25)偏移[0,240]；铺张 ×0.8；夹 180..600。 */
        banner: seconds(
            F.base(300)
                .plus(F.level().minus(25).times(4).clamp(0, 240))
                .times(F.when(F.pref("lavish", text("worldcombat.skill.happyhour.preference.lavish")), F.const(0.8), F.const(1)))
                .clamp(180, 600).round(0),
            "光环时长", "这场庆典亮多久；等级越高撑得越久，铺张式换来更短的窗口。"),
        /** 每次战果的进项：4 + 等级(≥25)偏移[0,5] + 亲密度(≥70)偏移[0,3]；铺张 ×1.4；夹 3..14。 */
        purse: formula(
            F.base(4)
                .plus(F.level().minus(25).times(0.08).clamp(0, 5))
                .plus(F.individual("friendship").minus(70).times(0.02).clamp(0, 3))
                .times(F.when(F.pref("lavish", text("worldcombat.skill.happyhour.preference.lavish")), F.const(1.4), F.const(1)))
                .clamp(3, 14).round(0),
            "每次进项", {
                unit: "枚",
                description: "圈内每倒下一名非友方，当场爆出的 Relic Coin 枚数；等级与亲密度越高赚得越多，铺张式再放大四成。"
            }),
        /** 光环半径：4.5 + 体宽偏移[0,2]；铺张 ×1.15；夹 3.5..7。 */
        radius: formula(
            F.base(4.5)
                .plus(F.body("width").minus(0.9).times(2).clamp(0, 2))
                .times(F.when(F.pref("lavish", text("worldcombat.skill.happyhour.preference.lavish")), F.const(1.15), F.const(1)))
                .clamp(3.5, 7).round(2),
            "光环半径", {
                unit: "格",
                description: "金色庆典铺开的半径；身板越宽铺得越开，也是本招的实际感应范围。"
            }),
        /** 金光数量：20 + 等级(≥25)偏移[0,20]；夹 14..44。 */
        motes: formula(
            F.base(20).plus(F.level().minus(25).times(0.5).clamp(0, 20)).clamp(14, 44).round(0),
            "金光数量", {
                unit: "点",
                description: "庆典里翻涌的金星数量；等级越高越热闹，也是画面里金光的发射量来源。"
            }),
        /** 起手：10 − 速度偏移[−1.5,2] + 铺张 2；夹 6..14。 */
        tempo: seconds(
            F.base(10)
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("lavish", text("worldcombat.skill.happyhour.preference.lavish")), F.const(2), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "张罗这场庆典的时间；速度越快越短，铺张式要多摆一会儿。"),
        /** 收招：8 − 速度偏移[−1.5,2]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "收招", "庆典礼成后收势的时间；速度越快越利落。"),
        /** 冷却：70 − 等级(≥25)偏移[0,14]；铺张 ×1.15 / 长摆 ×0.95；夹 40..110。 */
        recharge: seconds(
            F.base(70).minus(F.level().minus(25).times(0.28).clamp(0, 14))
                .times(F.when(F.pref("lavish", text("worldcombat.skill.happyhour.preference.lavish")), F.const(1.15), F.const(0.95)))
                .clamp(40, 110).round(0),
            "冷却", "两次庆典之间的等待；等级越高回得越快，铺张式更费。")
    });

    stages("happyhour", [
        { level: 35, values: { motes: 28, banner: 360 } },
        { level: 50, values: { purse: 6, radius: 5.2, banner: 420 } }
    ]);

    describe("happyhour", [
        { key: "description.0", values: ["banner", "radius"] },
        { key: "description.1", values: ["purse"] },
        { key: "description.stay", values: [] },
        { key: "lavish.on", values: [], when: function (context) { return read(context.detail.values, ["lavish"]) === true; } },
        { key: "lavish.off", values: [], when: function (context) { return read(context.detail.values, ["lavish"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.banner"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.purse", "tier.1.radius", "tier.1.banner"] }
    ]);
}
