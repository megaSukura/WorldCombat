/**
 * 冰砾 / iceshard —— 参数与伤害段。
 *
 * 原生事实：冰／物理／威力 40／命中 100／PP 30／优先度 +1／不接触、无次要效果（Cobblemon 1.8 / Showdown）。
 *   描述「瞬间制作冰块，快速地扔向对手。必定能够先制攻击」。
 *
 * 翻译：本招把「瞬间制冰、快速扔出」翻成一记**当场结出、贴直线掷出的冰砾**——起手最短（几乎瞬发），
 *   冰砾高速直线飞出，撞上谁就把那一处炸成冰碴、并把击中的目标**冻得发僵**（共享身份 chill，借冰锤／冰冻拳等的同一身份）；
 *   落点还会把脚下那一片地面**冻出薄冰**（租借，linger，到期原方块回来），踩上去会滑——这就是「瞬间制作冰块」留在世界里的样子。
 *   它是本族唯一的远程物理招。
 *
 * 与场上最像的招分开：冰冻光束是等待蓄力的贯穿光束、按特殊结算、冻成一条线；冰锥是多枚追身细锥。
 *   冰砾只有一枚、瞬发、按物理结算，落点冻出的是**一小块薄冰**而不是一条线。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   shard       冰砾威力：物攻给分量、速度给掷速；碎冰式每一下略轻。
 *   reach       掷程（也是射程）：速度与等级决定扔多远；碎冰式更近。
 *   velocity    飞行速度：速度决定掷得多快，目标越难闪。
 *   radius      判定半径：身高决定冰砾多粗。
 *   chillTicks  冻僵时长：等级与体重决定僵多久。
 *   frostRadius 薄冰半径：身高与等级决定冻多大一片；碎冰式更大。
 *   frostTicks  薄冰持续：等级决定留多久；碎冰式更久。
 *   splinters   冰碴数量：速度与等级驱动，表现按它发射。
 *   splash/splashRadius 碎冰式：崩到周围的人各吃一记按物攻换算的溅射，范围随物攻略增。
 *   tempo/settle/recharge 速度决定节奏；碎冰式更慢更费。
 *
 * 配置 `shatter`（碎冰式）双向取舍：开启＝命中时崩碎，溅到周围一小圈敌人（各按 splash 系数）、薄冰更大更久，
 *   但飞行更慢、射程更近、收招与冷却更久；关闭＝单发硬冰砾，飞得快、扔得远、回得快。一个换「炸开一片」，一个换「点掉一个」。
 *
 * 伤害段 `shard` 与参数同名，走共享物理换算；对手防御、相性与暴击在命中时统一结算。
 * 冻僵用的载体 world_combat:iceshard_chill 在 startup.ts 注册并打共享身份 chill（identity_only）。
 */
namespace PokemonSkills {
    export const iceshardId = "iceshard";
    export const iceshardScene = "world_combat:move_iceshard";
    export const iceshardChillEffect = "world_combat:iceshard_chill";
    export const iceshardChillText = "world_combat.move.iceshard.text.chill";
    export const iceshardMissText = "world_combat.move.iceshard.text.miss";

    actionParameters.define(iceshardId, {
        /** 冰砾威力：40 +（物攻 − 55）× 0.24 [−10,26] +（速度 − 55）× 0.12 [−4,14]；碎冰 ×0.85；夹 26..100。 */
        shard: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.24).clamp(-10, 26))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-4, 14))
                .times(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(0.85), F.const(1)))
                .clamp(26, 100).round(1),
            "冰砾威力", {
                unit: "威力",
                description: "冰砾砸实的那一下；物攻给分量、速度给掷速。碎冰式每一下略轻，把力量分给了崩溅。对手防御、相性与暴击在命中时另算。"
            }),
        /** 掷程：11 +（速度 − 55）× 0.03 [−1.2,2.4] +（等级 − 20）× 0.04 [0,1.6]；碎冰 −2；夹 8..16。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1.2, 2.4))
                .plus(F.level().minus(20).times(0.04).clamp(0, 1.6))
                .minus(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(2), F.const(0)))
                .clamp(8, 16).round(1),
            "掷程", {
                unit: "格",
                description: "冰砾最远能扔到哪，也是本招的实际射程来源；腿快的个体扔得更远，碎冰式更近。"
            }),
        /** 飞行速度：1.6 +（速度 − 55）× 0.008 [−0.2,0.5]；碎冰 ×0.85；夹 1.2..2.4。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5))
                .times(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(0.85), F.const(1)))
                .clamp(1.2, 2.4).round(2),
            "飞行速度", { unit: "格/刻", description: "冰砾飞得多急；速度快的个体扔得更快，目标越难走位躲开。碎冰式更沉、飞得更慢。" }),
        /** 判定半径：0.22 +（身高 − 1.4）× 0.05 [−0.04,0.14]；夹 0.18..0.44。 */
        radius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.14)).clamp(0.18, 0.44).round(2),
            "判定半径", { unit: "格", description: "冰砾飞行与命中的判定粗细；体型越高冰砾越粗。画面里的冰砾大小就是它。" }),
        /** 冻僵时长：40 +（等级 − 20）× 0.6 [0,30] +（体重 − 100）× 0.05 [−5,15]；夹 30..110 刻。 */
        chillTicks: seconds(
            F.base(40).plus(F.level().minus(20).times(0.6).clamp(0, 30))
                .plus(F.body("weight").minus(100).times(0.05).clamp(-5, 15)).clamp(30, 110).round(0),
            "冻僵时长", "被冰砾砸中后冻得发僵（共享身份 chill）挂多久；等级与体重越高僵得越久，移动更慢。"),
        /** 薄冰半径：1.2 +（身高 − 1.4）× 0.4 [−0.2,0.8] +（等级 − 20）× 0.015 [0,0.5]；碎冰 ×1.5；夹 1.0..2.6。 */
        frostRadius: formula(
            F.base(1.2).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.8))
                .plus(F.level().minus(20).times(0.015).clamp(0, 0.5))
                .times(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(1.5), F.const(1)))
                .clamp(1.0, 2.6).round(2),
            "薄冰半径", { unit: "格", description: "落点冻出的薄冰有多大一片（会滑的真实方块）；身板越大、等级越高越广，碎冰式更大。" }),
        /** 薄冰持续：80 +（等级 − 20）× 1.2 [0,48]；碎冰 ×1.4；夹 60..220 刻。 */
        frostTicks: seconds(
            F.base(80).plus(F.level().minus(20).times(1.2).clamp(0, 48))
                .times(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(1.4), F.const(1)))
                .clamp(60, 220).round(0),
            "薄冰持续", "落点那片薄冰留多久；到期原方块回来。等级越高、碎冰式越久。"),
        /** 冰碴数量：16 +（速度 − 55）× 0.26 [−3,12] +（等级 − 20）× 0.3 [0,8]；夹 12..40。 */
        splinters: formula(
            F.base(16).plus(F.stat("speed").minus(55).times(0.26).clamp(-3, 12))
                .plus(F.level().minus(20).times(0.3).clamp(0, 8)).clamp(12, 40).round(0),
            "冰碴数量", {
                unit: "点",
                description: "冰砾飞行拖尾与命中炸开的冰碴数量，也直接驱动画面的发射量；速度与等级越高越密。"
            }),
        /** 溅射系数：0.5 +（物攻 − 55）× 0.002 [−0.05,0.15]；夹 0.4..0.7。只有碎冰式用到。 */
        splash: percent(
            F.base(0.5).plus(F.stat("attack").minus(55).times(0.002).clamp(-0.05, 0.15)).clamp(0.4, 0.7),
            "溅射系数", "碎冰式崩到的周围敌人各吃主伤害的这个比例；物攻越高崩得越重。"),
        /** 溅射半径：1.5 +（物攻 − 55）× 0.006 [−0.2,0.6]；夹 1.2..2.6。只有碎冰式用到。 */
        splashRadius: formula(
            F.base(1.5).plus(F.stat("attack").minus(55).times(0.006).clamp(-0.2, 0.6)).clamp(1.2, 2.6).round(2),
            "溅射半径", { unit: "格", description: "碎冰式在命中点崩开多大一圈；物攻越高崩得越广。" }),
        /** 起手：1 −（速度 − 55）× 0.01 [−0.5,0.9]；夹 0..3 刻。 */
        tempo: seconds(
            F.base(1).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.5, 0.9)).clamp(0, 3).round(0),
            "起手", "从结冰到掷出去之间的时间；几乎瞬发，这就是「先制」。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.8,1.5] + 碎冰 2；夹 3..9 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "掷完站稳的时间；碎冰式要把崩碎的余势收回，慢一点。"),
        /** 冷却：16 −（速度 − 55）× 0.07 [−2,3] + 碎冰 8；夹 10..28 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.07).clamp(-2, 3))
                .plus(F.when(F.pref("shatter", text("worldcombat.skill.iceshard.preference.shatter")), F.const(8), F.const(0)))
                .clamp(10, 28).round(0),
            "冷却", "再结一块冰砾前等待多久；本招很短，碎冰式更长。")
    });

    defineDamage(iceshardId, "shard", {}, {});

    stages(iceshardId, [
        { level: 18, values: { shard: 50 } },
        { level: 36, values: { shard: 62, reach: 12.5 } }
    ]);

    describe(iceshardId, [
        { key: "description.0", values: ["shard", "radius"] },
        { key: "description.1", values: ["reach", "velocity", "chillTicks"] },
        { key: "description.2", values: ["frostRadius", "frostTicks"] },
        { key: "shatter.on", values: ["splash", "splashRadius"], when: function (context) { return read(context.detail.values, ["shatter"]) === true; } },
        { key: "shatter.off", values: [], when: function (context) { return read(context.detail.values, ["shatter"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shard"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shard", "tier.1.reach"] }
    ]);
}
