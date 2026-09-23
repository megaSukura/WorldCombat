/**
 * 水流尾 / aquatail —— 参数与伤害段。
 *
 * 原生事实：Water／物理／威力 90／命中 90／PP 10／接触（Cobblemon 1.8，139 位学习者）。
 *
 * 翻译：把「如惊涛骇浪般挥动大尾巴攻击对手」落成一道**会推进的弧形浪**：施法者抡尾，身前张开一道扇面，
 *   浪头从贴身一圈圈向射程外推进；推进到的每个敌人被浪拍中、沿背离方向被推开，并湿身片刻（共享身份
 *   world_combat:status/soaked），身上的火与灼伤被这道水浇熄。浪是推进的，所以走出扇面或退到浪头之外
 *   就能躲开——原生的 90 命中在这里是位置判定。
 *   与同族分开：铁尾是锁定一点的重砸，撕裂爪是一记交叉撕甲，水流尾是一片向前压的弧形水墙。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   wave       浪威力：物攻定力，体重定水势。
 *   arc        浪的弧张角：碰撞箱宽度决定扇面铺多开。
 *   reach      尾长／射程：身高与物攻决定浪能推多远。
 *   falloff    远端保留：物攻决定浪头在射程边缘还剩几成。
 *   push       推开距离：体重决定这一浪把目标推多远。
 *   steps      推进拍数：速度决定浪头推得快不快（拍数越多越慢、越好躲）。
 *   soakTicks  湿身时长：等级与物攻决定被拍湿后留多久。
 *   splash     水花数：物攻与体重决定画面的密度，直接驱动发射量。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 heavy（沉浪）：开启＝威力 ×1.12、推开 ×1.2，但推进拍数 +1（浪更慢、更好躲）、起手 +2 刻；
 *   关闭＝更快的一浪。两向各有适用局面（快浪追人 vs 重浪推人）。
 *
 * 伤害段 wave：这一浪拍在每人身上的那一下，contact: true 交给共享结算。
 */
namespace PokemonSkills {
    export const aquatailId = "aquatail";
    export const aquatailEffect = "world_combat:aquatail_drenched";
    export const aquatailScene = "world_combat:move_aquatail";
    export const aquatailDrenchText = "world_combat.move.aquatail.text.drench";
    export const aquatailDouseText = "world_combat.move.aquatail.text.douse";
    export const aquatailMissText = "world_combat.move.aquatail.text.miss";

    actionParameters.define(aquatailId, {
        /** 浪威力：基础 78，物攻每比 60 多 1 加 0.22（夹 -16..32），体重每比 300 多 1 加 0.02（夹 -6..14）；沉浪 ×1.12；夹在 45..150。 */
        wave: formula(
            F.base(78).plus(F.stat("attack").minus(60).times(0.22).clamp(-16, 32))
                .plus(F.body("weight").minus(300).times(0.02).clamp(-6, 14))
                .times(F.when(F.pref("heavy"), F.const(1.12), F.const(1)))
                .clamp(45, 150).round(1),
            "浪威力", {
                unit: "威力",
                description: "这一浪拍在人身上的基础威力；物攻越高力越大，身体越沉水势越猛，沉浪再抬一截。对手防御、相性与暴击在命中时另算。"
            }),
        /** 浪张角：基础 110 度，身宽每比 0.9 宽 1 格加 38 度（夹 -12..40）；夹在 88..175。 */
        arc: formula(
            F.base(110).plus(F.body("width").minus(0.9).times(38).clamp(-12, 40)).clamp(88, 175).round(0),
            "浪张角", {
                unit: "度",
                description: "这一浪张开的扇形角度；身宽的个体抡得更开。画面里的弧面就是判定范围。"
            }),
        /** 尾长：基础 3.6 格，身高每比 1.4 高 1 格加 1.0 格（夹 -0.4..1.6），物攻每比 60 多 1 加 0.006（夹 -0.2..0.4）；夹在 3.0..5.4。 */
        reach: formula(
            F.base(3.6).plus(F.body("height").minus(1.4).times(1.0).clamp(-0.4, 1.6))
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.2, 0.4))
                .clamp(3.0, 5.4).round(2),
            "尾长", {
                unit: "格",
                description: "浪头最远推到哪；身高的个体尾巴甩得更远，力大的抡势更长。它也是本招的实际射程来源。"
            }),
        /** 远端保留：基础 0.6，物攻每比 60 多 1 加 0.001（夹 -0.08..0.12）；夹在 0.45..0.78。 */
        falloff: percent(
            F.base(0.6).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.08, 0.12)).clamp(0.45, 0.78).round(3),
            "远端保留", "浪头推到射程边缘时还剩的威力比例；贴身的浪最重，往外递减。"),
        /** 推开距离：基础 1.0 格，体重每比 300 多 1 加 0.004（夹 -0.3..0.8）；沉浪 ×1.2；夹在 0.6..2.0。 */
        push: formula(
            F.base(1.0).plus(F.body("weight").minus(300).times(0.004).clamp(-0.3, 0.8))
                .times(F.when(F.pref("heavy"), F.const(1.2), F.const(1)))
                .clamp(0.6, 2.0).round(2),
            "推开距离", {
                unit: "格",
                description: "被浪拍中后沿背离方向推开多远；身体越沉推得越远，沉浪推得更开。"
            }),
        /** 推进拍数：基础 6，速度每比 60 快 1 减 0.02（夹 -1.5..2.5）；沉浪 +1；夹在 3..9 并向下取整。 */
        steps: formula(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("heavy"), F.const(1), F.const(0))).clamp(3, 9).floor(),
            "推进拍数", {
                unit: "拍",
                description: "浪头从贴身推到射程外要几拍；拍数越多浪越慢、越容易被走出扇面，速度快的个体收得更快。"
            }),
        /** 湿身时长：基础 140 刻，等级每比 30 高 1 加 1.0 刻（夹 0..50），物攻每比 60 多 1 加 0.2 刻（夹 -10..30）；夹在 100..260。 */
        soakTicks: seconds(
            F.base(140).plus(F.level().minus(30).times(1.0).clamp(0, 50))
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-10, 30)).clamp(100, 260).round(0),
            "湿身时长", "被这一浪拍湿后，湿身状态留多久；等级与物攻越高水在身上挂得越久。"),
        /** 水花数：基础 14，物攻每比 60 多 1 加 0.12，体重每比 300 多 1 加 0.02，夹在 10..34 并向下取整。 */
        splash: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.12))
                .plus(F.body("weight").minus(300).times(0.02)).clamp(10, 34).floor(),
            "水花数", {
                unit: "点",
                description: "这一浪激起的水花数量；物攻与体重越高水花越密，直接驱动画面的发射量。"
            }),
        /** 起手：基础 11 刻，速度每比 60 快 1 减 0.03 刻，沉浪 +2；夹在 6..16。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("heavy"), F.const(2), F.const(0))).clamp(6, 16).round(0),
            "起手", "转身抡尾、把浪提起来的时间；速度越快越短，沉浪多花一点。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.01 刻，夹在 4..10。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.01)).clamp(4, 10).round(0),
            "收招", "一浪推完后的收势。"),
        /** 冷却：基础 40 刻，速度每比 60 快 1 减 0.06 刻，沉浪 +4；夹在 24..64。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(60).times(0.06))
                .plus(F.when(F.pref("heavy"), F.const(4), F.const(0))).clamp(24, 64).round(0),
            "冷却", "两次抡尾之间的等待；速度越快回得越快，沉浪要缓更久。")
    });

    defineDamage(aquatailId, "wave", {}, { contact: true });

    stages(aquatailId, [
        { level: 34, values: { wave: 92, push: 1.2 } },
        { level: 50, values: { wave: 104, reach: 4.2 } },
        { level: 64, values: { wave: 116 } }
    ]);

    describe(aquatailId, [
        { key: "description.0", values: ["wave","push"] },
        { key: "description.1", values: ["arc", "reach", "falloff"] },
        { key: "description.2", values: ["steps"] },
        { key: "description.3", values: ["soakTicks"] },
        { key: "description.douse", values: [] },
        { key: "description.4", values: ["pref.heavy"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wave", "tier.0.push"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wave", "tier.1.reach"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.wave"] }
    ]);
}
