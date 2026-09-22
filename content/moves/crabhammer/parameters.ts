/**
 * 蟹钳锤 / crabhammer —— 参数与伤害段。
 *
 * 原生事实：Water／物理／威力 100／命中 90／PP 10／接触／critRatio 2（Cobblemon 1.8，11 位学习者）。
 * 原生描述：「用大钳子敲打对手进行攻击，容易击中要害」。
 *
 * 翻译：把「用大钳子敲打」落成**一次高举过顶、慢而重地下砸**：钳口带着水光抡起（长前摇，可被打断），砸中的
 *   那一下是本组最重的单发；砸地的同时地面荡开一圈水浪，把落点附近的其他敌人一并掀开。裂甲档位下这一砸还会
 *   把目标的架势敲裂（物防 −1 级），代价是更慢、更轻。它与水流尾分开：水流尾是一片向前压的弧形水墙，
 *   蟹钳锤是一记垂直下砸加地面水环。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   slam        砸击威力：物攻定锤面，体重定下砸的份量，等级定发力。
 *   shock       水环威力：体重与物攻决定地面水环掀到旁人身上的力度。
 *   reach       出手距离：身高与速度决定钳子够到多远；很短。
 *   shockRadius 水环半径：体重决定水环铺多广。
 *   shove       掀开距离：体重决定水环把旁人推多远。
 *   splash      水花数量：体重与物攻决定画面密度，直接驱动发射量。
 *   crackStages 裂甲级数：裂甲式下砸裂目标物防的级数（否则为 0）。
 *   windupTicks 前摇：速度决定抡起多久；裂甲式更久。
 *   tempo／aftercast／recharge 时序：速度决定收招与冷却；裂甲式更缓。
 *
 * 配置 crack（裂甲）：开启＝命中时目标物防 −1 级、水环半径 ×1.1，代价是砸击威力 ×0.94、前摇 +2 刻、冷却 +6 刻；
 *   关闭＝重锤式，砸击威力 ×1.06、水环更小更浅、出手更快，代价是没有任何破甲效果。
 *
 * 伤害段 slam：钳子砸实的那一下（接触）；shock：地面水环掀到旁人身上的溅射。
 */
namespace PokemonSkills {
    export const crabhammerId = "crabhammer";
    export const crabhammerScene = "world_combat:move_crabhammer";
    export const crabhammerCrackText = "world_combat.move.crabhammer.text.crack";
    export const crabhammerMissText = "world_combat.move.crabhammer.text.miss";

    actionParameters.define(crabhammerId, {
        /** 砸击威力：基础 80，物攻每比 60 多 1 加 0.34（夹 -16..38），体重每比 300 多 1 加 0.02（夹 -6..16），等级每比 30 高 1 加 0.2（夹 -6..12）；裂甲 ×0.94 / 重锤 ×1.06；夹在 52..140。 */
        slam: formula(
            F.base(80).plus(F.stat("attack").minus(60).times(0.34).clamp(-16, 38))
                .plus(F.body("weight").minus(300).times(0.02).clamp(-6, 16))
                .plus(F.level().minus(30).times(0.2).clamp(-6, 12))
                .times(F.when(F.pref("crack"), F.const(0.94), F.const(1.06)))
                .clamp(52, 140).round(1),
            "砸击威力", {
                unit: "威力",
                description: "钳子垂直下砸的基础威力；物攻定锤面、体重定份量、等级定发力，重锤式更重、裂甲式略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 水环威力：基础 26，体重每比 300 多 1 加 0.015（夹 -4..12），物攻每比 60 多 1 加 0.1（夹 -5..12）；夹在 14..48。 */
        shock: formula(
            F.base(26).plus(F.body("weight").minus(300).times(0.015).clamp(-4, 12))
                .plus(F.stat("attack").minus(60).times(0.1).clamp(-5, 12))
                .clamp(14, 48).round(1),
            "水环威力", {
                unit: "威力",
                description: "砸地时地面水环掀到旁人身上的威力；身体越沉、力越大，水环越有力。"
            }),
        /** 出手距离：基础 2.6 格，身高每比 1.4 高 1 加 0.5（夹 -0.25..0.6），速度每比 55 快 1 加 0.005（夹 -0.15..0.3）；夹在 2.2..3.4。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.25, 0.6))
                .plus(F.stat("speed").minus(55).times(0.005).clamp(-0.15, 0.3))
                .clamp(2.2, 3.4).round(2),
            "出手距离", {
                unit: "格",
                description: "钳子够到多近才砸得实；身高与速度决定范围。它也是本招的实际射程来源。"
            }),
        /** 水环半径：基础 2.0 格，体重每比 300 多 1 加 0.002（夹 -0.4..1.2）；裂甲 ×1.1；夹在 1.6..3.2。 */
        shockRadius: formula(
            F.base(2.0).plus(F.body("weight").minus(300).times(0.002).clamp(-0.4, 1.2))
                .times(F.when(F.pref("crack"), F.const(1.1), F.const(1)))
                .clamp(1.6, 3.2).round(2),
            "水环半径", {
                unit: "格",
                description: "砸地后地面水环铺开的半径；身体越沉铺得越广，裂甲式再铺开一截。画出的圈就是会被掀到的地方。"
            }),
        /** 掀开距离：基础 0.9 格，体重每比 300 多 1 加 0.002（夹 -0.3..0.9）；夹在 0.5..1.8。 */
        shove: formula(
            F.base(0.9).plus(F.body("weight").minus(300).times(0.002).clamp(-0.3, 0.9)).clamp(0.5, 1.8).round(2),
            "掀开距离", {
                unit: "格",
                description: "水环把被掀到的敌人沿背离方向推多远；身体越沉推得越开。"
            }),
        /** 水花数量：基础 18，体重每比 300 多 1 加 0.02（夹 -4..14），物攻每比 60 多 1 加 0.08（夹 -5..12）；夹在 12..40 并向下取整。 */
        splash: formula(
            F.base(18).plus(F.body("weight").minus(300).times(0.02).clamp(-4, 14))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-5, 12)).clamp(12, 40).floor(),
            "水花数量", {
                unit: "点",
                description: "砸地激起的浪花数量；体重与物攻越高浪花越密，直接驱动画面的发射量。"
            }),
        /** 裂甲级数：裂甲式 1 级、重锤式 0 级。 */
        crackStages: formula(
            F.when(F.pref("crack"), F.const(1), F.const(0)).round(0),
            "裂甲级数", {
                unit: "级",
                description: "砸中时敲裂目标物防的级数；只有在裂甲档位下才不为零。"
            }),
        /** 前摇：基础 16 刻，速度每比 55 快 1 减 0.05 刻（夹 -4..8），裂甲 +2；夹在 10..24。 */
        windupTicks: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 8))
                .plus(F.when(F.pref("crack"), F.const(2), F.const(0))).clamp(10, 24).round(0),
            "前摇", "把钳子高举过顶、聚起水光的时间；速度越快越短，裂甲式更久。这段时间里可以被集火打断。"),
        /** 收招：基础 11 刻，速度每比 55 快 1 减 0.03 刻；夹在 6..13。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.03)).clamp(6, 13).round(0),
            "收招", "砸完收回钳子的时间。"),
        /** 冷却：基础 46 刻，速度每比 55 快 1 减 0.09 刻，裂甲 +6；夹在 28..70。 */
        recharge: seconds(
            F.base(46).minus(F.stat("speed").minus(55).times(0.09))
                .plus(F.when(F.pref("crack"), F.const(6), F.const(0))).clamp(28, 70).round(0),
            "冷却", "再次举钳前的等待；速度越快回得越快，裂甲式缓得更久。")
    });

    defineDamage(crabhammerId, "slam", {}, { contact: true });
    defineDamage(crabhammerId, "shock", {});

    stages(crabhammerId, [
        { level: 37, values: { slam: 90 } },
        { level: 53, values: { slam: 102, shockRadius: 2.6 } }
    ]);

    describe(crabhammerId, [
        { key: "description.0", values: ["slam"] },
        { key: "description.1", values: ["reach", "shock", "shockRadius"] },
        { key: "description.2", values: ["shove", "splash"] },
        { key: "stance.crack", values: [], when: function (context) { return read(context.detail.values, ["crack"]) === true; } },
        { key: "stance.heavy", values: [], when: function (context) { return read(context.detail.values, ["crack"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.shockRadius"] }
    ]);
}
