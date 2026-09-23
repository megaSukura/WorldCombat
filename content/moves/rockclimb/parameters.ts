/**
 * 攀岩 / rockclimb —— 参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 90／命中 85／PP 20／接触；20% 概率使目标混乱；
 * 描述作 "smashing into it with incredible force"（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「全力扑向对手」落成一次**带高度的蹬地扑跃**——先攀上、再整个身体砸向目标；命中又重又可能把人撞得
 * 晕头转向，落点还会砸出一小片被蹬翻的土。它的身份是**重量与冲程**：单发本族最重，但 85 的命中会真的扑偏。
 * 与族里两道光分开：那两招是远程投送，攀岩是贴身的一次重扑，命中的是一小圈落地范围。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   ram          扑击威力：物攻定冲量，体重定压上的分量。
 *   reach        冲程：速度决定这一扑能扑多远。
 *   arc          跃高：体重决定跃起的弧度（越重越沉地起落）。
 *   leapTicks    扑跃时长：速度决定多快扑完；跃攀更慢。
 *   impactRadius 落地范围：体宽与身高决定砸到的圈多大。
 *   spread       命中偏角：原生 85 命中落成的每点缺失偏角；跃攀更飘。
 *   confuseChance 混乱概率：原生 20% 起，物攻提高。
 *   dazeTicks    混乱时长：物攻与等级决定晕多久。
 *   fumble       失手率：混乱期间每次想出手被打散的概率，物攻越高撞得越晕。
 *   scuffCells   土痕格数：体重决定蹬翻多少格地面。
 *   motes        土屑数：物攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定；本招是族里最重最慢的一招。
 *
 * 配置 `vault`（跃攀）双向取舍：开启＝扑得更远更高、落地范围 ×1.35、土痕更大，但起手/收招/冷却更长、
 * 命中偏角更大（更容易扑空）；关闭（贴地扑）＝低平快的一扑、偏角小更稳，代价是范围与冲程更小。
 *
 * 混乱行为（本单元自己的变体）：目标每次想出手都可能被打散；被打散时它会**踉跄半步**——朝随机方向被撞开一点，
 * 并被短暂减速。这是攀岩区别于幻象光线（续时长）、信号光束（挨打反冲）的地方。
 *
 * 伤害段 `ram`：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Physical，接触）。
 */
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
        /** 跃高：0.9 + 体重偏移[−0.1,0.6]，跃攀 ×1.7／贴地 ×0.7；夹 0.5..2.6。 */
        arc: formula(
            F.base(0.9)
                .plus(F.body("weight").minus(60).times(0.006).clamp(-0.1, 0.6))
                .times(F.when(F.pref("vault"), F.const(1.7), F.const(0.7)))
                .clamp(0.5, 2.6).round(2),
            "跃高", {
                unit: "格",
                description: "扑跃划出的最高点；体重越重起落越沉，跃攀明显更高。画面里土迹拱起的高度就是它。"
            }),
        /** 扑跃时长：11 − 速度偏移[−2.5,3]，跃攀 +3；夹 7..18。 */
        leapTicks: seconds(
            F.base(11)
                .minus(F.stat("speed").minus(58).times(0.03).clamp(-2.5, 3))
                .plus(F.when(F.pref("vault"), F.const(3), F.const(0)))
                .clamp(7, 18).round(0),
            "扑跃时长", "从蹬地到落地要多久；速度越快扑得越急，跃攀更慢。"),
        /** 落地范围：1.0 + 体宽偏移[−0.1,0.5] + 身高偏移[−0.05,0.3]，跃攀 ×1.35；夹 0.7..2.2。 */
        impactRadius: formula(
            F.base(1.0)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.1, 0.5))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.05, 0.3))
                .times(F.when(F.pref("vault"), F.const(1.35), F.const(1)))
                .clamp(0.7, 2.2).round(2),
            "落地范围", {
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
        /** 土痕格数：6 + 体重偏移[−2,8]，跃攀 ×1.2；夹 4..16。 */
        scuffCells: formula(
            F.base(6)
                .plus(F.body("weight").minus(60).times(0.16).clamp(-2, 8))
                .times(F.when(F.pref("vault"), F.const(1.2), F.const(1)))
                .clamp(4, 16).round(0),
            "土痕格数", {
                unit: "格",
                description: "落地把多少格地表蹬翻（留下短暂土痕，之后原方块回来）；体重越重蹬得越多，跃攀更大。"
            }),
        /** 土痕停留：70 + 等级(≥28)偏移[0,40] 刻；夹 50..150。 */
        scuffTicks: seconds(
            F.base(70)
                .plus(F.level().minus(28).times(1).clamp(0, 40))
                .clamp(50, 150).round(0),
            "土痕停留", "落地蹬翻的土痕停留多久；等级越高留得越久，到期原方块回来。"),
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
        maxTargets: hidden(3)
    });

    defineDamage(rockclimbId, "ram", {}, { contact: true });

    stages(rockclimbId, [
        { level: 30, values: { ram: 96 } },
        { level: 48, values: { ram: 108, confuseChance: 0.28 } }
    ]);

    describe(rockclimbId, [
        { key: "description.0", values: ["ram","reach","impactRadius","maxTargets"] },
        { key: "description.1", values: ["confuseChance","dazeTicks","fumble"] },
        { key: "description.2", values: ["spread", "arc"] },
        { key: "description.additional", values: ["scuffCells","scuffTicks"] },
        { key: "vault.on", values: [], when: function (context) { return read(context.detail.values, ["vault"]) === true; } },
        { key: "vault.off", values: [], when: function (context) { return read(context.detail.values, ["vault"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.confuseChance"] }
    ]);
}
