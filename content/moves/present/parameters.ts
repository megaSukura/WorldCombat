/**
 * 礼物 / present —— 参数与伤害段。
 *
 * 原生事实：Normal／物理／命中 90／PP 15／威力随机：20% 回复目标 1/4 最大生命，其余为 40 / 80 / 120 三档伤害
 *   （约 40% / 30% / 10%）（Cobblemon 1.8，25 位已实装学习者）。
 *
 * 核心念头：你给对面递上一个盒子，它当着面打开——多数时候是个弹簧拳套（造成伤害），偶尔真是一颗糖
 *   （反而把对方治好）。你并不知道递出去的是哪一种；恶作剧上得越紧，大的那几下越可能，误放糖果的机会也越大。
 * 翻译：把「随机伤害／回复」原样落成一次掷骰；因为要能递给同伴也能递给敌人，本招用「选一个落点」的输入，
 *   盒子低弧抛出，落在谁身边就当着谁打开：掷中糖果就治疗落点附近最近的一个活物（哪怕是敌人），
 *   否则对落点附近的非友方炸出机关。它不与任何按对象分红结果的花粉团相同——这里的结果由掷骰决定。
 *
 * 与家族分开：其余三招都是稳定的「伤害换回复」；只有礼物会把生命**还给对手**，是一记有圈套的赌注盒。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   surprise   机关威力 62 + 物攻偏移 + 等级偏移（身体越壮、等级越高，弹簧拳套越重）。
 *   mend       糖果回复比例 0.25 + 亲密度偏移（感情越好，这颗糖越甜）。
 *   reach      投掷距离 7 + 等级偏移 + 速度偏移；也是实际射程来源，扔得越远越安全。
 *   burstRadius 机关炸开半径 1.7 + 体型身高偏移（大个子甩出的盒子散得开）。
 *   throwSpeed 飞行速度 0.75 + 速度偏移。
 *   sweetChance 糖果几率 6%（稳妥式）/ 26%（戏耍式）——掷中就把生命还给落点旁的那个人。
 *   heavyChance 重击档几率 5%（稳妥式）/ 25%（戏耍式）——机关里最重的那一档的概率。
 *   motes／tempo／settle／recharge 驱动画面与节奏。
 *
 * 配置 `trick`（戏耍盒）双向取舍：开＝重击档几率与糖果几率一起抬高，期望伤害更高，但更常把对手治好（赌）；
 *   关（稳妥盒）＝伤害更稳、几乎不会误放糖果（稳）。两向各有局面。
 *
 * 伤害段 `surprise` 与参数同名，走共享换算（原生类别 Physical，Normal 属性）。
 */
namespace PokemonSkills {
    export const presentId = "present";
    export const presentScene = "world_combat:move_present";

    actionParameters.define(presentId, {
        /** 机关威力：62 + 物攻偏移[−16,38] + 等级(≥20)偏移[0,10]；夹 38..150。 */
        surprise: formula(
            F.base(62)
                .plus(F.stat("attack").minus(58).times(0.34).clamp(-16, 38))
                .plus(F.level().minus(20).times(0.12).clamp(0, 10))
                .clamp(38, 150).round(1),
            "机关威力", {
                unit: "威力",
                description: "盒子里弹簧拳套的基础威力（掷中轻／中／重档时再乘对应倍率）；物攻越高、等级越高越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 糖果回复比例：0.25 + 亲密度偏移[−0.05,0.15]；夹 0.16..0.40。 */
        mend: percent(
            F.base(0.25).plus(F.individual("friendship", text("worldcombat.skill.present.value.friendship")).minus(70).times(0.0008).clamp(-0.05, 0.15))
                .clamp(0.16, 0.40),
            "糖果回复", "掷中糖果时，落点旁最近的一个活物恢复其最大生命的这个比例（连对手一起）——这就是「也有可能回复对手HP」。感情越好，这颗糖越甜。"),
        /** 投掷距离：7 + 等级(≥20)偏移[0,2.4] + 速度偏移[−1,1.5]；夹 5..11；也是实际射程来源。 */
        reach: formula(
            F.base(7)
                .plus(F.level().minus(20).times(0.08).clamp(0, 2.4))
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1, 1.5)).clamp(5, 11).round(2),
            "投掷距离", {
                unit: "格",
                description: "盒子最远能扔到哪里，也是本招的实际射程与指示圈半径；等级高、腿快的个体扔得远。"
            }),
        /** 机关炸开半径：1.7 + 身高偏移[−0.25,0.9]；夹 1.3..2.9。 */
        burstRadius: formula(
            F.base(1.7).plus(F.body("height").minus(1.35).times(0.5).clamp(-0.25, 0.9)).clamp(1.3, 2.9).round(2),
            "机关炸开半径", {
                unit: "格",
                description: "掷中机关时落点附近多少人一起挨炸；身板大的个体甩出的盒子散得开。"
            }),
        /** 飞行速度：0.75 + 速度偏移[−0.15,0.35]；夹 0.55..1.3。 */
        throwSpeed: formula(
            F.base(0.75).plus(F.stat("speed").minus(55).times(0.003).clamp(-0.15, 0.35)).clamp(0.55, 1.3).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "盒子飞行每刻走多远；腿快的个体扔得急，飞得平而快、落点更准。"
            }),
        /** 糖果几率：稳妥式 0.06 / 戏耍式 0.26。 */
        sweetChance: percent(
            F.when(F.pref("trick", text("worldcombat.skill.present.preference.trick")), F.const(0.26), F.const(0.06)).round(3),
            "糖果几率", "盒子打开时其实是一颗糖、反而治疗落点旁那个人的几率。戏耍式会把它抬到约四分之一。"),
        /** 重击档几率：稳妥式 0.05 / 戏耍式 0.25。 */
        heavyChance: percent(
            F.when(F.pref("trick", text("worldcombat.skill.present.preference.trick")), F.const(0.25), F.const(0.05)).round(3),
            "重击档几率", "机关里最重那一档（×1.5）出现的几率。戏耍式会把它抬到约四分之一，代价是更容易误放糖果。"),
        /** 盒屑数量：12 + 物攻偏移[−3,12] + 等级偏移[−2,4]；夹 10..32；驱动画面。 */
        motes: formula(
            F.base(12)
                .plus(F.stat("attack").minus(58).times(0.12).clamp(-3, 12))
                .plus(F.level().minus(20).times(0.06).clamp(-2, 4)).clamp(10, 32).round(0),
            "盒屑数量", {
                unit: "撮",
                description: "盒子炸开／散开时迸出的纸屑数量；物攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 起手：7 − 速度偏移[−2,3]；夹 4..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 3)).clamp(4, 11).round(0),
            "起手", "把盒子系好缎带、抡起来的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−2,3]；夹 3..10。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3)).clamp(3, 10).round(0),
            "收招", "扔出盒子后收势的时间。"),
        /** 冷却：22 − 速度偏移[−4,5] + 戏耍式 4；夹 15..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 5))
                .plus(F.when(F.pref("trick", text("worldcombat.skill.present.preference.trick")), F.const(4), F.const(0))).clamp(15, 34).round(0),
            "冷却", "两盒礼物之间的等待；速度快的个体回得更快，戏耍式更费。"),
        collisionRadius: hidden(0.26)
    });

    defineDamage(presentId, "surprise", { defenceCoefficient: 0.005,
        rationale: "弹簧拳套弹出的一击，防御按默认系数减伤。" }, {});

    stages(presentId, [
        { level: 28, values: { surprise: 74 } },
        { level: 44, values: { surprise: 88, mend: 0.30 } }
    ]);

    describe(presentId, [
        { key: "description.0", values: ["surprise","heavyChance"] },
        { key: "description.1", values: ["sweetChance","mend"] },
        { key: "description.2", values: ["reach","burstRadius","throwSpeed"] },
        { key: "trick.on", values: [], when: function (context) { return read(context.detail.values, ["trick"]) === true; } },
        { key: "trick.off", values: [], when: function (context) { return read(context.detail.values, ["trick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surprise"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surprise", "tier.1.mend"] }
    ]);
}
