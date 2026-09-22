/**
 * 茶会 / Teatime —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 10、目标 all；
 *   onHitField：场上每个还站着的宝可梦，只要手里携带树果，就吃掉自己那一颗（敌我都算，最后再结算）。
 *
 * 世界化：在选定的地方铺开一席茶——杯盘排开、茶汤冒着热气；茶香一飘，场上每个带着树果的战斗者都忍不住
 *   吃掉自己那一颗（无论敌友）。它是一场**所有人的点心时间**：能让队友的果子立刻生效，也能逼对手把保命或
 *   反击的果子提前吃掉。它和同族的大快朵颐分开：那一口只吃自己的、换来防御；茶会逼所有人吃，收益取决于
 *   各自手里是什么果子。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   radius     茶席半径：基础 4.0 + 等级偏移 + 特防偏移，盛宴档 ×1.3、便茶档 ×0.8，夹 3.0..8.0 格。
 *   reach      茶席放多远：基础 5 + 等级偏移，盛宴档略近，夹 4..8 格。
 *   teaTicks   茶席停留：基础 100 刻 + 等级 + 亲密度偏移，盛宴档 ×1.4，夹 80..280 刻。
 *   brew       茶汤浓度（吃的人回复多少）：基础 0.9 + 特攻偏移，盛宴档 ×1.1，夹 0.7..1.25。
 *   motes      茶气数量：特攻 + 身高，夹 18..64 点，直接驱动粒子。
 *   cups       杯盘格数：基础 6 + 等级 + 身高，盛宴档 ×1.3，夹 5..14 格。
 *   tempo / aftercast / wait 分别读速度／身高／等级。
 * 配置 grand（盛宴）：半径 ×1.3、停留 ×1.4、杯盘 ×1.3、茶汤 ×1.1，代价是起手 +3 刻、冷却更久；
 *   关闭（便茶）半径 ×0.8、出手更快更省，适合只想尽快把对手的果子掀掉。两向各有局面。
 */
namespace PokemonSkills {
    export const teatimeId = "teatime";

    actionParameters.define(teatimeId, {
        /** 茶席半径：等级决定排场，特防决定茶香多远。 */
        radius: formula(
            F.base(4.0)
                .plus(F.level().minus(20).max(0).times(0.03).clamp(0, 1.0).as("等级"))
                .plus(F.stat("specialDefence").minus(55).times(0.004).clamp(-0.3, 0.6).as("特防"))
                .times(F.when(F.pref("grand"), F.const(1.3), F.const(0.8)).as("盛宴"))
                .clamp(3.0, 8.0).round(2),
            "茶席半径", { unit: " 格", description: "茶香罩到多远，圈内所有带树果的战斗者都会被招呼吃果；等级与特防越大越广，盛宴档 ×1.3、便茶档 ×0.8。" }),
        /** 施放距离：把茶席摆到多远。 */
        reach: formula(
            F.base(5).plus(F.level().minus(20).max(0).times(0.04).clamp(0, 1.2).as("等级"))
                .times(F.when(F.pref("grand"), F.const(0.95), F.const(1)).as("盛宴"))
                .clamp(4, 8).round(2),
            "施放距离", { unit: " 格", description: "茶席最远能摆到哪里；等级越高越远，盛宴档略近。" }),
        /** 茶席停留。 */
        teaTicks: seconds(
            F.base(100).plus(F.level().times(2)).plus(F.individual("friendship").minus(70).times(0.6).clamp(-18, 24).as("亲密度"))
                .times(F.when(F.pref("grand"), F.const(1.4), F.const(1)).as("盛宴"))
                .clamp(80, 280).round(0),
            "茶席停留", "茶席与茶气在原地停多久；等级越高、感情越好越久，盛宴档 ×1.4。结算在摆席当刻一次完成，之后只留画面。"),
        /** 茶汤浓度：吃的人回复多少。 */
        brew: formula(
            F.base(0.9).plus(F.stat("specialAttack").minus(55).times(0.003).clamp(-0.15, 0.3).as("特攻"))
                .times(F.when(F.pref("grand"), F.const(1.1), F.const(1)).as("盛宴"))
                .clamp(0.7, 1.25).round(3),
            "茶汤浓度", { unit: " 倍", description: "喝茶的人从果子里吸收到的回复量按这个倍数缩放；特攻越高茶沏得越浓，盛宴档 ×1.1。果子给的解异常与能力提升不受影响。" }),
        /** 茶气数量。 */
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").times(0.25)).plus(F.body("height").times(3)).clamp(18, 64).round(0),
            "茶气数量", { unit: " 点", description: "茶席上蒸腾的茶气粒子总数；特攻与体型越大越多。" }),
        /** 杯盘格数。 */
        cups: formula(
            F.base(6).plus(F.level().minus(20).max(0).times(0.1).clamp(0, 2)).plus(F.body("height").minus(1.2).times(1.5).clamp(0, 3))
                .times(F.when(F.pref("grand"), F.const(1.3), F.const(1)).as("盛宴"))
                .clamp(5, 14).round(0),
            "杯盘格数", { unit: " 格", description: "在落点真的铺下几格茶席（地毯）；等级越高、身量越大摆得越多，盛宴档 ×1.3。" }),
        /** 起手。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("grand"), F.const(3), F.const(0)).as("盛宴"))
                .clamp(5, 15).round(0),
            "起手", "摆席、温茶之前的准备；速度越快越利落，盛宴档多花 3 刻。"),
        /** 收招。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.2)).clamp(6, 10).round(0),
            "收招", "茶会散场后的收势；身板越大收得稍慢。"),
        /** 冷却。 */
        wait: seconds(
            F.base(150).minus(F.level().times(0.6))
                .plus(F.when(F.pref("grand"), F.const(14), F.const(0)).as("盛宴"))
                .clamp(100, 180).round(0),
            "冷却", "两场茶会之间的等待；等级越高越熟练，盛宴档更长。")
    });

    stages(teatimeId, [
        { level: 40, values: { wait: 136 } },
        { level: 60, values: { wait: 120 } }
    ]);

    describe(teatimeId, [
        { key: "description.0", values: ["radius"] },
        { key: "description.1", values: ["reach", "teaTicks", "cups"] },
        { key: "description.2", values: ["brew", "motes", "tempo", "aftercast", "wait"] },
        { key: "stance.grand", values: [], when: function (context) { return read(context.detail.values, ["grand"]) === true; } },
        { key: "stance.quick", values: [], when: function (context) { return read(context.detail.values, ["grand"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
