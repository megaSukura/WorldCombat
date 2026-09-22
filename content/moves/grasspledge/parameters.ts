/**
 * 草之誓约 / grasspledge 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，取自带 Showdown 数据）：Grass／特殊／威力 80／命中 100／PP 10／优先度 0／
 *   非接触；与火之誓约、水之誓约组合时威力升到 150，并按组合把场地变成火海／湿地。
 *
 * 翻译：一根藤蔓与草叶从选定点炸土而出的**草柱**：柱体对范围内每个敌人结算一次特殊伤害、缠住他们并拖慢；
 *   柱脚留一圈盘绕的誓约印（本单元场地规则 `world_combat:field/pledge_grass`），站在上面的敌人持续被拖慢。
 *   落点附近已有火或水的誓约印时共鸣：这一击威力 ×`comboPower`，并把周围变成**火海**（草＋火）或
 *   **湿地**（草＋水）——组合产物按另一元素的身份决定，与原生一致。
 *
 * 数值来源（每项读不同的个体数据）：
 *   pillar       草柱威力：特攻 + 等级；配置 entangle 再调 0.94／1.06。
 *   pillarRadius 草柱半径：体型高度 + 体重（藤蔓越铺越开）。
 *   pillarHeight 草柱高度：**亲密度**——越亲近的队伍伙伴，草柱长得越高。
 *   rootTicks    缠住时长：等级；配置 entangle ×1.5。
 *   slowTicks    拖慢时长：特攻。
 *   markRadius   誓约印半径：体重。
 *   markTicks    誓约印停留：亲密度（伙伴羁绊让它缠得更久）；配置 entangle ×0.8／×1.2。
 *   reach        施放距离：特攻。
 *   comboDetect  共鸣判定半径：特攻。
 *   comboScale   组合场半径倍率：特攻；配置 entangle 再调。
 *   comboPower   组合威力倍率：特攻。
 *   burst        草叶数量：特攻（同时驱动粒子数）。scarCells 地面盘根块数：特攻。
 *   tempo 起手：速度。recharge 冷却：等级；配置 entangle +10／−4。
 *
 * 配置 `entangle`（缠誓）：开启＝缠住 ×1.5、威力 ×0.94、誓约印 ×0.8、冷却 +10；关闭（茂誓）＝威力 ×1.06、
 *   誓约印 ×1.2、冷却更短。两向各有适用局面：缠誓锁人，茂誓铺得久、打得重。
 *
 * 伤害段 `pillar` 与参数同名，走共享换算（原生类别 Special、Grass 属性）。
 */
namespace PokemonSkills {
    export const grasspledgeId = "grasspledge";
    export const grasspledgeScene = "world_combat:move_grasspledge";
    export const grasspledgeScar = "world_combat:field/pledge_grass";
    /** 草＋火 → 火海；草＋水 → 湿地。 */
    export const grasspledgeSea = "world_combat:field/grasspledge_seaoffire";
    export const grasspledgeWetland = "world_combat:field/grasspledge_wetland";
    export const grasspledgeHitText = "world_combat.move.grasspledge.text.hit";
    export const grasspledgeComboText = "world_combat.move.grasspledge.text.combo";
    export const grasspledgeMissText = "world_combat.move.grasspledge.text.miss";

    actionParameters.define(grasspledgeId, {
        /** 草柱威力：68 + 特攻偏移[−22,66] + 等级偏移[0,26]；缠誓 ×0.94 / 茂誓 ×1.06；夹 54..168。 */
        pillar: formula(
            F.base(68)
                .plus(F.stat("specialAttack").minus(60).times(0.85).clamp(-22, 66))
                .plus(F.level().minus(20).times(0.55).clamp(0, 26))
                .times(F.when(F.pref("entangle"), F.const(0.94), F.const(1.06)))
                .clamp(54, 168).round(1),
            "草柱威力", {
                unit: "威力",
                description: "草柱对柱内每个敌人结算一次的基础威力；特攻越高、等级越高越重。命中时与另一誓约共鸣还会整体放大。对手防御、相性与暴击在命中时另算。"
            }),
        /** 草柱半径：1.4 + 高度偏移[−0.2,0.6] + 体重偏移[−0.15,0.7]；夹 1.1..2.9。 */
        pillarRadius: formula(
            F.base(1.4)
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.6))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.15, 0.7))
                .clamp(1.1, 2.9).round(2),
            "草柱半径", {
                unit: "格",
                description: "草柱炸开多大一圈；个子高、身体沉的个体藤蔓铺得更开，也决定画面里那丛柱的粗细。"
            }),
        /** 草柱高度：3.6 + 亲密度偏移[−0.4,1.6]；夹 2.8..6.2。 */
        pillarHeight: formula(
            F.base(3.6).plus(F.individual("friendship").minus(70).times(0.006).clamp(-0.4, 1.6)).clamp(2.8, 6.2).round(1),
            "草柱高度", {
                unit: "格",
                description: "草柱从地面窜多高，也是判定覆盖的竖直范围；和训练家越亲近的个体长得越高。"
            }),
        /** 缠住时长：24 + 等级偏移[0,20]；缠誓 ×1.5；夹 20..48 tick。 */
        rootTicks: seconds(
            F.base(24).plus(F.level().minus(20).times(0.2).clamp(0, 20))
                .times(F.when(F.pref("entangle"), F.const(1.5), F.const(1)))
                .clamp(20, 48).round(),
            "缠住时长", "被草柱缠住的敌人多久动不了；等级越高、缠誓越久。"),
        /** 拖慢时长：60 + 特攻偏移[0,40]；夹 50..130 tick。 */
        slowTicks: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(0, 40)).clamp(50, 130).round(),
            "拖慢时长", "被缠住后移动被拖慢多久；特攻越高缠得越久。"),
        /** 誓约印半径：1.8 + 体重偏移[−0.2,0.6]；夹 1.4..3.0。 */
        markRadius: formula(
            F.base(1.8).plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.6)).clamp(1.4, 3.0).round(2),
            "誓约印半径", {
                unit: "格",
                description: "柱脚下那圈盘绕的誓约印覆盖多大；身体越沉印越宽，也决定地面盘根的范围。"
            }),
        /** 誓约印停留：200 + 亲密度偏移[−30,90]；缠誓 ×0.8 / 茂誓 ×1.2；夹 110..360 tick。 */
        markTicks: seconds(
            F.base(200).plus(F.individual("friendship").minus(70).times(1.2).clamp(-30, 90))
                .times(F.when(F.pref("entangle"), F.const(0.8), F.const(1.2)))
                .clamp(110, 360).round(),
            "誓约印停留", "这圈盘绕的印留多久；站在上面的敌人会持续被拖慢。亲密度越高留得越久。"),
        /** 施放距离：9 + 特攻偏移[−1.5,5]；夹 7..15。 */
        reach: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1.5, 5)).clamp(7, 15).round(1),
            "施放距离", {
                unit: "格",
                description: "能把草柱call到多远；特攻高的个体够得更远。"
            }),
        /** 共鸣判定半径：3.2 + 特攻偏移[0,1.2]；夹 2.6..5.0。 */
        comboDetect: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 1.2)).clamp(2.6, 5.0).round(2),
            "共鸣判定半径", {
                unit: "格",
                description: "落点附近多大范围内若有火或水的誓约印就会共鸣；特攻越高越容易呼应。"
            }),
        /** 组合场半径倍率：1.9 + 特攻偏移[0,0.9]，缠誓 ×1.1 / 茂誓 ×0.95；夹 1.6..3.1。 */
        comboScale: formula(
            F.base(1.9).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 0.9))
                .times(F.when(F.pref("entangle"), F.const(1.1), F.const(0.95)))
                .clamp(1.6, 3.1).round(2),
            "组合场倍率", {
                unit: "倍",
                description: "共鸣时火海／湿地的半径相对誓约印放大多少；特攻越高场地越广。"
            }),
        /** 组合威力倍率：1.7 + 特攻偏移[0,0.5]；夹 1.7..2.2。 */
        comboPower: formula(
            F.base(1.7).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(0, 0.5)).clamp(1.7, 2.2).round(2),
            "组合威力倍率", {
                unit: "倍",
                description: "与另一誓约共鸣时这一击整体乘上的倍率；原生组合把 80 抬到 150，这里翻成 ×1.7 起。"
            }),
        /** 草叶数量：46 + 特攻 ×0.5；夹 38..118。直接驱动画面密度。 */
        burst: formula(
            F.base(46).plus(F.stat("specialAttack").times(0.5)).clamp(38, 118).round(0),
            "草叶数量", {
                unit: "片",
                description: "草柱炸开时喷出的草叶数量；特攻越高越密，粒子直接按它发射。"
            }),
        /** 地面盘根块数：10 + 特攻 ×0.06；夹 8..20。 */
        scarCells: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.06)).clamp(8, 20).round(0),
            "地面盘根块数", {
                unit: "块",
                description: "柱脚把地表盘成草皮的块数；随特攻增长，也决定盘根的密度。"
            }),
        /** 起手：10 − 速度偏移[−3,3]；夹 6..16 tick。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 3)).clamp(6, 16).round(),
            "起手", "从聚草到草柱炸土而出需要多久；速度越快越短。"),
        /** 冷却：78 − 等级偏移[0,20] + 缠誓 10 / 茂誓 −4；夹 50..118 tick。 */
        recharge: seconds(
            F.base(78).minus(F.level().minus(20).times(0.5).clamp(0, 20))
                .plus(F.when(F.pref("entangle"), F.const(10), F.const(-4)))
                .clamp(50, 118).round(),
            "冷却", "一次誓约后要等多久；等级越高回手越快，缠誓更久、茂誓更快。"),
        maxTargets: hidden(6)
    });

    stages(grasspledgeId, [
        { level: 38, values: { pillar: 92 } },
        { level: 56, values: { pillar: 114 } }
    ]);

    defineDamage(grasspledgeId, "pillar", { defenceCoefficient: 0.004, rationale: "草柱对防御的穿透略强于默认，让特攻与亲密的差别更可见。" });

    describe(grasspledgeId, [
        { key: "description.0", values: ["pillar"] },
        { key: "description.1", values: ["pillarRadius", "pillarHeight", "rootTicks"] },
        { key: "description.2", values: ["markRadius", "markTicks", "slowTicks"] },
        { key: "description.3", values: ["comboDetect", "comboPower"] },
        { key: "description.4", values: ["reach", "tempo"] },
        { key: "entangle.on", values: [], when: function (context) { return read(context.detail.values, ["entangle"]) === true; } },
        { key: "entangle.off", values: [], when: function (context) { return read(context.detail.values, ["entangle"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pillar"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pillar"] }
    ]);
}
