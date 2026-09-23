/**
 * 气场之翼 / esperwing —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，1 位学习者）：Psychic／特殊／威力 80／命中 100／PP 10／非接触／
 *   critRatio 2（暴击率高出一档）／100% 自身提速 1 级。原生描述：「用经过气场强化的翅膀撕裂对手。
 *   容易击中要害。会提高自己的速度。」
 *
 * 翻译：把「气场强化的翅膀」落成一记**双翼振扫**——提交前气场上翼，提交后一对粉色气翼从两侧向前扫出
 *   （两个半扇面合成一个正面），被扫到的敌人各挨一记气场斩；同一股气场在振翅的一瞬也把施法者托快
 *   （写入公共能力阶梯的速度等级），并在身上留下一段可见的余韵。原生的「容易击中要害」沿用 critRatio 2
 *   的共享结算；它是本族唯一**攻击同时强化自己**的一击。
 *
 * 数值分散（每个参数读不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   blade      气翼威力：特攻定气场浓度、速度定振翅的冲劲；振翅式更重、滑翔式更轻。
 *   reach      翼展：体型宽度决定翅膀够到哪里，也是实际射程。
 *   arc        翼弧半角：速度决定两翼张得多开；滑翔式铺得更宽。
 *   gift       提速等级：基础 1，基础速度 ≥ 105 的个体到 2。
 *   auraTicks  气场余韵：速度越高留得越久，也是身上气翼光环的时长。
 *   motes      气翼光点：特攻与速度换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；滑翔式以更长的冷却换更宽的翼展。
 *
 * 配置 `flap`（振翅式）双向取舍（默认关）：
 *   开（振翅）：威力 ×1.12，代价是翼弧收窄到 ×0.7、余韵缩短到 ×0.8。
 *   关（滑翔）：翼弧 ×1.4、余韵 ×1.3，代价是威力 ×0.9。
 *
 * 伤害段 `blade`：一翼扫中目标那一下，走共享换算（原生类别 Special，Psychic 属性，非接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const esperwingId = "esperwing";
    export const esperwingScene = "world_combat:move_esperwing";
    export const esperwingAura = "world_combat:esperwing_aura";
    export const esperwingBoostText = "world_combat.move.esperwing.text.boost";
    export const esperwingCritText = "world_combat.move.esperwing.text.crit";
    export const esperwingMissText = "world_combat.move.esperwing.text.miss";
    /** 表现里翼展的参考值（格）；服务端传 scale = 实际翼展 / 这个值。 */
    export const esperwingReference = 3.2;

    actionParameters.define(esperwingId, {
        /** 气翼威力：80 + (特攻−60)×0.35（夹 −14..44）+ (速度−55)×0.12（夹 −4..14）；振翅 ×1.12 / 滑翔 ×0.9；夹 56..172。 */
        blade: formula(
            F.base(80)
                .plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-14, 44))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-4, 14))
                .times(F.when(F.pref("flap", text("worldcombat.skill.esperwing.preference.flap")), F.const(1.12), F.const(0.9)))
                .clamp(56, 172).round(1),
            "气翼威力", {
                unit: "威力",
                description: "气翼扫中目标那一下的基础威力；特攻定气场浓度，速度给振翅的冲劲。对手特防、相性与暴击在命中时另算。"
            }),
        /** 翼展：3.2 + (碰撞箱宽度−0.9)×0.5（夹 −0.2..0.8）+ (特攻−60)×0.02（夹 −0.4..0.8）；夹 2.6..4.6 格。 */
        reach: formula(
            F.base(3.2).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.2, 0.8))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.4, 0.8))
                .clamp(2.6, 4.6).round(2),
            "翼展", {
                unit: "格",
                description: "两翼从施法者向前够到多远；身板越宽、特攻越高够得越远。它也是本招实际射程。"
            }),
        /** 翼弧半角：50 + (速度−55)×0.2（夹 −10..25）；振翅 ×0.7 / 滑翔 ×1.4；夹 28..90 度。 */
        arc: formula(
            F.base(50).plus(F.stat("speed").minus(55).times(0.2).clamp(-10, 25))
                .times(F.when(F.pref("flap", text("worldcombat.skill.esperwing.preference.flap")), F.const(0.7), F.const(1.4)))
                .clamp(28, 90).round(0),
            "翼弧半角", {
                unit: "度",
                description: "两翼从瞄准方向向两侧各张多开；速度越快张得越开，滑翔式铺得更宽、振翅式收得更拢。"
            }),
        /** 提速等级：基础 1，基础速度 ≥ 105 再 +1；夹 1..2。 */
        gift: formula(
            F.base(1).plus(F.when(F.stat("speed").gte(105), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "提速等级", {
                unit: "级",
                description: "振翅的一瞬给自己写入的速度等级；天生快的个体（基础速度 ≥ 105）多推一档。"
            }),
        /** 气场余韵：80 + (速度−55)×1.2（夹 −10..60）；振翅 ×0.8 / 滑翔 ×1.3；夹 60..220 刻。 */
        auraTicks: seconds(
            F.base(80).plus(F.stat("speed").minus(55).times(1.2).clamp(-10, 60))
                .times(F.when(F.pref("flap", text("worldcombat.skill.esperwing.preference.flap")), F.const(0.8), F.const(1.3)))
                .clamp(60, 220).round(0),
            "气场余韵", "振翅之后气翼光环在身上留多久；速度越高留得越久，也是 AI 不重复施放的判据。"),
        /** 气翼光点：26 + (特攻−60)×0.3（夹 −6..24）+ (速度−55)×0.2（夹 −4..10）；夹 20..70 个。 */
        motes: formula(
            F.base(26)
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-6, 24))
                .plus(F.stat("speed").minus(55).times(0.2).clamp(-4, 10))
                .clamp(20, 70).round(0),
            "气翼光点", {
                unit: "个",
                description: "振翅与余韵里飘起的气场光点数量，由特攻与速度换算；它驱动表现密度，不是独立伤害。"
            }),
        /** 起手：9 − (速度−55)×0.03（夹 −2..4）；夹 5..14 刻。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4)).clamp(5, 14).round(0),
            "起手", "气场上翼、两翼张开的准备时间；速度越快越短。"),
        /** 收招：8 − (速度−55)×0.02（夹 −2..3）；夹 4..12 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "振翅扫过之后收翼的时间；速度越快越利落。"),
        /** 冷却：40 − (等级−30)×0.5（夹 0..14）；夹 26..52 刻。 */
        recharge: seconds(
            F.base(40).minus(F.level().minus(30).times(0.5).clamp(0, 14)).clamp(26, 52).round(0),
            "冷却", "再次上翼前等待多久；等级越高回得越快。")
    });

    defineDamage(esperwingId, "blade", {}, { slice: true });

    stages(esperwingId, [
        { level: 40, values: { blade: 92 } },
        { level: 58, values: { blade: 100, arc: 62, reach: 3.8 } }
    ]);

    describe(esperwingId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["reach", "arc"] },
        { key: "description.2", values: ["gift","auraTicks"] },
        { key: "stance.flap", values: [], when: function (context) { return read(context.detail.values, ["flap"]) === true; } },
        { key: "stance.glide", values: [], when: function (context) { return read(context.detail.values, ["flap"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blade", "tier.1.arc", "tier.1.reach"] }
    ]);
}
