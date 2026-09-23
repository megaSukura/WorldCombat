/**
 * 冲岩 / accelerock —— 参数与伤害段。
 *
 * 原生事实：岩石／物理／威力 40／命中 100／PP 20／优先度 +1／接触，无次要效果（Cobblemon 1.8，2 位学习者）。
 *   描述「迅速撞向对手进行攻击。必定能够先制攻击」。
 *
 * 翻译：把「先制」翻成一记**裹着岩石整个撞出去的身体冲撞**：起手先把碎岩披到身上（可读的预告），
 *   然后沿瞄准方向贴地高速推进，撞实一下按 `slam` 结算接触伤害、把目标顶开，并在落点崩出一小片碎石疤。
 *   它是全族最重的一记——不像水流喷射那样把自己浇透，也不像电光一闪那样轻巧：一块石头撞上去，地上留下一道痕。
 *   与最像的电光一闪分开：靠岩石外壳、碎石迸溅与落点疤痕读出来；与水流喷射分开：水柱拖尾换成石头屑，不浇湿。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   slam            撞击威力：物攻给冲量、速度给撞速；破阵式每一下 ×0.85。
 *   charge          冲刺距离：速度与等级决定能撞出多远，也是射程来源。
 *   pace            每刻位移：速度决定撞得多急。
 *   collisionRadius 判定半径：身高决定石身多宽。
 *   shove           顶开距离：物攻决定把目标撞飞多远；破阵式 ×0.7（力气分给贯穿）。
 *   shards          碎石数量：速度与体重驱动，表现按它发射。
 *   pierce          贯穿数：背刺式 1（撞上即停）；破阵式 2，极快时 3——一路碾过去。
 *   scar            碎石疤半径：体重与等级决定落点崩多大。
 *   rubble          碎石疤时长：体重与等级决定地上的痕留多久。
 *   tempo/settle/recharge 速度决定节奏；破阵式更慢更费。
 *
 * 配置 `breakthrough`（破阵式）双向取舍：开启＝沿冲刺线一路碾过去（最多 2～3 个目标）、每个落点都留疤，
 *   但每一下 ×0.85、顶开 ×0.7、起手 +2 刻、收招 +3 刻、冷却 +6 刻；关闭＝撞上第一个就停，这一下最重、顶得最远。
 *   一个换「撞穿一排」，一个换「一下撞飞」。
 *
 * 伤害段 `slam` 与参数同名；接触标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const accelerockId = "accelerock";
    export const accelerockScene = "world_combat:move_accelerock";
    export const accelerockHitText = "world_combat.move.accelerock.text.hit";
    export const accelerockBreakText = "world_combat.move.accelerock.text.break";
    export const accelerockMissText = "world_combat.move.accelerock.text.miss";

    actionParameters.define(accelerockId, {
        /** 撞击威力：40 +（物攻 − 55）× 0.20 [−8,22] +（速度 − 55）× 0.12 [−3,13]；破阵 ×0.85；夹 24..96。 */
        slam: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.20).clamp(-8, 22))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-3, 13))
                .times(F.when(F.pref("breakthrough", text("worldcombat.skill.accelerock.preference.breakthrough")), F.const(0.85), F.const(1)))
                .clamp(24, 96).round(1),
            "撞击威力", {
                base: 40, unit: "威力",
                description: "整个石身撞实的那一下；物攻给冲量、速度给撞速。破阵式每一下更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲刺距离：4.2 +（速度 − 55）× 0.02 [−0.5,1.2] +（等级 − 30）× 0.04 [−0.3,0.9]；夹 3..7。 */
        charge: formula(
            F.base(4.2).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 1.2))
                .plus(F.level().minus(30).times(0.04).clamp(-0.3, 0.9)).clamp(3, 7).round(2),
            "冲刺距离", {
                base: 4.2, unit: "格",
                description: "这一记石身最远撞出去多远，也是本招的实际射程来源；腿快的个体撞得更远。"
            }),
        /** 每刻位移：1.0 +（速度 − 55）× 0.007 [−0.15,0.6]；夹 0.8..1.8。 */
        pace: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.15, 0.6)).clamp(0.8, 1.8).round(2),
            "冲刺速度", { base: 1.0, unit: "格/刻", description: "石身每刻推进的距离；越快越难在它到达前闪开。" }),
        /** 判定半径：0.5 +（身高 − 1.4）× 0.14 [−0.08,0.32]；夹 0.40..0.95。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.08, 0.32)).clamp(0.40, 0.95).round(2),
            "判定半径", { base: 0.5, unit: "格", description: "石身扫过活体的横向半径；身板越大撞得越宽。" }),
        /** 顶开距离：0.7 +（物攻 − 55）× 0.007 [−0.12,0.5]；破阵 ×0.7；夹 0.3..1.5。 */
        shove: formula(
            F.base(0.7).plus(F.stat("attack").minus(55).times(0.007).clamp(-0.12, 0.5))
                .times(F.when(F.pref("breakthrough", text("worldcombat.skill.accelerock.preference.breakthrough")), F.const(0.7), F.const(1)))
                .clamp(0.3, 1.5).round(2),
            "顶开距离", { base: 0.7, unit: "格", description: "撞中后把目标沿冲刺方向顶飞多远；物攻越高顶得越远，破阵式力气分给贯穿、顶得近。" }),
        /** 碎石数量：18 +（速度 − 55）× 0.30 [−3,14] +（体重 − 100）× 0.03 [−2,8]；夹 14..44。 */
        shards: formula(
            F.base(18).plus(F.stat("speed").minus(55).times(0.30).clamp(-3, 14))
                .plus(F.body("weight").minus(100).times(0.03).clamp(-2, 8)).clamp(14, 44).round(0),
            "碎石数量", {
                base: 18, unit: "点", visible: false,
                description: "撞击与推进时迸出的碎石数量，也直接驱动画面的发射量；速度与体重越高越密。"
            }),
        /** 贯穿数：1 + 破阵式（1 +（速度 − 55）÷ 60 [0,1]）；夹 1..3。 */
        pierce: formula(
            F.base(1).plus(F.when(F.pref("breakthrough", text("worldcombat.skill.accelerock.preference.breakthrough")),
                F.const(1).plus(F.stat("speed").minus(55).div(60).clamp(0, 1)), F.const(0))).clamp(1, 3).round(0),
            "贯穿数", {
                base: 1, unit: "个",
                description: "这一记能沿冲刺线撞穿几个敌人；普通式撞上即停，破阵式撞穿 2 个，速度极快时 3 个。"
            }),
        /** 碎石疤半径：1.0 +（体重 − 100）× 0.004 [−0.1,0.5] +（等级 − 30）× 0.01 [−0.1,0.3]；夹 0.7..1.8。 */
        scar: formula(
            F.base(1.0).plus(F.body("weight").minus(100).times(0.004).clamp(-0.1, 0.5))
                .plus(F.level().minus(30).times(0.01).clamp(-0.1, 0.3)).clamp(0.7, 1.8).round(2),
            "碎石疤半径", {
                base: 1.0, unit: "格",
                description: "落点地面被崩出的碎石疤有多大；越重、等级越高的个体砸得越开，画面按它画圈。"
            }),
        /** 碎石疤时长：80 +（体重 − 100）× 0.3 [−10,40] +（等级 − 30）× 0.5 [0,30]；夹 50..180 刻。 */
        rubble: seconds(
            F.base(80).plus(F.body("weight").minus(100).times(0.3).clamp(-10, 40))
                .plus(F.level().minus(30).times(0.5).clamp(0, 30)).clamp(50, 180).round(0),
            "碎石疤时长", "落点崩出的碎石疤在地上留多久，到期原方块回来；越重、等级越高留得越久。"),
        /** 起手：3 −（速度 − 55）× 0.02 [−0.8,1.5] + 破阵 2；夹 0..6 刻。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("breakthrough", text("worldcombat.skill.accelerock.preference.breakthrough")), F.const(2), F.const(0)))
                .clamp(0, 6).round(0),
            "起手", "碎岩披上身、压低身位的时间；快个体几乎一压就撞，破阵式要先摆开架势。"),
        /** 收招：8 −（速度 − 55）× 0.03 [−1,2] + 破阵 3；夹 4..14 刻。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("breakthrough", text("worldcombat.skill.accelerock.preference.breakthrough")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "收招", "撞完之后刹住、把碎岩抖落的时间；破阵式冲得更深，收得更久。"),
        /** 冷却：20 −（速度 − 55）× 0.08 [−2,3] + 破阵 6；夹 12..32 刻。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.08).clamp(-2, 3))
                .plus(F.when(F.pref("breakthrough", text("worldcombat.skill.accelerock.preference.breakthrough")), F.const(6), F.const(0)))
                .clamp(12, 32).round(0),
            "冷却", "两次冲锋之间的等待；速度快的个体回得更快，破阵式要重新聚石。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(accelerockId, "slam", {}, { contact: true });

    stages(accelerockId, [
        { level: 20, values: { slam: 50 } },
        { level: 36, values: { slam: 60, charge: 4.8 } }
    ]);

    describe(accelerockId, [
        { key: "description.0", values: ["slam", "collisionRadius"] },
        { key: "description.1", values: ["charge", "pace", "shove"] },
        { key: "description.2", values: ["pierce"] },
        { key: "description.3", values: ["scar","rubble"] },
        { key: "breakthrough.on", values: ["pierce"], when: function (context) { return read(context.detail.values, ["breakthrough"]) === true; } },
        { key: "breakthrough.off", values: [], when: function (context) { return read(context.detail.values, ["breakthrough"]) !== true; } },
        { key: "timing", values: ["charge", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.charge"] }
    ]);
}
