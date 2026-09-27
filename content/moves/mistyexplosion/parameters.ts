namespace PokemonSkills {
    export const mistyexplosionId = "mistyexplosion";
    export const mistyexplosionScene = "world_combat:move_mistyexplosion";
    
    export const mistyexplosionTerrain = "world_combat:field/mistyterrain";
    export const mistyexplosionHitText = "world_combat.move.mistyexplosion.text.hit";
    export const mistyexplosionMissText = "world_combat.move.mistyexplosion.text.miss";

    actionParameters.define(mistyexplosionId, {
        
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
        
        blindTicks: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(0, 40))
                .plus(F.when(F.pref("denseMist"), F.const(30), F.const(0)))
                .clamp(40, 130).round(),
            "失准时长", "命中等级下降两级的持续时间；到期或驱散后收回本次削弱。"),
        
        mistRadius: formula(
            F.base(3.6).plus(F.stat("specialAttack").minus(60).times(0.015).clamp(0, 1.4))
                .times(F.when(F.pref("denseMist"), F.const(1.3), F.const(0.8)))
                .clamp(2.6, 6.6).round(2),
            "残雾范围", {
                unit: "格",
                description: "炸裂后散开的雾视效铺多大；浓雾更广，只影响画面，不留可经营的持续危险区。"
            }),
        
        mistTicks: seconds(
            F.base(50).plus(F.level().minus(20).times(0.9).clamp(0, 40))
                .times(F.when(F.pref("denseMist"), F.const(1.3), F.const(0.85)))
                .clamp(30, 140).round(),
            "残雾停留", "炸裂后的雾视效停留多久再淡去；它不再拖慢任何目标，只控制画面停留。"),
        
        terrainBoost: formula(F.base(1.5).round(2),
            "薄雾加成", { unit: "倍", format: function (value) { return "×" + (Math.round(value * 100) / 100); },
                description: "贴地站在实际同层薄雾场地上施放时，这一爆整体乘上的倍率；原生规则固定 ×1.5。" }),
        
        burst: formula(
            F.base(60).plus(F.stat("specialAttack").times(0.6)).clamp(50, 150).round(0),
            "雾絮数量", {
                unit: "团",
                description: "雾环炸开时喷出的雾絮数量；特攻越高越密，粒子直接按它发射。"
            }),
        
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("denseMist"), F.const(3), F.const(0)))
                .clamp(10, 24).round(),
            "起手", "从收雾到炸开需要多久；这一整段可以被对手打断（打断则不花任何代价），浓雾更长。"),
        
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
        { key: "description.0", values: ["bloom","maxTargets"] },
        { key: "description.1", values: ["blastRadius"] },
        { key: "description.2", values: ["terrainBoost"] },
        { key: "description.3", values: ["blindTicks"] },
        { key: "description.4", values: [] },
        { key: "description.5", values: ["tempo","recharge"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["denseMist"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["denseMist"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bloom", "tier.0.blastRadius"] }
    ]);
}
