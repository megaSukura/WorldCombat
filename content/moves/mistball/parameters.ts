/**
 * 薄雾球 / mistball 的参数与数值来源。
 *
 * 原生事实：超能力／特殊／威力 95／命中 100／PP 5／目标单体／bullet／50% 让目标特攻下降 1 级。
 *
 * 翻译：把「用围绕着雾状羽毛的球进行攻击」落成一件慢下来的事——施法者先吹起一团羽绒与雾、揉成一颗轻球，
 * 再把它**抛成一道弧线**送出去（球轻、坠得慢，走位躲得开）；命中时球在目标身上散开成一团羽绒浓雾，
 * 有**一半**的机会把这团雾缠在目标身上、压住它的心神与脚步（特攻下降 1 级 + `world_combat:downcast` 减速）。
 * 与同族的月亮之力分开：月亮之力是一颗快而直的实球、看天吃饭；薄雾球是慢而弯的轻球、必留一片缠身的雾。
 *
 * 数值来源（每项读不同的精灵数据）：
 *   puff     羽绒威力：特攻定雾的密度、等级定绒的成熟度。
 *   lob      抛球速度：身高定臂力，球飞多快。
 *   fall     下坠：体重定球的坠势（越重抛得越沉）。
 *   cloud    雾团半径：体型宽度与特攻定命中点散开多大，也是画面里的雾团半径。
 *   downChance 缠身概率：特攻与等级定基础，原生 50%，浓雾式再加一成。
 *   downTicks 缠身时长：特攻与等级定雾能在身上糊多久。
 *   dropStages 特攻下降级数：固定 1 级。
 *   motes    羽绒数量：特攻定，也驱动画面密度。
 *   tempo／aftercast／recharge：速度定节奏，浓雾式更慢更久。
 *
 * 配置 `suffuse`（浓雾式，默认开）：开＝雾团 ×1.25、缠身概率 +0.10、缠身 ×1.25，代价是威力 ×0.88、抛速 ×0.9；
 * 关（轻羽式）＝威力 ×1.12、抛速 ×1.12、坠得更平，代价是雾团 ×0.85、缠身概率 −0.06。糊住 vs 打疼，两向各有局面。
 *
 * 伤害段 `puff`：一发超能力特殊球，沿用原生类别。
 */
namespace PokemonSkills {
    export const mistballId = "mistball";
    export const mistballScene = "world_combat:move_mistball";
    export const mistballEffect = "world_combat:downcast";
    export const mistballDownText = "world_combat.move.mistball.text.down";
    export const mistballMissText = "world_combat.move.mistball.text.miss";

    actionParameters.define(mistballId, {
        /** 羽绒威力：70 + 特攻偏移[−12,40] + 等级(≥30)偏移[0,12]；浓雾 ×0.88 / 轻羽 ×1.12；夹 44..170。 */
        puff: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-12, 40))
                .plus(F.level().minus(30).times(0.25).clamp(0, 12))
                .times(F.when(F.pref("suffuse"), F.const(0.88), F.const(1.12)))
                .clamp(44, 170).round(1),
            "羽绒威力", {
                unit: "威力",
                description: "羽绒雾球炸在目标身上那一下的基础威力；特攻越高、等级越高越实。对手特防、相性与暴击在命中时另算。"
            }),
        /** 抛球速度：0.75 + 身高偏移[−0.1,0.5]；浓雾 ×0.9 / 轻羽 ×1.12；夹 0.55..1.3。 */
        lob: formula(
            F.base(0.75).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.1, 0.5))
                .times(F.when(F.pref("suffuse"), F.const(0.9), F.const(1.12)))
                .clamp(0.55, 1.3).round(2),
            "抛球速度", {
                unit: "格/刻",
                description: "羽绒球离手时的初速；身高越高抛得越有力，浓雾式因为球更重而更慢。"
            }),
        /** 下坠：0.04 − 体重偏移[−0.02,0.008]；浓雾 ×1.15 / 轻羽 ×0.9；夹 0.02..0.06。 */
        fall: formula(
            F.base(0.04).minus(F.body("weight").minus(60).times(0.0001).clamp(-0.02, 0.008))
                .times(F.when(F.pref("suffuse"), F.const(1.15), F.const(0.9)))
                .clamp(0.02, 0.06).round(3),
            "下坠", {
                unit: "格/刻²",
                description: "羽绒球飞行的下坠加速度；体重越大的个体抛出的球坠得越快，浓雾式更沉、轻羽式更平。"
            }),
        /** 雾团半径：1.2 + 体型宽度偏移[−0.2,0.9] + 特攻偏移[0,0.5]；浓雾 ×1.25 / 轻羽 ×0.85；夹 0.9..2.6。 */
        cloud: formula(
            F.base(1.2)
                .plus(F.body("width").minus(0.9).times(0.6).clamp(-0.2, 0.9))
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(0, 0.5))
                .times(F.when(F.pref("suffuse"), F.const(1.25), F.const(0.85)))
                .clamp(0.9, 2.6).round(2),
            "雾团半径", {
                unit: "格",
                description: "球在命中点炸开成多大一团羽绒雾；体型宽、特攻强的个体铺得越开，浓雾式更大。它也是画面里雾团的大小。"
            }),
        /** 缠身概率：50% + 特攻偏移[0,14%] + 等级(≥30)偏移[0,5%]；浓雾 +10% / 轻羽 −6%；夹 34%..74%。 */
        downChance: percent(
            F.base(0.5)
                .plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(0, 0.14))
                .plus(F.level().minus(30).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("suffuse"), F.const(0.1), F.const(-0.06)))
                .clamp(0.34, 0.74).round(3),
            "缠身概率", "命中的目标特攻下降 1 级、并被羽绒雾糊住减速的概率；原生 50%，特攻与等级会抬高它。"),
        /** 缠身时长：70 + 特攻偏移[−10,30] + 等级(≥30)偏移[0,26]；浓雾 ×1.25；夹 50..160。 */
        downTicks: seconds(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-10, 30))
                .plus(F.level().minus(30).times(0.8).clamp(0, 26))
                .times(F.when(F.pref("suffuse"), F.const(1.25), F.const(1)))
                .clamp(50, 160).round(0),
            "缠身时长", "被羽绒雾糊住、带着 world_combat:status/downcast 移动变慢的时间；特攻越高、等级越高糊得越久。"),
        /** 特攻下降：固定 1 级。 */
        dropStages: formula(
            F.base(1),
            "特攻下降", {
                unit: "级",
                description: "被雾糊住时目标特攻下降的能力等级；对宝可梦落到原生特攻等级，对其他战斗者落到攻击阶梯。"
            }),
        /** 羽绒数量：26 + 特攻偏移[−8,22]；夹 16..64。 */
        motes: formula(
            F.base(26).plus(F.stat("specialAttack").minus(60).times(0.24).clamp(-8, 22)).clamp(16, 64).round(0),
            "羽绒数量", {
                unit: "个",
                description: "球炸开与雾团缭绕时同时飘起的羽绒数量；特攻越高越多，粒子也按它发射。"
            }),
        /** 判定半径：固定 0.32 格，球的碰撞体积。 */
        collisionRadius: hidden(0.32),
        /** 起手：8 − 速度偏移[−2,3] + 浓雾 2；夹 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("suffuse"), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "吹起羽绒、把雾揉成一颗球再抛出所需的时间；速度越快越短，浓雾式多花一点。"),
        /** 收招：9 − 速度偏移[−2,3]；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(5, 14).round(0),
            "收招", "抛完收回架势的时间；速度越快收得越干脆。"),
        /** 冷却：90 − 速度偏移[−8,14] + 浓雾 8；夹 60..140。 */
        recharge: seconds(
            F.base(90).minus(F.stat("speed").minus(60).times(0.08).clamp(-8, 14))
                .plus(F.when(F.pref("suffuse"), F.const(8), F.const(0)))
                .clamp(60, 140).round(0),
            "冷却", "两次抛球之间的等待；原生 PP 少，这一招冷却很长，浓雾式更久。速度越快回得越快。")
    });

    defineDamage(mistballId, "puff", {});

    stages(mistballId, [
        { level: 40, values: { puff: 84 } },
        { level: 60, values: { cloud: 1.6, downTicks: 100 } }
    ]);

    describe(mistballId, [
        { key: "description.0", values: ["puff"] },
        { key: "description.1", values: ["downChance","dropStages","downTicks"] },
        { key: "description.2", values: ["cloud","lob","fall"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["suffuse"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["suffuse"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.puff"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cloud", "tier.1.downTicks"] }
    ]);
}
