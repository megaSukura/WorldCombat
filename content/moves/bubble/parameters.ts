/**
 * 泡沫 / bubble 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 40／命中 100／PP 30／target allAdjacentFoes，10% 概率使目标速度下降 1 级；
 *   58 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手用力吹起无数泡泡进行攻击。有时会降低对手的速度」。
 *
 * 翻译：把「无数泡泡」落成一**大口气吹出的扇形泡群**——施法者一口喷出 `puffs` 个泡泡，沿瞄准方向张开
 *   `span` 度铺出去，先后推 `volleys` 轮；每个泡泡自己飞、自己撞，泡群一层层糊住身前一大片。每个敌人每次
 *   施放只认真挨一次 `spray`，有 `sudsChance` 概率被泡泡打滑、掉 `sudsStages` 级速度，并带上共享身份
 *   `world_combat:status/sudsy`（本单元发明：被泡泡糊身、脚下滑）。
 *
 * 与同族分开：泡沫光线（bubblebeam）是**一团会黏的泡沫球**命中后沿准线溅开；泡沫是**一气吹出的无数小泡**，
 *   更快、更散、更弱，一层层扫过整片，不黏、只打滑。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   spray      泡泡威力：特攻定泡的冲劲，等级定数量；密泡式把力道摊开所以更轻。
 *   reach      射程：特攻与等级决定吹多远。它也是本招实际射程来源。
 *   span       扇面张角：碰撞箱宽度决定一口气铺多宽；密泡式更宽。
 *   volleys    推几轮：速度够快时多推一轮。
 *   puffs      每轮泡数：碰撞箱宽度与配置决定一轮吹出几个。
 *   gap        轮间隔：速度决定吹得多密。
 *   velocity   泡泡速度：速度定泡飞得多急；密泡更慢。
 *   collisionRadius 泡泡判定：体型高度定泡泡多大。
 *   sudsChance 打滑概率：原生 10% 起，特攻与等级提高咬住的机会；密泡式更高。
 *   sudsStages 掉速级数：特攻很高或密泡式时一次掉 2 级。
 *   sudsTicks  打滑时长：等级与配置决定。
 *   bubbles    泡数：特攻与等级换算的泡泡数量，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏。
 *
 * 配置 `dense`（密泡式）双向取舍（默认关）：
 *   开＝每轮 +2 泡、扇面 ×1.3、打滑概率 +10%、可掉 2 级、打滑时长 ×1.4；代价是威力 ×0.85、速度 ×0.85、
 *     射程 −1.5 格、起手 +2 刻——糊得广、软而黏。
 *   关（急泡）＝威力 ×1.12、速度 ×1.12、射程 +2 格、每轮 −1 泡；代价是打滑概率 −4%、打滑时长 ×0.8——快而脆。
 *
 * 伤害段 `spray`（参数同名）走共享换算（原生类别 Special／Water）；对手特防、相性与暴击命中时另算。
 * 速度下降用共享能力等级阶梯 NativeEffects.boost(..., "spe", -n)，对宝可梦、原版生物、玩家同一条路；
 * 效果只带共享身份 sudsy，不另加属性修饰（避免和速度阶梯重复扣速）。
 */
namespace PokemonSkills {
    export const bubbleId = "bubble";
    export const bubbleEffect = "world_combat:bubble_suds";
    export const bubbleScene = "world_combat:move_bubble";
    export const bubbleIdentity = "world_combat:status/sudsy";
    export const bubbleSudsText = "world_combat.move.bubble.text.suds";
    export const bubbleMissText = "world_combat.move.bubble.text.miss";

    actionParameters.define(bubbleId, {
        /** 泡泡威力：40 + 特攻偏移[−6,20] + 等级(≥25)偏移[0,10]；密泡 ×0.85 / 急泡 ×1.12；夹 22..78。 */
        spray: formula(
            F.base(40).plus(F.stat("specialAttack").minus(55).times(0.18).clamp(-6, 20))
                .plus(F.level().minus(25).times(0.3).clamp(0, 10))
                .times(F.when(F.pref("dense"), F.const(0.85), F.const(1.12)))
                .clamp(22, 78).round(1),
            "泡泡威力", {
                unit: "威力",
                description: "一个泡泡糊到目标上的基础威力；特攻越高泡越冲、等级越高份量越足，密泡式把力道摊到更多泡上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：9 + 特攻偏移[−1.5,3] + 等级(≥25)偏移[0,1.5] + 密泡 −1.5 / 急泡 +2；夹 6..14。 */
        reach: formula(
            F.base(9).plus(F.stat("specialAttack").minus(55).times(0.045).clamp(-1.5, 3))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.5))
                .plus(F.when(F.pref("dense"), F.const(-1.5), F.const(2)))
                .clamp(6, 14).round(1),
            "射程", {
                unit: "格",
                description: "泡泡能吹到多远；特攻高、等级高的个体吹得更远，急泡更远。它也是本招的实际射程来源。"
            }),
        /** 扇面张角：60 + 体型宽度偏移[−10,55]；密泡 ×1.3；夹 40..140。 */
        span: formula(
            F.base(60).plus(F.body("width").minus(0.9).times(38).clamp(-10, 55))
                .times(F.when(F.pref("dense"), F.const(1.3), F.const(1)))
                .clamp(40, 140).round(0),
            "扇面张角", {
                unit: "度",
                description: "一口泡泡在身前铺开的扇形张角；身体越宽铺得越开，密泡式更宽。判定与画面共用同一个扇形。"
            }),
        /** 推几轮：1 + 速度 ≥ 65；夹 1..2。 */
        volleys: formula(
            F.base(1).plus(F.stat("speed").gte(65)).clamp(1, 2).round(0),
            "推几轮", {
                unit: "轮",
                description: "一口气分几轮吹出去；速度够快的个体（≥65）多推一轮，铺得更密。"
            }),
        /** 每轮泡数：4 + 体型宽度偏移[−1,3] + 密泡 2 / 急泡 −1；夹 3..8。 */
        puffs: formula(
            F.base(4).plus(F.body("width").minus(0.9).times(2).clamp(-1, 3))
                .plus(F.when(F.pref("dense"), F.const(2), F.const(-1)))
                .clamp(3, 8).round(0),
            "每轮泡数", {
                unit: "个",
                description: "一轮吹出几个泡泡；身体越宽越多，密泡式更多。它决定泡群铺开的密度，也驱动表现。"
            }),
        /** 轮间隔：5 − 速度偏移[−1,2]；夹 3..8。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 8).round(0),
            "轮间隔", "两轮泡泡之间隔多久；速度越快连吹越密。"),
        /** 泡泡速度：1.6 + 速度偏移[−0.2,0.5]；密泡 ×0.85 / 急泡 ×1.12；夹 1.1..2.6。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5))
                .times(F.when(F.pref("dense"), F.const(0.85), F.const(1.12)))
                .clamp(1.1, 2.6).round(2),
            "泡泡速度", {
                unit: "格/刻",
                description: "泡泡飞行的速度；速度快的个体吹得更急，密泡式更慢、更糊。"
            }),
        /** 泡泡判定：0.2 + 体型高度 × 0.04；夹 0.16..0.4。 */
        collisionRadius: formula(
            F.base(0.2).plus(F.body("height").times(0.04)).clamp(0.16, 0.4).round(2),
            "泡泡判定", {
                unit: "格",
                description: "飞行途中泡泡的判定半径；体型越高泡泡越大。画面里那颗泡的宽度就是它。"
            }),
        /** 打滑概率：基础 0.10 + 特攻偏移[0,0.14] + 等级偏移[0,0.04] + 密泡 +0.10 / 急泡 −0.04；夹 0.05..0.42。 */
        sudsChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(55).times(0.0016).clamp(0, 0.14))
                .plus(F.level().minus(25).times(0.0008).clamp(0, 0.04))
                .plus(F.when(F.pref("dense"), F.const(0.10), F.const(-0.04)))
                .clamp(0.05, 0.42).round(3),
            "打滑概率", "泡泡糊住目标、把它速度降下来的概率；原生 10% 起，特攻与等级越高越容易打滑。"),
        /** 掉速级数：1 + 特攻 ≥ 110 + 密泡 1；夹 1..2。 */
        sudsStages: formula(
            F.base(1).plus(F.stat("specialAttack").gte(110))
                .plus(F.when(F.pref("dense"), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "掉速级数", {
                unit: "级",
                description: "被泡泡打滑时一次掉几级速度；特攻很高的个体（≥110）或密泡式会一次掉 2 级。速度等级对宝可梦、原版生物、玩家同一条路。"
            }),
        /** 打滑时长：基础 80 刻 + 等级(≥25)偏移[0,50]；密泡 ×1.4 / 急泡 ×0.8；夹 50..220。 */
        sudsTicks: seconds(
            F.base(80).plus(F.level().minus(25).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("dense"), F.const(1.4), F.const(0.8)))
                .clamp(50, 220).round(0),
            "打滑时长", "目标带着共享身份 sudsy、脚下滑的时间；等级越高、密泡式留得越久。"),
        /** 泡数：24 + 特攻偏移[−6,24] + 等级(≥25)偏移[0,12]；夹 16..70。 */
        bubbles: formula(
            F.base(24).plus(F.stat("specialAttack").minus(55).times(0.26).clamp(-6, 24))
                .plus(F.level().minus(25).times(0.5).clamp(0, 12)).clamp(16, 70).round(0),
            "泡数", {
                unit: "个",
                description: "整口气吹出的泡泡总量，也驱动表现的密度；特攻与等级越高泡越多。"
            }),
        /** 起手：7 − 速度偏移[−1,2] + 密泡 2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("dense"), F.const(2), F.const(0))).clamp(4, 12).round(0),
            "起手", "把一口气憋起来再吹出的时间；速度越快越短，密泡式要多憋一下。"),
        /** 收招：6 − 速度偏移[−1,1.5]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.025).clamp(-1, 1.5)).clamp(3, 10).round(0),
            "收招", "吹完泡泡后收势的时间；快的个体更利落。"),
        /** 冷却：20 − 速度偏移[−2,4] + 密泡 4；夹 12..32。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("dense"), F.const(4), F.const(0))).clamp(12, 32).round(0),
            "冷却", "再吹一口前等待多久；速度快的个体回得稍快，密泡式更久。")
    });

    defineDamage(bubbleId, "spray", {});

    describe(bubbleId, [
        { key: "description.0", values: ["spray", "puffs", "volleys"] },
        { key: "description.1", values: ["span", "reach", "velocity", "collisionRadius"] },
        { key: "description.2", values: ["sudsChance", "sudsStages", "sudsTicks"] },
        { key: "description.3", values: ["gap", "bubbles"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
