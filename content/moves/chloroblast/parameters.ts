/**
 * 叶绿爆震 / chloroblast 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：草、特殊、威力 150、命中 95、PP 5、优先度 0、非接触；
 * 使用后自身损失最大生命的 1/2（叶绿素一次性放尽）。
 *
 * 翻译：保留「把自己的叶绿素凝聚起来后放出去」，把它做成**向前方铺开的一记扇形爆震**——叶绿素从全身收进
 * 核心，再沿准线喷成一整片扇形，越近越重、越远越轻；放完之后施法者的叶绿素被抽空，自身按**放出去的力量**
 * 损失生命。这一族里它是唯一覆盖面、也是唯一**自损随放出的力量走**的一招：
 *   铁蹄光线固定自损、只打第一个；破灭之光自损随造成的伤害走；随机光没有自损。
 *
 * 数值来源（每项读不同精灵数据，配置再各自乘一档）：
 *   bloom    爆震威力：特攻定叶绿素的浓度，等级定炼得顺不顺；束流式更集中。
 *   reach    扇形半径：特攻与等级决定喷得远，速度决定起势；同时是本招实际射程基准。
 *   angle    扇形张角：身板越高，放出的叶绿素铺得越开。
 *   falloff  远处衰减：特攻越高，越能把力量压在远处而不是散在近处。
 *   cost     自损比例：特攻越高放出的叶绿素越多、失血越多，特防越硬越扛得住。
 *   motes    叶绿素微粒：特攻与体重派生，表现按它发射。
 *   tempo／aftercast／recharge：速度决定节奏，束流式蓄得更久。
 *
 * 配置 `burst`（爆散式）双向取舍：开启＝张角 ×1.35、铺得更开，代价是半径 ×0.85、威力 ×0.92（罩得多但每下轻）；
 * 关闭（束流式）＝张角 ×0.7、打得更远更狠（半径 ×1.2、威力 ×1.08），但罩得窄、更容易被侧移让开。
 *
 * 伤害段 `bloom`：这一片爆震随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export const chloroblastId = "chloroblast";
    export const chloroblastScene = "world_combat:move_chloroblast";
    export const chloroblastHitText = "world_combat.move.chloroblast.text.hit";
    export const chloroblastMissText = "world_combat.move.chloroblast.text.miss";
    export const chloroblastWitherText = "world_combat.move.chloroblast.text.wither";

    actionParameters.define(chloroblastId, {
        /** 爆震威力：基础 150，特攻每比 60 多 1 加 1.0（夹 -30..90），等级每比 20 多 1 加 0.45（夹 0..32）；爆散 ×0.92 / 束流 ×1.08；夹在 100..270。 */
        bloom: formula(
            F.base(150)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-30, 90))
                .plus(F.level().minus(20).times(0.45).clamp(0, 32))
                .times(F.when(F.pref("burst", text("worldcombat.skill.chloroblast.preference.burst")), F.const(0.92), F.const(1.08)))
                .clamp(100, 270).round(1),
            "爆震威力", {
                unit: "威力",
                description: "扇形中心这一片叶绿素的基础威力；特攻越高、等级越高越浓，束流式更狠。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 扇形半径：基础 7 格，等级每比 20 多 1 加 0.06（夹 0..2.4），速度每比 60 快 1 加 0.03（夹 -1.5..2.5）；爆散 ×0.85 / 束流 ×1.2；夹在 5..12。 */
        reach: formula(
            F.base(7)
                .plus(F.level().minus(20).times(0.06).clamp(0, 2.4))
                .plus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .times(F.when(F.pref("burst", text("worldcombat.skill.chloroblast.preference.burst")), F.const(0.85), F.const(1.2)))
                .clamp(5, 12).round(2),
            "扇形半径", {
                unit: "格",
                description: "叶绿素铺开的扇形从身前伸出多远，也是本招实际的目标接受范围；等级与速度决定喷程，束流式更远。"
            }),
        /** 扇形张角：基础 80 度，碰撞箱每比 1.4 高 1 格加 22 度（夹 -12..40）；爆散 ×1.35 / 束流 ×0.7；夹在 45..150。 */
        angle: formula(
            F.base(80).plus(F.body("height").minus(1.4).times(22).clamp(-12, 40))
                .times(F.when(F.pref("burst", text("worldcombat.skill.chloroblast.preference.burst")), F.const(1.35), F.const(0.7)))
                .clamp(45, 150).round(1),
            "扇形张角", {
                unit: "度",
                description: "扇形从中心线向两侧张开的夹角；身板越高铺得越开，爆散式几乎铺满半个身前，束流式收成一束。"
            }),
        /** 远处衰减：基础 0.5，特攻每比 60 多 1 减 0.002（夹 -0.1..0.25）；夹在 0.3..0.65。 */
        falloff: formula(
            F.base(0.5).minus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.1, 0.25)).clamp(0.3, 0.65).round(3),
            "远处衰减", {
                unit: "比例",
                description: "扇形边缘相对中心丢掉的力量比例；特攻越高越能把力量压在远处、边缘掉得越少。"
            }),
        /** 自损比例：基础 0.5，特攻每比 60 多 1 加 0.0025（夹 -0.08..0.16），特防每比 60 多 1 减 0.0008（夹 0..0.12）；爆散 ×0.95 / 束流 ×1.05；夹在 0.2..0.62。 */
        cost: formula(
            F.base(0.5)
                .plus(F.stat("specialAttack").minus(60).times(0.0025).clamp(-0.08, 0.16))
                .minus(F.stat("specialDefence").minus(60).times(0.0008).clamp(0, 0.12))
                .times(F.when(F.pref("burst", text("worldcombat.skill.chloroblast.preference.burst")), F.const(0.95), F.const(1.05)))
                .clamp(0.2, 0.62).round(3),
            "自损比例", {
                unit: "比例",
                description: "把叶绿素一次放尽要付出的最大生命比例，与是否命中无关；放出的力量越大（特攻越高）失血越多，特防越硬越扛得住，束流式更集中也更伤本体。"
            }),
        /** 叶绿素微粒：基础 40，特攻每比 60 多 1 加 0.5（夹 -12..30），体重每比 60 多 1 加 0.2（夹 -6..14）；夹在 24..90。 */
        motes: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-12, 30))
                .plus(F.body("weight").minus(60).times(0.2).clamp(-6, 14))
                .clamp(24, 90).round(0),
            "叶绿素微粒", {
                unit: "个",
                description: "喷出的叶绿素微粒数量，随特攻与体重增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 13 刻，速度每比 60 快 1 减 0.03 刻（夹 -3..4），束流 +2 刻；夹在 8..20。 */
        tempo: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("burst", text("worldcombat.skill.chloroblast.preference.burst")), F.const(0), F.const(2)))
                .clamp(8, 20).round(0),
            "起手", "把全身叶绿素收进核心、压到临界再放出去的时长；速度越快越干脆，束流式要多蓄一点。"),
        /** 收招：基础 11 刻，速度每比 60 快 1 减 0.02 刻（夹 -2..3）；夹在 6..16。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(6, 16).round(0),
            "收招", "放尽叶绿素后重新站稳的时长；越快恢复得越干脆。"),
        /** 冷却：基础 48 刻，速度每比 60 快 1 减 0.05 刻（夹 -6..10），束流 +4 刻；夹在 32..74。 */
        recharge: seconds(
            F.base(48).minus(F.stat("speed").minus(60).times(0.05).clamp(-6, 10))
                .plus(F.when(F.pref("burst", text("worldcombat.skill.chloroblast.preference.burst")), F.const(0), F.const(4)))
                .clamp(32, 74).round(0),
            "冷却", "两次叶绿爆震之间的间隔；速度越快回得越快，束流式蓄得更久。")
    });

    stages(chloroblastId, [
        { level: 40, values: { bloom: 172 } },
        { level: 62, values: { bloom: 190, cost: 0.46 } }
    ]);

    defineDamage(chloroblastId, "bloom", { defenceCoefficient: 0.0052,
        rationale: "一整片叶绿素对特殊防御的压制略强，让特攻与等级的差距在场上更明显。" }, {});

    describe(chloroblastId, [
        { key: "description.0", values: ["bloom", "reach", "angle"] },
        { key: "description.1", values: ["falloff", "cost"] },
        { key: "burst.on", values: [], when: function (context) { return read(context.detail.values, ["burst"]) === true; } },
        { key: "burst.off", values: [], when: function (context) { return read(context.detail.values, ["burst"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bloom"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bloom", "tier.1.cost"] }
    ]);
}
