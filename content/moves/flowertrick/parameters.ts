/**
 * 千变万花 / flowertrick —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：草／物理／威力 70／命中必定（accuracy true）／PP 10／willCrit（必定击中要害）／
 *   非接触、无次要效果；新叶喵最终进化型的专属招。描述是「将做了手脚的花束扔向对手进行攻击。必定会命中，且会击中要害。」
 *
 * 翻译：把「做了手脚的花束」落成一束**会自己找上门、一碰就炸开的花**——花束飞出去后一路朝目标修正方向，
 *   所以必定命中；炸开的那一瞬花瓣全数扑在薄弱处，所以必定击中要害。它是本组唯一把两种「必定」同时攥在手里的一招，
 *   也是一束看得见的实体：用物品外观飞行，命中处炸出一圈花瓣、落点留下一片粉色花瓣。
 *   与魔法叶／高速星星分开：那些是一群各追各的小东西；千变万花只有一束，命中即绽。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   bloom       绽开威力：物攻给分量，等级补熟练；结环把力量摊给周围的溅射。
 *   reach       投掷距离：速度与等级决定扔多远。
 *   velocity    花束速度：速度决定飞得多急。
 *   turn        追踪转向：速度决定拐得多急（必中的直接来源）。
 *   lockRange   锁定距离：物攻与等级决定花束能咬住多远的目标。
 *   radius      判定半径：体型高度决定花束多粗。
 *   petals      花瓣数量：物攻与等级派生，驱动画面密度。
 *   bloomRadius 绽开半径：物攻决定绽开多大一圈；结环更大。
 *   splash      溅射系数：结环时周围敌人各吃绽开威力的几成。
 *   petalCells/petalTicks 落点花瓣格数与停留：物攻决定铺多少格，等级决定留多久；结环更多。
 *   tempo/aftercast/recharge 速度决定节奏；结环更慢更费。
 *
 * 配置 `wreathe`（结环）双向取舍：开启＝命中时花瓣向外结成一圈、溅到周围敌人（各按 splash）、落点花瓣更多，
 *   但绽开威力 ×0.85、花束更慢、冷却 +6 刻；关闭（贯心）＝全部花瓣贯进一个目标，威力 ×1.14、更快更省。
 *
 * 伤害段 `bloom`：命中那一下随精灵数据变化的那部分；命中必定要害，命中时按共享要害倍率结算。
 */
namespace PokemonSkills {
    export const flowertrickId = "flowertrick";
    export const flowertrickScene = "world_combat:move_flowertrick";
    export const flowertrickBloomText = "world_combat.move.flowertrick.text.bloom";
    export const flowertrickMissText = "world_combat.move.flowertrick.text.miss";

    actionParameters.define(flowertrickId, {
        /** 绽开威力：54 + 物攻偏移[−10,28] + 等级(≥20)偏移[0,9]，结环 ×0.85、贯心 ×1.14；夹 38..108。 */
        bloom: formula(
            F.base(54, "基础")
                .plus(F.stat("attack").minus(55).times(0.26).clamp(-10, 28).as("物攻"))
                .plus(F.level().minus(20).times(0.32).clamp(0, 9).as("等级"))
                .times(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(0.85), F.const(1.14)).as("投法"))
                .clamp(38, 108).round(1),
            "绽开威力", {
                unit: "威力",
                description: "花束炸开那一下的基础威力；物攻给分量，等级让花瓣更利。命中必定要害（×1.5）。对手防御、相性在命中时另算。"
            }),
        /** 投掷距离：10 + 速度偏移[−1,2] + 等级(≥20)偏移[0,2]，结环 ×0.92；夹 8..15。 */
        reach: formula(
            F.base(10, "基础")
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2).as("速度"))
                .plus(F.level().minus(20).times(0.04).clamp(0, 2).as("等级"))
                .times(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(0.92), F.const(1)).as("投法"))
                .clamp(8, 15).round(2),
            "投掷距离", {
                unit: "格",
                description: "花束能扔多远；速度快、等级高的个体扔得更远。它也是本招的实际射程。"
            }),
        /** 花束速度：1.4 + 速度偏移[−0.2,0.4]，结环 ×0.85；夹 1.0..2.0。 */
        velocity: formula(
            F.base(1.4, "基础")
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.4).as("速度"))
                .times(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(0.85), F.const(1.12)).as("投法"))
                .clamp(1.0, 2.0).round(2),
            "花束速度", {
                unit: "格/刻",
                description: "花束飞行的速度；速度快的个体扔得更急。结环为了绽开得慢一点，贯心更快。"
            }),
        /** 追踪转向：12 + 速度偏移[−2,4]；夹 8..20。 */
        turn: formula(
            F.base(12, "基础")
                .plus(F.stat("speed").minus(55).times(0.06).clamp(-2, 4).as("速度"))
                .clamp(8, 20).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "花束每刻朝目标转向的最大角度；转弯够急就甩不掉，这是「必定命中」的直接来源。"
            }),
        /** 锁定距离：16 + 等级(≥20)偏移[0,3] + 物攻偏移[−1.5,2]；夹 14..22。 */
        lockRange: formula(
            F.base(16, "基础")
                .plus(F.level().minus(20).times(0.15).clamp(0, 3).as("等级"))
                .plus(F.stat("attack").minus(55).times(0.04).clamp(-1.5, 2).as("物攻"))
                .clamp(14, 22).round(1),
            "锁定距离", {
                unit: "格",
                description: "花束能一路咬住目标的最远距离；比射程更远，所以目标在花束出手后继续跑也甩不掉。"
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
        /** 绽开半径：2.2 + 物攻偏移[−0.3,0.8]，结环 ×1.4；夹 1.6..3.4。 */
        bloomRadius: formula(
            F.base(2.2, "基础")
                .plus(F.stat("attack").minus(55).times(0.01).clamp(-0.3, 0.8).as("物攻"))
                .times(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(1.4), F.const(1)).as("投法"))
                .clamp(1.6, 3.4).round(2),
            "绽开半径", {
                unit: "格",
                description: "花瓣向外结成多大一圈；结环时也决定能溅到多远的周围敌人。"
            }),
        /** 溅射系数：0.38 + 物攻偏移[−0.06,0.1]，夹 0.26..0.55。 */
        splash: percent(
            F.base(0.38, "基础")
                .plus(F.stat("attack").minus(55).times(0.0016).clamp(-0.06, 0.1))
                .clamp(0.26, 0.55).round(3),
            "溅射系数", "结环时周围每个敌人各吃绽开威力的几成；物攻越高分得越多。"),
        /** 落点花瓣格数：5 + 物攻偏移[0,9]，结环 ×1.2；夹 3..14。 */
        petalCells: formula(
            F.base(5, "基础")
                .plus(F.stat("attack").minus(55).times(0.12).clamp(0, 9).as("物攻"))
                .times(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(1.2), F.const(1)).as("投法"))
                .clamp(3, 14).round(0),
            "落点花瓣", {
                unit: "块",
                description: "命中处地面留下多少格粉色花瓣；物攻越高铺得越多。它同时驱动画面里的花瓣密度。"
            }),
        /** 花瓣停留：80 + 等级 ×2；夹 60..180。 */
        petalTicks: seconds(
            F.base(80, "基础").plus(F.level().times(2)).clamp(60, 180).round(0),
            "花瓣停留", "落点花瓣停留多久；等级越高留得越久。到期原方块回来。"),
        /** 起手：9 − 速度偏移[−2,3]，结环 +2；夹 5..15。 */
        tempo: seconds(
            F.base(9, "基础")
                .minus(F.stat("speed").minus(55).times(0.035).clamp(-2, 3).as("速度"))
                .plus(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(2), F.const(0)).as("投法"))
                .clamp(5, 15).round(0),
            "起手", "把做了手脚的花束在手里理好、扬手要多久；速度越快起得越短，结环多理一下。"),
        /** 收招：8 − 速度偏移[−1.5,2]；夹 5..12。 */
        aftercast: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2).as("速度")).clamp(5, 12).round(0),
            "收招", "花束出手后的收势；快的个体收得干脆。"),
        /** 冷却：40 − 等级 ×0.3，结环 +6；夹 28..70。 */
        recharge: seconds(
            F.base(40, "基础")
                .minus(F.level().times(0.3))
                .plus(F.when(F.pref("wreathe", text("worldcombat.skill.flowertrick.preference.wreathe")), F.const(6), F.const(0)).as("投法"))
                .clamp(28, 70).round(0),
            "冷却", "两束花之间捆扎的等待；等级越高越熟练，结环更费。PP 10 的代价。")
    });

    defineDamage(flowertrickId, "bloom", {});

    stages(flowertrickId, [
        { level: 30, values: { bloom: 66, petals: 26 } },
        { level: 46, values: { bloom: 82, bloomRadius: 2.8, petals: 34 } }
    ]);

    describe(flowertrickId, [
        { key: "description.0", values: ["bloom"] },
        { key: "description.1", values: ["reach","velocity","turn","lockRange"] },
        { key: "description.2", values: ["bloomRadius", "petalCells", "petalTicks"] },
        { key: "targeting", values: [] },
        { key: "wreathe.on", values: ["splash"], when: function (context) { return read(context.detail.values, ["wreathe"]) === true; } },
        { key: "wreathe.off", values: [], when: function (context) { return read(context.detail.values, ["wreathe"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bloom"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bloom", "tier.1.bloomRadius"] }
    ]);
}
