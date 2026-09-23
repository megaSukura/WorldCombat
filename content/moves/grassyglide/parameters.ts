/**
 * 青草滑梯 / grassyglide —— 参数与伤害段。
 *
 * 原生事实：草／物理／威力 55／命中 100／PP 20／优先度 0，且**在青草场地上、施法者贴地时优先度 +1**；
 *   接触、无次要效果（Cobblemon 1.8 / Showdown）。描述「仿佛在地面上滑行般地攻击对手。在青草场地上，必定能够先制攻击」。
 *
 * 翻译：即时战斗没有回合优先度，本招把「贴地滑行 + 青草地上必定先制」翻成一记**沿地面滑出去的草浪**：
 *   起手本来就短，但脚下有青草（共享身份 world_combat:status/grassyterrain，任何来源的草地／特性都算）时，
 *   草把人托起来，起手直接归零、滑得更远更快——这就是「必定先制」的读法。滑到位用身体撞实，把目标顶开，
 *   并在落点压出一小片青草（本单元自己的场地规则 world_combat:field/grassyglide，借共享身份 grassyterrain）。
 *   这片草站得住：站在上面的贴地活体算「在青草场地上」，草属性招式更猛（共享草地结算），也是下一次瞬发的垫脚。
 *
 * 与场上最像的招分开：电光一闪是一道贴地的直线影子，不留东西；水流喷射是水柱、只浇透。
 *   青草滑梯的身份是**草浪与草地**：滑过处翻起草叶，落点长出一片真的会站人的草。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   slide           滑撞威力：物攻给份量、等级给冲势；播种式每一下略轻。
 *   dash            滑行距离：速度与等级决定滑多远，也是射程来源；在草地上 ×1.3，播种式 ×0.85。
 *   pace            每刻位移：速度决定滑得多急；草地上再快一成半。
 *   collisionRadius 判定半径：身高决定身体多宽。
 *   push            顶开距离：体重决定把目标铲开多远。
 *   tufts           草叶数量：速度与等级驱动，表现按它发射。
 *   seedRadius      草皮半径：身高与等级决定长出多大一片；播种式 ×1.6。
 *   seedTicks       草皮持续：等级与体重决定站多久；播种式 ×2.2。
 *   tempo/settle/recharge 速度决定节奏；草地让起手归零，播种式收招与冷却更久。
 *
 * 配置 `seed`（播种式）双向取舍：开启＝落点长出一大片更久的青草，可以站在上面打、把下一次滑梯变成瞬发，
 *   但滑得更短、收招与冷却更久；关闭＝纯滑，滑得更远、回得更快，只压出一小片转瞬即逝的草。
 *
 * 伤害段 `slide` 与参数同名，接触标记写在 defineDamage 上；对手防御、相性与暴击在命中时统一结算。
 * 落点的草地身份由本单元 startup.ts 的 world_combat:grassyglide_ground 承担（借 shared 身份 grassyterrain）。
 */
namespace PokemonSkills {
    export const grassyglideId = "grassyglide";
    export const grassyglideScene = "world_combat:move_grassyglide";
    export const grassyglideField = "world_combat:field/grassyglide";
    export const grassyglideGround = "world_combat:grassyglide_ground";
    export const grassyglidePlantText = "world_combat.move.grassyglide.text.plant";
    export const grassyglideMissText = "world_combat.move.grassyglide.text.miss";

    actionParameters.define(grassyglideId, {
        /** 滑撞威力：55 +（物攻 − 55）× 0.22 [−11,28] +（速度 − 55）× 0.18 [−5,18] +（等级 − 20）× 0.3 [0,9]；播种 ×0.92；夹 34..120。 */
        slide: formula(
            F.base(55)
                .plus(F.stat("attack").minus(55).times(0.22).clamp(-11, 28))
                .plus(F.stat("speed").minus(55).times(0.18).clamp(-5, 18))
                .plus(F.level().minus(20).times(0.3).clamp(0, 9))
                .times(F.when(F.pref("seed", text("worldcombat.skill.grassyglide.preference.seed")), F.const(0.92), F.const(1)))
                .clamp(34, 120).round(1),
            "滑撞威力", {
                unit: "威力",
                description: "贴地滑过去撞实的那一下；物攻给份量、速度与等级给冲势。草地本身还会让草属性招式更猛（共享草地结算），播种式每一下略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 滑行距离：4.0 +（速度 − 55）× 0.02 [−0.5,1.4] +（等级 − 20）× 0.02 [0,0.8]；草地 ×1.3；播种 ×0.85；夹 3.2..6.8。 */
        dash: formula(
            F.base(4.0)
                .plus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 1.4))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.8))
                .times(F.when(F.status("grassyterrain", text("worldcombat.skill.grassyglide.value.onGrass")), F.const(1.3), F.const(1)))
                .times(F.when(F.pref("seed", text("worldcombat.skill.grassyglide.preference.seed")), F.const(0.85), F.const(1)))
                .clamp(3.2, 6.8).round(2),
            "滑行距离", {
                unit: "格",
                description: "从起步到撞上最多滑多远，也是本招的实际射程来源；腿快的个体滑得更远，脚下有草时再远三成，播种式更短。"
            }),
        /** 每刻位移：0.9 +（速度 − 55）× 0.006 [−0.12,0.45]；草地 ×1.15；夹 0.7..1.6。 */
        pace: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.12, 0.45))
                .times(F.when(F.status("grassyterrain", text("worldcombat.skill.grassyglide.value.onGrass")), F.const(1.15), F.const(1)))
                .clamp(0.7, 1.6).round(2),
            "滑行速度", { unit: "格/刻", description: "滑行途中每刻前进的距离；草地把人托起来时更快，快到中间过程几乎看不见。" }),
        /** 判定半径：0.5 +（身高 − 1.4）× 0.10 [−0.07,0.25]；夹 0.42..0.85。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.07, 0.25)).clamp(0.42, 0.85).round(2),
            "判定半径", { unit: "格", description: "滑行途中扫过活体的横向判定半径；身板越大扫得越宽。" }),
        /** 顶开距离：0.35 +（体重 − 100）× 0.0016 [−0.08,0.35]；夹 0.15..0.75。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(100).times(0.0016).clamp(-0.08, 0.35)).clamp(0.15, 0.75).round(2),
            "顶开距离", { unit: "格", description: "撞实后把目标沿滑行方向铲开多远；身体越重铲得越远。" }),
        /** 草叶数量：18 +（速度 − 55）× 0.28 [−3,14] +（等级 − 20）× 0.3 [0,10]；夹 12..44。 */
        tufts: formula(
            F.base(18).plus(F.stat("speed").minus(55).times(0.28).clamp(-3, 14))
                .plus(F.level().minus(20).times(0.3).clamp(0, 10)).clamp(12, 44).round(0),
            "草叶数量", {
                unit: "点",
                description: "滑行翻起与命中爆开的草叶数量，也直接驱动画面的发射量；速度与等级越高翻得越密。"
            }),
        /** 草皮半径：1.4 +（身高 − 1.4）× 0.5 [−0.3,1.0] +（等级 − 20）× 0.02 [0,0.6]；播种 ×1.6；夹 1.2..3.4。 */
        seedRadius: formula(
            F.base(1.4).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("seed", text("worldcombat.skill.grassyglide.preference.seed")), F.const(1.6), F.const(1)))
                .clamp(1.2, 3.4).round(2),
            "草皮半径", { unit: "格", description: "落点长出的那片青草有多大；身板越大、等级越高越广，播种式再大六成。" }),
        /** 草皮持续：100 +（等级 − 20）× 1.5 [0,60] +（体重 − 100）× 0.1 [−10,30]；播种 ×2.2；夹 80..320 刻。 */
        seedTicks: seconds(
            F.base(100).plus(F.level().minus(20).times(1.5).clamp(0, 60))
                .plus(F.body("weight").minus(100).times(0.1).clamp(-10, 30))
                .times(F.when(F.pref("seed", text("worldcombat.skill.grassyglide.preference.seed")), F.const(2.2), F.const(1)))
                .clamp(80, 320).round(0),
            "草皮持续", "落点那片青草站多久；站在上面（贴地）的活体算「在青草场地上」。等级与体重越高、播种式越久。"),
        /** 起手：3 −（速度 − 55）× 0.02 [−0.8,1.6]；**在青草场地上归零**；夹 0..5 刻。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6))
                .times(F.when(F.status("grassyterrain", text("worldcombat.skill.grassyglide.value.onGrass")), F.const(0), F.const(1)))
                .clamp(0, 5).round(0),
            "起手", "从起念到滑出去之间的时间；脚下有青草时草把人托起，起手归零（提交即滑）——这就是「必定先制」。"),
        /** 收招：6 −（速度 − 55）× 0.02 [−0.8,1.5] + 播种 2；夹 3..9 刻。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("seed", text("worldcombat.skill.grassyglide.preference.seed")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "滑完站稳的时间；播种式要停下来把草压实，多带回一点余势。"),
        /** 冷却：20 −（速度 − 55）× 0.08 [−2,4] + 播种 8；夹 12..32 刻。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.08).clamp(-2, 4))
                .plus(F.when(F.pref("seed", text("worldcombat.skill.grassyglide.preference.seed")), F.const(8), F.const(0)))
                .clamp(12, 32).round(0),
            "冷却", "这一滑之后多久能再滑；脚下有草也不能省这几拍。播种式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(grassyglideId, "slide", {}, { contact: true });

    stages(grassyglideId, [
        { level: 18, values: { slide: 62 } },
        { level: 36, values: { slide: 74, dash: 4.6 } }
    ]);

    describe(grassyglideId, [
        { key: "description.0", values: ["slide", "collisionRadius"] },
        { key: "description.1", values: ["dash","pace","push"] },
        { key: "description.2", values: ["seedRadius","seedTicks"] },
        { key: "description.grass", values: [] },
        { key: "seed.on", values: [], when: function (context) { return read(context.detail.values, ["seed"]) === true; } },
        { key: "seed.off", values: [], when: function (context) { return read(context.detail.values, ["seed"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slide"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slide", "tier.1.dash"] }
    ]);
}
