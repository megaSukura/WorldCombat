/**
 * 薄雾炸裂 / mistyexplosion 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，取自带 Showdown 数据）：Fairy／特殊／威力 100／命中 100／PP 5／优先度 0／
 *   target allAdjacent（自己周围所有宝可梦）／`selfdestruct: "always"`（用完自己陷入濒死）／
 *   站在薄雾场地上威力 ×1.5。
 *
 * 翻译：把身体当场放成**一朵铺开的薄雾**：起手粉雾在脚边收拢、身体发亮；提交后雾环贴着地面向外炸开，
 *   圈内所有非友方挨一次 `bloom` 并被迷雾夺去视线（`minecraft:blindness`），施法者随之倒下。
 *   雾不是火药——它不炸坑、只铺地：炸裂后原地留下一片持续的薄雾（规则 `world_combat:field/mistyexplosion_mist`），
 *   站在里面的敌人被拖慢。与大爆炸分开：那一发毁地、掀飞、无属性加成；这一发铺雾、致盲、并在薄雾上更重。
 *
 * 数值来源（每项读不同的个体数据）：
 *   bloom        迷雾威力：特攻 + 等级；在薄雾中 ×`terrainBoost`（原生 ×1.5）；配置 denseMist 再调 0.92／1.08。
 *   blastRadius  雾环半径：特攻 + 体型高度；配置 denseMist ×1.05／×0.95。
 *   blindTicks   致盲时长：特攻；配置 denseMist +30／+0。
 *   mistRadius   残雾半径：特攻；配置 denseMist ×1.3／×0.8。
 *   mistTicks    残雾停留：等级；配置 denseMist ×1.3／×0.85。
 *   terrainBoost 薄雾加成：固定 1.5（原生规则）。
 *   burst        雾絮数量：特攻（同时驱动粒子数）。
 *   tempo        起手：速度；配置 denseMist +3。
 *   recharge     冷却：等级；配置 denseMist +10／−6。
 *
 * 配置 `denseMist`（浓雾）：开启＝残雾半径 ×1.3、停留 ×1.3、致盲 +30t，但这一爆威力 ×0.92、起手 +3、冷却 +10——
 *   把一次爆发换成一整片持续控制的雾；关闭（薄爆）＝威力 ×1.08、残雾 ×0.8，炸得更脆更快。
 *
 * 伤害段 `bloom` 与参数同名，走共享换算（原生类别 Special、Fairy 属性）。
 */
namespace PokemonSkills {
    export const mistyexplosionId = "mistyexplosion";
    export const mistyexplosionScene = "world_combat:move_mistyexplosion";
    /** 炸裂后留下的残雾（只由本单元注册；薄雾场地单元按自己的规则另算）。 */
    export const mistyexplosionMist = "world_combat:field/mistyexplosion_mist";
    /** 已有薄雾场地的规则名（跨单元识别，字符串常量不依赖对方是否装载）。 */
    export const mistyexplosionTerrain = "world_combat:field/mistyterrain";
    export const mistyexplosionHitText = "world_combat.move.mistyexplosion.text.hit";
    export const mistyexplosionMissText = "world_combat.move.mistyexplosion.text.miss";

    actionParameters.define(mistyexplosionId, {
        /** 迷雾威力：100 + 特攻偏移[−28,84] + 等级偏移[0,20]；薄雾中 ×terrainBoost；浓雾 ×0.92 / 薄爆 ×1.08；夹 80..235。 */
        bloom: formula(
            F.base(100)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-28, 84))
                .plus(F.level().minus(20).times(0.45).clamp(0, 20))
                .times(F.when(F.pref("denseMist"), F.const(0.92), F.const(1.08)))
                .clamp(80, 235).round(1),
            "迷雾威力", {
                unit: "威力",
                description: "这一爆对圈内每个敌人的基础威力；特攻越高、等级越高越重，在薄雾上还会整体放大。对手防御、相性与暴击在命中时另算。"
            }),
        /** 雾环半径：4.4 + 特攻偏移[−0.5,2.0] + 高度偏移[−0.4,1.2]；浓雾 ×1.05 / 薄爆 ×0.95；夹 3.2..7.2。 */
        blastRadius: formula(
            F.base(4.4)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 2.0))
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.4, 1.2))
                .times(F.when(F.pref("denseMist"), F.const(1.05), F.const(0.95)))
                .clamp(3.2, 7.2).round(2),
            "雾环半径", {
                unit: "格",
                description: "薄雾一圈炸开罩住多大；特攻越高、身体越高炸得越开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 致盲时长：60 + 特攻偏移[0,40]；浓雾 +30 / 薄爆 +0；夹 40..130 tick。 */
        blindTicks: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(0, 40))
                .plus(F.when(F.pref("denseMist"), F.const(30), F.const(0)))
                .clamp(40, 130).round(),
            "致盲时长", "被迷雾夺去视线多久；清雾之后看得见，但那时已经挨完了这一爆。"),
        /** 残雾半径：3.6 + 特攻偏移[0,1.4]；浓雾 ×1.3 / 薄爆 ×0.8；夹 2.6..6.6。 */
        mistRadius: formula(
            F.base(3.6).plus(F.stat("specialAttack").minus(60).times(0.015).clamp(0, 1.4))
                .times(F.when(F.pref("denseMist"), F.const(1.3), F.const(0.8)))
                .clamp(2.6, 6.6).round(2),
            "残雾半径", {
                unit: "格",
                description: "炸裂后原地留下的雾铺多大；浓雾更广，也决定地面雾的范围。"
            }),
        /** 残雾停留：200 + 等级偏移[0,140]；浓雾 ×1.3 / 薄爆 ×0.85；夹 140..420 tick。 */
        mistTicks: seconds(
            F.base(200).plus(F.level().minus(20).times(3).clamp(0, 140))
                .times(F.when(F.pref("denseMist"), F.const(1.3), F.const(0.85)))
                .clamp(140, 420).round(),
            "残雾停留", "这片雾留多久；站在里面的敌人会持续被拖慢。"),
        /** 薄雾加成：固定 1.5（原生规则）。 */
        terrainBoost: formula(F.base(1.5).round(2),
            "薄雾加成", { unit: "倍", format: function (value) { return "×" + (Math.round(value * 100) / 100); },
                description: "站在薄雾场地上（薄雾场地单元或本招留下的残雾）施放时，这一爆整体乘上的倍率；原生规则固定 ×1.5。" }),
        /** 雾絮数量：60 + 特攻 ×0.6；夹 50..150。直接驱动画面密度。 */
        burst: formula(
            F.base(60).plus(F.stat("specialAttack").times(0.6)).clamp(50, 150).round(0),
            "雾絮数量", {
                unit: "团",
                description: "雾环炸开时喷出的雾絮数量；特攻越高越密，粒子直接按它发射。"
            }),
        /** 起手：14 − 速度偏移[−3,4] + 浓雾 3；夹 10..24 tick。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("denseMist"), F.const(3), F.const(0)))
                .clamp(10, 24).round(),
            "起手", "从收雾到炸开需要多久；这一整段可以被对手打断（打断则不花任何代价），浓雾更长。"),
        /** 冷却：95 − 等级偏移[0,20] + 浓雾 10 / 薄爆 −6；夹 65..150 tick。 */
        recharge: seconds(
            F.base(95).minus(F.level().minus(20).times(0.5).clamp(0, 20))
                .plus(F.when(F.pref("denseMist"), F.const(10), F.const(-6)))
                .clamp(65, 150).round(),
            "冷却", "一次炸裂后要等多久；等级越高回手越快，浓雾更久、薄爆更快。无论哪个方向，使用者都会倒下。"),
        maxTargets: hidden(14)
    });

    stages(mistyexplosionId, [
        { level: 46, values: { bloom: 132, blastRadius: 5.0, burst: 84 } }
    ]);

    defineDamage(mistyexplosionId, "bloom", { defenceCoefficient: 0.0045, rationale: "妖精薄雾的爆发对防御的穿透略强于默认，让特攻与体型的差别更可见。" });

    describe(mistyexplosionId, [
        { key: "description.0", values: ["bloom"] },
        { key: "description.1", values: ["blastRadius"] },
        { key: "description.2", values: ["terrainBoost"] },
        { key: "description.3", values: ["blindTicks"] },
        { key: "description.4", values: ["mistRadius", "mistTicks"] },
        { key: "description.5", values: ["tempo", "recharge"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["denseMist"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["denseMist"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bloom", "tier.0.blastRadius"] }
    ]);
}
