/**
 * 千变万花 / flowertrick —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：草／物理／威力 70／命中必定（accuracy true）／PP 10／willCrit（必定击中要害）／
 *   非接触、无次要效果；新叶喵最终进化型的专属招。描述是「将做了手脚的花束扔向对手进行攻击。必定会命中，且会击中要害。」
 *
 * 翻译：把「做了手脚的花束」落成一束**锁定落点、一次承诺**的花——出手前锁定一个可达落点，按真实抛物线抛出；
 *   出手后不再拐弯，落体第一次碰到敌人就整束绽开、花瓣全扑在薄弱处（必定击中要害）；碰到地面或墙只散瓣、不伤人。
 *   它和同族的差别在「抛过掩体」这一下：花束走真实弧线，低掩体能挡平掷，高抛能越过去落到掩体后。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   bloom       绽开威力：物攻给分量，等级补熟练；平掷把全部花瓣贯进一点，高抛为越过掩体慢一点、威力略低。
 *   reach       投掷距离：速度与等级决定扔多远。
 *   velocity    花束速度：速度决定飞得多急；平掷更快，高抛为了越过掩体慢一点。
 *   radius      判定半径：体型高度决定花束多粗。
 *   petals      花瓣数量：物攻与等级派生，驱动画面密度。
 *   tempo/aftercast/recharge 速度决定节奏；高抛更慢更费。
 *
 * 配置 `highArc`（高抛）双向取舍：开启＝按可达范围里最高的解抛出，越过低掩体落到掩体后，但速度 ×0.85、射程 ×0.92、
 *   绽开威力 ×0.85、起手 +2 刻、冷却 +6 刻；关闭（平掷）＝更快更远威力更高，但低掩体就能挡住弧线。
 *
 * 伤害段 `bloom`：命中那一下随精灵数据变化的那部分；命中必定要害，命中时按共享要害倍率结算。
 */
namespace PokemonSkills {
    export const flowertrickId = "flowertrick";
    export const flowertrickScene = "world_combat:move_flowertrick";
    export const flowertrickBloomText = "world_combat.move.flowertrick.text.bloom";
    export const flowertrickMissText = "world_combat.move.flowertrick.text.miss";

    actionParameters.define(flowertrickId, {
        /** 绽开威力：54 + 物攻偏移[−10,28] + 等级(≥20)偏移[0,9]，平掷 ×1.14、高抛 ×0.85；夹 38..108。 */
        bloom: formula(
            F.base(54, "基础")
                .plus(F.stat("attack").minus(55).times(0.26).clamp(-10, 28).as("物攻"))
                .plus(F.level().minus(20).times(0.32).clamp(0, 9).as("等级"))
                .times(F.when(F.pref("highArc", text("worldcombat.skill.flowertrick.preference.highArc")), F.const(0.85), F.const(1.14)).as("投法"))
                .clamp(38, 108).round(1),
            "绽开威力", {
                unit: "威力",
                description: "花束碰到敌人炸开那一下的基础威力；物攻给分量，等级让花瓣更利，平掷贯一点、高抛略低。命中必定要害（×1.5）。对手防御、相性在命中时另算。"
            }),
        /** 投掷距离：10 + 速度偏移[−1,2] + 等级(≥20)偏移[0,2]，高抛 ×0.92；夹 8..15。 */
        reach: formula(
            F.base(10, "基础")
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2).as("速度"))
                .plus(F.level().minus(20).times(0.04).clamp(0, 2).as("等级"))
                .times(F.when(F.pref("highArc", text("worldcombat.skill.flowertrick.preference.highArc")), F.const(0.92), F.const(1)).as("投法"))
                .clamp(8, 15).round(2),
            "投掷距离", {
                unit: "格",
                description: "花束能扔多远；速度快、等级高的个体扔得更远。它也是本招的实际射程，高抛略短。"
            }),
        /** 花束速度：1.4 + 速度偏移[−0.2,0.4]，平掷 ×1.12、高抛 ×0.85；夹 1.0..2.0。 */
        velocity: formula(
            F.base(1.4, "基础")
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.4).as("速度"))
                .times(F.when(F.pref("highArc", text("worldcombat.skill.flowertrick.preference.highArc")), F.const(0.85), F.const(1.12)).as("投法"))
                .clamp(1.0, 2.0).round(2),
            "花束速度", {
                unit: "格/刻",
                description: "花束飞行的速度；速度快的个体扔得更急。高抛为越过掩体飞得慢一点，平掷更快。"
            }),
        /** 判定半径：0.3 + 体型高度偏移[−0.05,0.2]；夹 0.25..0.5。 */
        radius: formula(
            F.base(0.3, "基础")
                .plus(F.body("height").minus(1.4).times(0.06).clamp(-0.05, 0.2).as("体型"))
                .clamp(0.25, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "花束的横向判定半径；大个子扔出的花束更粗。"
            }),
        /** 花瓣数量：20 + 物攻偏移[0,20] + 等级(≥20)偏移[0,9]；夹 16..54。 */
        petals: formula(
            F.base(20, "基础")
                .plus(F.stat("attack").minus(55).times(0.2).clamp(0, 20).as("物攻"))
                .plus(F.level().minus(20).times(0.3).clamp(0, 9).as("等级"))
                .clamp(16, 54).round(0),
            "花瓣数量", {
                unit: "片",
                description: "花束飞行与绽开时翻飞的花瓣数量，随物攻与等级增长；粒子按它发射。"
            }),
        /** 起手：9 − 速度偏移[−2,3]，高抛 +2；夹 5..15。 */
        tempo: seconds(
            F.base(9, "基础")
                .minus(F.stat("speed").minus(55).times(0.035).clamp(-2, 3).as("速度"))
                .plus(F.when(F.pref("highArc", text("worldcombat.skill.flowertrick.preference.highArc")), F.const(2), F.const(0)).as("投法"))
                .clamp(5, 15).round(0),
            "起手", "锁定落点并把花束在手里理好、扬手要多久；速度越快起得越短，高抛多理一下。"),
        /** 收招：8 − 速度偏移[−1.5,2]；夹 5..12。 */
        aftercast: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2).as("速度")).clamp(5, 12).round(0),
            "收招", "花束出手后的收势；快的个体收得干脆。"),
        /** 冷却：40 − 等级 ×0.3，高抛 +6；夹 28..70。 */
        recharge: seconds(
            F.base(40, "基础")
                .minus(F.level().times(0.3))
                .plus(F.when(F.pref("highArc", text("worldcombat.skill.flowertrick.preference.highArc")), F.const(6), F.const(0)).as("投法"))
                .clamp(28, 70).round(0),
            "冷却", "两束花之间捆扎的等待；等级越高越熟练，高抛更费。PP 10 的代价。")
    });

    defineDamage(flowertrickId, "bloom", {});

    stages(flowertrickId, [
        { level: 30, values: { bloom: 66, petals: 26 } },
        { level: 46, values: { bloom: 82, petals: 34 } }
    ]);

    describe(flowertrickId, [
        { key: "description.0", values: ["bloom"] },
        { key: "description.1", values: ["reach", "velocity"] },
        { key: "targeting", values: [] },
        { key: "highArc.on", values: [], when: function (context) { return read(context.detail.values, ["highArc"]) === true; } },
        { key: "highArc.off", values: [], when: function (context) { return read(context.detail.values, ["highArc"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bloom"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bloom"] }
    ]);
}
