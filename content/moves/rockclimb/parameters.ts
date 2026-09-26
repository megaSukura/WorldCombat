/** Finite climb geometry and one real body strike retain the original impact and confusion budget. */
namespace PokemonSkills {
    export const rockclimbId = "rockclimb";
    export const rockclimbScene = "world_combat:move_rockclimb";
    export const rockclimbEffect = "world_combat:rockclimb_daze";
    export const rockclimbDazeText = "world_combat.move.rockclimb.text.daze";
    export const rockclimbStumbleText = "world_combat.move.rockclimb.text.stumble";
    export const rockclimbHitText = "world_combat.move.rockclimb.text.hit";
    export const rockclimbMissText = "world_combat.move.rockclimb.text.miss";

    actionParameters.define(rockclimbId, {
        /** 扑击威力：86 + 物攻偏移[−12,32] + 体重偏移[−4,14]，跃攀 ×0.96；夹 48..176。 */
        ram: formula(
            F.base(86)
                .plus(F.stat("attack").minus(58).times(0.3).clamp(-12, 32))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-4, 14))
                .times(F.when(F.pref("vault"), F.const(0.96), F.const(1)))
                .clamp(48, 176).round(1),
            "扑击威力", {
                unit: "威力",
                description: "整个身体砸中那一下的基础威力；物攻越高冲量越大，体重越重压得越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：5.0 + 速度偏移[−0.7,1.6]，跃攀 ×1.25／贴地 ×0.95；夹 3.4..8.5。 */
        reach: formula(
            F.base(5.0)
                .plus(F.stat("speed").minus(58).times(0.025).clamp(-0.7, 1.6))
                .times(F.when(F.pref("vault"), F.const(1.25), F.const(0.95)))
                .clamp(3.4, 8.5).round(2),
            "冲程", {
                unit: "格",
                description: "这一扑能扑出去多远；速度越快扑得越远，跃攀更远。它也是本招的实际射程来源。"
            }),
        /** 攀升高度：0.9 + 体重偏移[−0.1,0.6]，跃攀 ×1.7／贴地 ×0.7；夹 0.5..2.6。 */
        arc: formula(
            F.base(0.9)
                .plus(F.body("weight").minus(60).times(0.006).clamp(-0.1, 0.6))
                .times(F.when(F.pref("vault"), F.const(1.7), F.const(0.7)))
                .clamp(0.5, 2.6).round(2),
            "攀升高度", {
                unit: "格",
                description: "短壁最多攀升的高度；跃攀能到更高的墙沿，真实顶棚会截住身体。"
            }),
        /** 扑跃时长：11 − 速度偏移[−2.5,3]，跃攀 +3；夹 7..18。 */
        leapTicks: seconds(
            F.base(11)
                .minus(F.stat("speed").minus(58).times(0.03).clamp(-2.5, 3))
                .plus(F.when(F.pref("vault"), F.const(3), F.const(0)))
                .clamp(7, 18).round(0),
            "扑跃时长", "从蹬地到落地要多久；速度越快扑得越急，跃攀更慢。"),
        /** 接触碎屑范围：1.0 + 体宽偏移[−0.1,0.5] + 身高偏移[−0.05,0.3]，跃攀 ×1.35；夹 0.7..2.2。 */
        impactRadius: formula(
            F.base(1.0)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.1, 0.5))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.05, 0.3))
                .times(F.when(F.pref("vault"), F.const(1.35), F.const(1)))
                .clamp(0.7, 2.2).round(2),
            "接触碎屑范围", {
                unit: "格",
                description: "落地那一下砸到的圆圈半径；体宽与身高越大砸得越开，跃攀更广。它同时驱动画面里的落地尘环。"
            }),
        /** 命中偏角：1.4 + 跃攀 0.6 度/点缺失；夹 1.0..2.4。原生命中 85 → 最多约 15×该值 度。 */
        spread: formula(
            F.base(1.4)
                .plus(F.when(F.pref("vault"), F.const(0.6), F.const(0)))
                .clamp(1.0, 2.4).round(2),
            "命中偏角", {
                unit: "度/点",
                description: "原生命中 85 的缺失换算成方向偏移：每个缺失点让扑跃方向最多偏这么多度。跃攀更飘、更容易扑空。"
            }),
        /** 混乱概率：20% + 物攻偏移[−5%,12%]；夹 12%..44%。 */
        confuseChance: percent(
            F.base(0.20)
                .plus(F.stat("attack").minus(58).times(0.0014).clamp(-0.05, 0.12))
                .clamp(0.12, 0.44).round(3),
            "混乱概率", "被撞实后陷入混乱的概率；原生 20% 起，物攻越高越容易。"),
        /** 混乱时长：150 + 物攻偏移[−20,60] + 等级(≥28)偏移[0,50] 刻；夹 110..320。 */
        dazeTicks: seconds(
            F.base(150)
                .plus(F.stat("attack").minus(58).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(28).times(1.2).clamp(0, 50))
                .clamp(110, 320).round(0),
            "混乱时长", "被撞得晕头转向后陷入混乱的时长；物攻越高、等级越高越久。"),
        /** 失手率：32% + 物攻偏移[−5%,10%]；夹 18%..50%。 */
        fumble: percent(
            F.base(0.32)
                .plus(F.stat("attack").minus(58).times(0.0012).clamp(-0.05, 0.1))
                .clamp(0.18, 0.5).round(3),
            "混乱失手率", "混乱期间目标每次想出手被打散的概率；物攻越高的施法者撞得越晕。"),
        /** 爪痕细节：6 + 体重偏移[−2,8]，跃攀 ×1.2；夹 4..16。 */
        scuffCells: formula(
            F.base(6)
                .plus(F.body("weight").minus(60).times(0.16).clamp(-2, 8))
                .times(F.when(F.pref("vault"), F.const(1.2), F.const(1)))
                .clamp(4, 16).round(0),
            "爪痕细节", {
                unit: "格",
                description: "真实壁面接触时爪痕的视觉细节预算；地形保持。"
            }),
        /** 爪痕余光：70 + 等级(≥28)偏移[0,40] 刻；夹 50..150。 */
        scuffTicks: seconds(
            F.base(70)
                .plus(F.level().minus(28).times(1).clamp(0, 40))
                .clamp(50, 150).round(0),
            "爪痕余光", "落地蹬翻的爪痕余光多久；等级越高留得越久，到期原方块回来。"),
        /** 土屑数：12 + 物攻偏移[0,20] + 等级(≥28)偏移[0,10]；夹 10..44。 */
        motes: formula(
            F.base(12)
                .plus(F.stat("attack").minus(58).times(0.14).clamp(0, 20))
                .plus(F.level().minus(28).times(0.3).clamp(0, 10))
                .clamp(10, 44).round(0),
            "土屑数", {
                unit: "点",
                description: "落地炸开的土屑数量，随物攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：12 − 速度偏移[−2.5,3]，跃攀 +3；夹 7..18。 */
        tempo: seconds(
            F.base(12)
                .minus(F.stat("speed").minus(58).times(0.035).clamp(-2.5, 3))
                .plus(F.when(F.pref("vault"), F.const(3), F.const(0)))
                .clamp(7, 18).round(0),
            "起手", "低头蹬地蓄到能扑出去的时间；速度越快越短，跃攀要蓄更久。"),
        /** 收招：11 − 速度偏移[−2,2.5]，跃攀 +1；夹 6..16。 */
        aftercast: seconds(
            F.base(11)
                .minus(F.stat("speed").minus(58).times(0.025).clamp(-2, 2.5))
                .plus(F.when(F.pref("vault"), F.const(1), F.const(0)))
                .clamp(6, 16).round(0),
            "收招", "落地后站稳的收势；速度越快越利落。"),
        /** 冷却：34 − 速度偏移[−6,9]，跃攀 +7；夹 20..50。 */
        recharge: seconds(
            F.base(34)
                .minus(F.stat("speed").minus(58).times(0.06).clamp(-6, 9))
                .plus(F.when(F.pref("vault"), F.const(7), F.const(0)))
                .clamp(20, 50).round(0),
            "冷却", "再次蹬地前的等待；本招冷却最长，跃攀更久。"),
        /** 单次最多砸到几个人：协议常量。 */
        maxTargets: hidden(1)
    });

    defineDamage(rockclimbId, "ram", {}, { contact: true });

    stages(rockclimbId, [
        { level: 30, values: { ram: 96 } },
        { level: 48, values: { ram: 108, confuseChance: 0.28 } }
    ]);

    describe(rockclimbId, [
        { key: "description.0", values: ["ram","reach","maxTargets"] },
        { key: "description.1", values: ["confuseChance","dazeTicks","fumble"] },
        { key: "description.2", values: ["spread", "arc"] },
        { key: "description.additional", values: [] },
        { key: "vault.on", values: [], when: function (context) { return read(context.detail.values, ["vault"]) === true; } },
        { key: "vault.off", values: [], when: function (context) { return read(context.detail.values, ["vault"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.confuseChance"] }
    ]);
}
