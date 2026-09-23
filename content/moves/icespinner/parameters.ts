/**
 * 冰旋 / icespinner —— 参数与伤害段。
 *
 * 原生事实：Ice／物理／威力 80／命中 100／PP 15／接触／60 位学习者（Cobblemon 1.8，Showdown）。
 *   描述：「脚上覆盖薄冰，旋转着撞击对手。通过旋转的动作破坏场地。」
 *
 * 翻译：把「脚上结冰、旋转撞击、破坏场地」做成**一次贴地的冰旋冲撞**——脚上结起薄冰，以自身为轴旋进目标，
 *   旋转把沿途的场地（electric／grassy／misty／psychic terrain）整片刮掉，冲过的地面留下一圈会自己化掉的冰面。
 *   它是本组唯一会移动的接触招，也是唯一会改造地面的招。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   spin     旋击威力：物攻决定旋转的力道，等级让冰层更厚。
 *   reach    冲距：速度决定起步，体型（碰撞箱高度）决定跨幅。
 *   rush     冲速：速度决定每刻推进。
 *   radius   判定半径：施法者体型。
 *   sweep    刮除半径：物攻决定旋得够不够狠，体型决定旋幅。
 *   push     击退：物攻决定这一撞顶开多远。
 *   shards   冰屑数：物攻与等级派生，驱动画面密度。
 *   frost    冰面时长：等级（冰层更耐久）；配置再调整。
 *   frostCells 冰面格数：速度（冲得越远铺得越多）。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `slick`（冰面）双向取舍：开启＝冲距 ×1.25、冲速 ×1.2、冰面存留 ×1.5、击退 ×0.7，滑得远、留得久，
 *   但本击 ×0.85、刮除半径不变；关闭（碎冰）＝本击 ×1.15、刮除半径 ×1.3、击退 ×1.4，旋得更狠，
 *   代价是冲距 ×0.8、冰面存留 ×0.6、起手 +2 刻。
 *
 * 伤害段 `spin` 走共享换算（原生类别 Physical）。
 */
namespace PokemonSkills {
    export const icespinnerId = "icespinner";
    export const icespinnerScene = "world_combat:move_icespinner";
    export const icespinnerHitText = "world_combat.move.icespinner.text.hit";
    export const icespinnerClearText = "world_combat.move.icespinner.text.clear";
    export const icespinnerMissText = "world_combat.move.icespinner.text.miss";

    // 会被这一旋刮掉的场地不再由本单元列名单：生产者用共享类别 WorldEffects.categories.terrain 声明，
    // 冰旋按类别读取，新场地自动可刮。

    actionParameters.define(icespinnerId, {
        /** 旋击威力：76 + 物攻偏移[−14,46] + 等级(≥30)偏移[0,14]，碎冰 ×1.15 / 冰面 ×0.85；夹 50..160。 */
        spin: formula(
            F.base(76)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-14, 46))
                .plus(F.level().minus(30).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("slick"), F.const(0.85), F.const(1.15)))
                .clamp(50, 160).round(1),
            "旋击威力", {
                unit: "威力",
                description: "旋转撞上目标的基础威力；物攻越高旋得越狠，等级让冰层更厚。对手防御、相性与暴击在命中时另算。碎冰式更重，冰面式更轻。"
            }),
        /** 冲距：3.2 + 速度偏移[−0.2,0.9] + 体型偏移[−0.1,0.6]，冰面 ×1.25 / 碎冰 ×0.8；夹 2.4..5.4。 */
        reach: formula(
            F.base(3.2)
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.9))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.6))
                .times(F.when(F.pref("slick"), F.const(1.25), F.const(0.8)))
                .clamp(2.4, 5.4).round(2),
            "冲距", {
                unit: "格",
                description: "从起步到停下的总位移；速度快的个体起步更远，体型大者跨幅更大。冰面式滑得更远，碎冰式更短。它也是本招的实际射程。"
            }),
        /** 冲速：0.30 + 速度偏移[−0.05,0.14]，冰面 ×1.2；夹 0.24..0.55。 */
        rush: formula(
            F.base(0.30)
                .plus(F.stat("speed").minus(55).times(0.0012).clamp(-0.05, 0.14))
                .times(F.when(F.pref("slick"), F.const(1.2), F.const(1)))
                .clamp(0.24, 0.55).round(2),
            "冲速", {
                unit: "格/刻",
                description: "贴地旋转每刻推进的距离；速度快的个体转得更急。冰面式脚下更滑、推得更快。"
            }),
        /** 判定半径：0.55 + 碰撞箱高度偏移[−0.06,0.35]；夹 0.42..1.05。 */
        radius: formula(
            F.base(0.55)
                .plus(F.body("height").minus(1.4).times(0.18).clamp(-0.06, 0.35))
                .clamp(0.42, 1.05).round(2),
            "判定半径", {
                unit: "格",
                description: "旋转撞上活体时的横向判定半径；大个子的旋更大。"
            }),
        /** 刮除半径：1.6 + 物攻偏移[0,0.8] + 体型偏移[0,0.5]，碎冰 ×1.3；夹 1.4..3.2。 */
        sweep: formula(
            F.base(1.6)
                .plus(F.stat("attack").minus(60).times(0.006).clamp(0, 0.8))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(0, 0.5))
                .times(F.when(F.pref("slick"), F.const(1.0), F.const(1.3)))
                .clamp(1.4, 3.2).round(2),
            "刮除半径", {
                unit: "格",
                description: "旋转把场地刮掉的半径；物攻越高旋得越狠、体型大者旋幅更大，碎冰式刮得更开。"
            }),
        /** 击退：0.6 + 物攻偏移[−0.1,0.9]，碎冰 ×1.4 / 冰面 ×0.7；夹 0.2..2.4。 */
        push: formula(
            F.base(0.6)
                .plus(F.stat("attack").minus(60).times(0.008).clamp(-0.1, 0.9))
                .times(F.when(F.pref("slick"), F.const(0.7), F.const(1.4)))
                .clamp(0.2, 2.4).round(2),
            "击退", {
                unit: "格",
                description: "命中时把目标沿冲击方向顶开的距离；物攻越高顶得越远。碎冰式顶得更远，冰面式几乎不推。"
            }),
        /** 冰屑数：16 + 物攻偏移[0,26] + 等级(≥30)偏移[0,10]；夹 16..52。 */
        shards: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.16).clamp(0, 26))
                .plus(F.level().minus(30).times(0.25).clamp(0, 10))
                .clamp(16, 52).round(0),
            "冰屑数", {
                unit: "片",
                description: "旋转扬起的冰屑数量，随物攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 冰面时长：100 + 等级(≥30)偏移[0,80]，冰面 ×1.5 / 碎冰 ×0.6；夹 60..260。 */
        frost: formula(
            F.base(100)
                .plus(F.level().minus(30).times(2).clamp(0, 80))
                .times(F.when(F.pref("slick"), F.const(1.5), F.const(0.6)))
                .clamp(60, 260).round(0),
            "冰面时长", {
                unit: "刻",
                description: "冲过处留下的冰面存在多久；等级越高冰层越耐久。冰面式留得久，碎冰式很快化掉。"
            }),
        /** 冰面格数：8 + 速度偏移[0,6]；夹 6..16。 */
        frostCells: formula(
            F.base(8)
                .plus(F.stat("speed").minus(55).times(0.1).clamp(0, 6))
                .clamp(6, 16).round(0),
            "冰面格数", {
                unit: "格",
                description: "冲过处铺开的冰面格数；速度快的个体铺得更多。"
            }),
        /** 起手：9 − 速度偏移[−2,3]，碎冰 +2；夹 5..16。 */
        tempo: seconds(
            F.base(9)
                .minus(F.stat("speed").minus(55).times(0.025).clamp(-2, 3))
                .plus(F.when(F.pref("slick"), F.const(0), F.const(2)))
                .clamp(5, 16).round(0),
            "起手", "脚上结冰、加速旋转需要多久；速度越快越短，碎冰式多压一拍。"),
        /** 收招：10 − 速度偏移[−2,3]；夹 5..14。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.025).clamp(-2, 3)).clamp(5, 14).round(0),
            "收招", "旋转收势、站稳的时间；速度越快收得越利落。"),
        /** 冷却：30 − 速度偏移[−5,7]，冰面 +4；夹 18..44。 */
        recharge: seconds(
            F.base(30)
                .minus(F.stat("speed").minus(55).times(0.05).clamp(-5, 7))
                .plus(F.when(F.pref("slick"), F.const(4), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "再结一次冰之间的等待；速度越快回得越快，冰面式更久。")
    });

    defineDamage(icespinnerId, "spin", {}, { contact: true });

    stages(icespinnerId, [
        { level: 34, values: { spin: 92, reach: 3.6 } },
        { level: 50, values: { spin: 104, shards: 40 } }
    ]);

    describe(icespinnerId, [
        { key: "description.0", values: ["reach","rush","spin"] },
        { key: "description.1", values: ["sweep","radius","push"] },
        { key: "description.2", values: ["frostCells","frost"] },
        { key: "slick.on", values: [], when: function (context) { return read(context.detail.values, ["slick"]) === true; } },
        { key: "slick.off", values: [], when: function (context) { return read(context.detail.values, ["slick"]) !== true; } },
        { key: "timing", values: ["range","tempo","aftercast","pp","recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spin", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spin"] }
    ]);
}
