/**
 * 破灭之光 / lightofruin 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：妖精、特殊、威力 140、命中 90、PP 5、优先度 0、非接触；
 * 反作用力 = 造成伤害的 1/2（recoil: [1, 2]）。
 *
 * 翻译：保留「借用永恒之花的力量，发射出强力光线」，把它做成**一根粗重、贯穿的破灭光柱**——胸前开出一朵
 * 苍白的花，光柱从花心迸出、贯穿正前方整列敌人；借来的力量要还，**反噬按实际造成的伤害走**：
 * 打得越多、越狠，自己掉得越狠。这一族里它是唯一**自损随结果走**的一招，打空或打在免疫上都不付账。
 *
 * 数值来源（每项读不同精灵数据，配置再各自乘一档）：
 *   ray     光柱威力：特攻定借来的力量，等级定能不能承住；透支式借得更狠。
 *   reach   光柱长度：速度决定射得多远、等级决定稳不稳；同时是本招实际射程基准。
 *   width   光柱半宽：身板越高，花心迸出的柱越粗。
 *   recoil  反噬比例：特防越硬越扛得住借来的力量、特攻越高借得越多也就还得越多；透支式还得更狠。
 *   pierce  贯穿上限：特攻决定能一连打穿几个目标，穿得越多、反噬总额越大。
 *   petals  花瓣数量：特攻与身高派生，表现按它发射。
 *   tempo／aftercast／recharge：速度决定节奏，透支式蓄得更久、冷却更长。
 *
 * 配置 `overdraw`（透支式）双向取舍：开启＝威力 ×1.1、半宽 ×1.15、贯穿更狠，代价是反噬 ×1.15、起手 +2 刻、
 * 冷却 +6 刻；关闭（节制式）＝反噬 ×0.8，代价是威力 ×0.95。借得多 vs 还得少，两个方向各有局面。
 *
 * 伤害段 `ray`：这根光柱随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export const lightofruinId = "lightofruin";
    export const lightofruinScene = "world_combat:move_lightofruin";
    export const lightofruinHitText = "world_combat.move.lightofruin.text.hit";
    export const lightofruinRecoilText = "world_combat.move.lightofruin.text.recoil";
    export const lightofruinMissText = "world_combat.move.lightofruin.text.miss";

    actionParameters.define(lightofruinId, {
        /** 光柱威力：基础 140，特攻每比 60 多 1 加 1.0（夹 -30..90），等级每比 20 多 1 加 0.4（夹 0..30）；透支 ×1.1 / 节制 ×0.95；夹在 95..270。 */
        ray: formula(
            F.base(140)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-30, 90))
                .plus(F.level().minus(20).times(0.4).clamp(0, 30))
                .times(F.when(F.pref("overdraw", text("worldcombat.skill.lightofruin.preference.overdraw")), F.const(1.1), F.const(0.95)))
                .clamp(95, 270).round(1),
            "光柱威力", {
                unit: "威力",
                description: "借来的力量砸在每个目标身上的基础威力；特攻越高、等级越高越强，透支式借得更狠。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 光柱长度：基础 11 格，速度每比 60 快 1 加 0.05（夹 -2..4），等级每比 20 多 1 加 0.04（夹 0..2）；夹在 8..20。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.level().minus(20).times(0.04).clamp(0, 2))
                .clamp(8, 20).round(2),
            "光柱长度", {
                unit: "格",
                description: "光柱从花心贯穿到多远，也是本招实际的目标接受范围；速度越快、等级越高射得越远。"
            }),
        /** 光柱半宽：基础 0.95，碰撞箱每比 1.4 高 1 格加 0.25（夹 -0.15..0.7）；透支 ×1.15 / 节制 ×1；夹在 0.5..1.8。 */
        width: formula(
            F.base(0.95).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.7))
                .times(F.when(F.pref("overdraw", text("worldcombat.skill.lightofruin.preference.overdraw")), F.const(1.15), F.const(1)))
                .clamp(0.5, 1.8).round(2),
            "光柱半宽", {
                unit: "格",
                description: "贯穿光柱的横向半宽；身板越高越粗，透支式更胀。"
            }),
        /** 反噬比例：基础 0.5，特防每比 60 多 1 减 0.0006（夹 0..0.12），特攻每比 60 多 1 加 0.0006（夹 -0.05..0.12）；透支 ×1.15 / 节制 ×0.8；夹在 0.2..0.65。 */
        recoil: formula(
            F.base(0.5)
                .minus(F.stat("specialDefence").minus(60).times(0.0006).clamp(0, 0.12))
                .plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.05, 0.12))
                .times(F.when(F.pref("overdraw", text("worldcombat.skill.lightofruin.preference.overdraw")), F.const(1.15), F.const(0.8)))
                .clamp(0.2, 0.65).round(3),
            "反噬比例", {
                unit: "比例",
                description: "按实际造成的伤害反噬自己的比例；特防越硬越扛得住、特攻越高借得越多也就还得越多，透支式还得更狠。打空或打在免疫上都不付账。"
            }),
        /** 贯穿上限：基础 3，特攻每比 60 多 1 加 0.02（夹 -1..3）；夹在 1..6。 */
        pierce: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 3)).clamp(1, 6).round(0),
            "贯穿上限", {
                unit: "个",
                description: "一根光柱最多贯穿几个敌人；特攻越高越能一连打穿更多，反噬也按打中的全部伤害一起算。"
            }),
        /** 花瓣数量：基础 28，特攻每比 60 多 1 加 0.4（夹 -10..26），身高每比 1.4 多 1 加 8（夹 -4..16）；夹在 18..80。 */
        petals: formula(
            F.base(28)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-10, 26))
                .plus(F.body("height").minus(1.4).times(8).clamp(-4, 16))
                .clamp(18, 80).round(0),
            "花瓣数量", {
                unit: "个",
                description: "胸前那朵花展开与迸散时的花瓣数量，随特攻与身高增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 14 刻，速度每比 60 快 1 减 0.03 刻（夹 -3..4），透支 +2 刻；夹在 9..22。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("overdraw", text("worldcombat.skill.lightofruin.preference.overdraw")), F.const(2), F.const(0)))
                .clamp(9, 22).round(0),
            "起手", "让永恒之花在胸前绽开、把力量借到光柱里的时长；速度越快越干脆，透支式要多撑一会儿。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻（夹 -2..3）；夹在 6..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(6, 16).round(0),
            "收招", "光柱散去后收拢花朵的时长；越快恢复得越干脆。"),
        /** 冷却：基础 52 刻，速度每比 60 快 1 减 0.05 刻（夹 -6..10），透支 +6 刻；夹在 34..80。 */
        recharge: seconds(
            F.base(52).minus(F.stat("speed").minus(60).times(0.05).clamp(-6, 10))
                .plus(F.when(F.pref("overdraw", text("worldcombat.skill.lightofruin.preference.overdraw")), F.const(6), F.const(0)))
                .clamp(34, 80).round(0),
            "冷却", "两次破灭之光之间的间隔；速度越快回得越快，透支式还要等花重新合上。")
    });

    stages(lightofruinId, [
        { level: 45, values: { ray: 160 } },
        { level: 65, values: { ray: 178, recoil: 0.54 } }
    ]);

    defineDamage(lightofruinId, "ray", { defenceCoefficient: 0.0051,
        rationale: "破灭光柱对特殊防御的压制略强，让借来的力量在场上更醒目。" }, {});

    describe(lightofruinId, [
        { key: "description.0", values: ["ray","reach","width","pierce"] },
        { key: "description.1", values: ["recoil"] },
        { key: "overdraw.on", values: [], when: function (context) { return read(context.detail.values, ["overdraw"]) === true; } },
        { key: "overdraw.off", values: [], when: function (context) { return read(context.detail.values, ["overdraw"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ray"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.ray","tier.1.recoil"] }
    ]);
}
