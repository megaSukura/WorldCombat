/**
 * 随机光 / ficklebeam 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：龙、特殊、威力 80、命中 100、PP 5、优先度 0、非接触；
 * 30% 几率「其他的头也会合力发射镭射」，那一发威力翻倍（×2）。
 *
 * 翻译：把「有时其他的头也一起射」落成一束**忽明忽暗的多股光线**——平时只有一束随手打出，偶尔所有的头
 * 一起聚焦，同一束里每股都亮起来、伤害翻倍。这一族里它是唯一**没有自损**的一招，风险和回报都在那一掷里。
 * 头部数量对多数生物不存在，所以翻成「分光股数」：体型越大，能同时聚起的光股越多，齐射时越强。
 *
 * 数值来源（每项读不同精灵数据，配置再各自乘一档）：
 *   beam   光束威力：特攻定浓度，等级定稳定度；齐心式压低基础、赌齐射。
 *   reach  光束长度：速度决定射得多远，等级决定稳不稳；同时是本招实际射程基准。
 *   width  光束半宽：身板越高，光柱越粗。
 *   chance 齐射几率：原生 0.3 起步，等级与体型加一点，齐心式再抬一档。
 *   heads  分光股数：体型决定能同时聚起几股光，也决定齐射时的画面股数。
 *   motes  光点数量：特攻与速度派生，表现按它发射。
 *   tempo／aftercast／recharge：速度决定节奏，齐心式蓄得更久。
 *
 * 配置 `unison`（齐心式）双向取舍：开启＝齐射几率 +0.12，代价是基础威力 ×0.88、起手 +2 刻（赌那一发翻倍）；
 * 关闭（随意式）＝基础威力 ×1.12、几率和起手不变（稳稳地打）。
 *
 * 伤害段 `beam`：这一束随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export const ficklebeamId = "ficklebeam";
    export const ficklebeamScene = "world_combat:move_ficklebeam";
    export const ficklebeamHitText = "world_combat.move.ficklebeam.text.hit";
    export const ficklebeamUnisonText = "world_combat.move.ficklebeam.text.unison";
    export const ficklebeamMissText = "world_combat.move.ficklebeam.text.miss";

    actionParameters.define(ficklebeamId, {
        /** 光束威力：基础 80，特攻每比 60 多 1 加 0.55（夹 -18..55），等级每比 20 多 1 加 0.3（夹 0..20）；齐心 ×0.88 / 随意 ×1.12；夹在 55..175。 */
        beam: formula(
            F.base(80)
                .plus(F.stat("specialAttack").minus(60).times(0.55).clamp(-18, 55))
                .plus(F.level().minus(20).times(0.3).clamp(0, 20))
                .times(F.when(F.pref("unison", text("worldcombat.skill.ficklebeam.preference.unison")), F.const(0.88), F.const(1.12)))
                .clamp(55, 175).round(1),
            "光束威力", {
                unit: "威力",
                description: "单股光线的基础威力；特攻越高、等级越高越强，齐心式为了赌齐射压低基础。齐射时整体翻倍。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 光束长度：基础 10 格，速度每比 60 快 1 加 0.05（夹 -2..4），等级每比 20 多 1 加 0.05（夹 0..2）；夹在 7..18。 */
        reach: formula(
            F.base(10)
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.level().minus(20).times(0.05).clamp(0, 2))
                .clamp(7, 18).round(2),
            "光束长度", {
                unit: "格",
                description: "光线射出多远，也是本招实际的目标接受范围；速度越快、等级越高射得越远。"
            }),
        /** 光束半宽：基础 0.42，碰撞箱每比 1.4 高 1 格加 0.12（夹 -0.1..0.5）；夹在 0.25..0.9。 */
        width: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.5)).clamp(0.25, 0.9).round(2),
            "光束半宽", {
                unit: "格",
                description: "光柱的横向半宽；身板越高越粗，股数也更容易被看清。"
            }),
        /** 齐射几率：基础 0.3，等级每比 20 多 1 加 0.004（夹 0..0.14），身高每比 1.4 多 1 加 0.03（夹 -0.05..0.12）；齐心 +0.12 / 随意 -0.06；夹在 0.08..0.55。 */
        chance: formula(
            F.base(0.3)
                .plus(F.level().minus(20).times(0.004).clamp(0, 0.14))
                .plus(F.body("height").minus(1.4).times(0.03).clamp(-0.05, 0.12))
                .plus(F.when(F.pref("unison", text("worldcombat.skill.ficklebeam.preference.unison")), F.const(0.12), F.const(-0.06)))
                .clamp(0.08, 0.55).round(3),
            "齐射几率", {
                unit: "概率",
                description: "这一次射出时「所有的头一起开火」的几率；中了就把同一束的威力翻倍。齐心式更常赌，随意式更少。"
            }),
        /** 分光股数：基础 2，身高每比 1.4 多 1 加 1.2（夹 -0.5..3），体重每比 60 多 1 加 0.01（夹 -0.5..2）；夹在 1..7。 */
        heads: formula(
            F.base(2)
                .plus(F.body("height").minus(1.4).times(1.2).clamp(-0.5, 3))
                .plus(F.body("weight").minus(60).times(0.01).clamp(-0.5, 2))
                .clamp(1, 7).round(0),
            "分光股数", {
                unit: "股",
                description: "这具身体一次能同时聚起几股光；体型越大股数越多，齐射那一发每股都亮起来，画面里的股数就是它。"
            }),
        /** 光点数量：基础 30，特攻每比 60 多 1 加 0.4（夹 -10..24），速度每比 60 快 1 加 0.5（夹 -8..18）；夹在 18..80。 */
        motes: formula(
            F.base(30)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-10, 24))
                .plus(F.stat("speed").minus(60).times(0.5).clamp(-8, 18))
                .clamp(18, 80).round(0),
            "光点数量", {
                unit: "个",
                description: "光线沿途散落的光点数量，随特攻与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 10 刻，速度每比 60 快 1 减 0.03 刻（夹 -3..4），齐心 +2 刻；夹在 6..18。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("unison", text("worldcombat.skill.ficklebeam.preference.unison")), F.const(2), F.const(0)))
                .clamp(6, 18).round(0),
            "起手", "把几股光对齐、瞄准的时长；速度越快越干脆，齐心式要多稳一下。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.02 刻（夹 -2..3）；夹在 5..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(5, 14).round(0),
            "收招", "射完调整光路的时长；越快恢复得越干脆。"),
        /** 冷却：基础 26 刻，速度每比 60 快 1 减 0.04 刻（夹 -4..7）；夹在 16..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 7)).clamp(16, 40).round(0),
            "冷却", "两次随机光之间的间隔；没有自损，所以节奏比同族快得多。")
    });

    stages(ficklebeamId, [
        { level: 40, values: { beam: 96 } },
        { level: 58, values: { beam: 108, chance: 0.34 } }
    ]);

    defineDamage(ficklebeamId, "beam", { defenceCoefficient: 0.005,
        rationale: "标准特殊防御系数，让齐射的那一发翻倍在场上格外醒目。" }, {});

    describe(ficklebeamId, [
        { key: "description.0", values: ["beam", "reach", "width"] },
        { key: "description.1", values: ["chance"] },
        { key: "unison.on", values: [], when: function (context) { return read(context.detail.values, ["unison"]) === true; } },
        { key: "unison.off", values: [], when: function (context) { return read(context.detail.values, ["unison"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.beam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.beam", "tier.1.chance"] }
    ]);
}
