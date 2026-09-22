/**
 * 急速折返 / uturn —— 参数、伤害段与「交棒」读取。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：虫／物理／威力 70／命中 100／PP 20／优先度 0／接触／selfSwitch；
 *   说明是「在攻击之后急速返回，和后备宝可梦进行替换」。
 *
 * 世界化翻译：它是一条 U 形轨迹——贴着一条弧线冲进去撞一下，再顺着弧线滑回来。念头的身份是「来了又走」：
 *   出手是接触、落点是退开，而不是站在原地换血。**有合法后备时，出手后由原生队伍操作收回自己、让后备在折返落点登场；
 *   没有后备（野生、独行或队里没有可上场者）时保留场内的折返与向等候伙伴交棒。**
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   strike         折返撞威力 = 物攻（虫式冲击）+ 速度（抢身位）+ 等级成长。
 *   dash           冲刺距离 = 速度 + 体型高度；它也是本招的实际射程来源。
 *   speed          每刻位移 = 速度；快的个体几乎读不出中间过程。
 *   collisionRadius 判定半径 = 体型高度。
 *   return         折返距离 = 速度 + 等级；配置 handoff 关闭时拉得更远。
 *   arc            U 形弧宽 = 体型宽度 + 体重；宽大的个体绕出更明显的 U。
 *   rally          交棒搜寻半径 = 等级；等级越高越能招呼远处的伙伴接应。
 *   motes          抖落的虫粉数 = 物攻 + 速度；直接驱动粒子数量。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `handoff`（交棒式）双向取舍：开启＝折返时退到 `rally` 内最近的等候伙伴身边（有人接应、有人掩护），
 *   折返距离 ×0.78；关闭（远遁式）＝沿弧线径直拉回，折返距离 ×1.15，离敌人最远但会脱离自己的伙伴。
 *   两向各有适用局面：有人可交棒时归队更安全，孤军时远遁才是正解。
 *
 * 伤害段 `strike` 走共享换算（原始类别 Physical，接触）；对手防御、相性与暴击在命中时由共享结算另算。
 */
namespace PokemonSkills {
    actionParameters.define("uturn", {
        /** 折返撞威力：40 +（物攻 − 60）×0.30 [−12,30] +（速度 − 55）×0.18 [−6,18]；夹 28..108。 */
        strike: formula(
            F.base(40)
                .plus(F.stat("attack").minus(60).times(0.30).clamp(-12, 30))
                .plus(F.stat("speed").minus(55).times(0.18).clamp(-6, 18))
                .clamp(28, 108).round(1),
            "折返撞威力", {
                base: 48, unit: "威力",
                description: "这一撞随精灵数据变化的那部分：物攻给出虫甲冲击的份量，速度给出抢到的身位。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲刺距离：2.7 +（速度 − 55）×0.02 [−0.4,1.2] +（身高 − 1.4）×0.35 [−0.15,0.5]；夹 2.2..4.8。 */
        dash: formula(
            F.base(2.7).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.4, 1.2))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.15, 0.5)).clamp(2.2, 4.8).round(2),
            "冲刺距离", {
                unit: " 格",
                description: "从起身到撞上目标的最大距离，也是本招的实际射程；腿快、身高的个体从更远处就能切进去。"
            }),
        /** 每刻位移：1.25 +（速度 − 55）×0.008 [−0.25,0.6]；夹 0.95..2.2。 */
        speed: formula(
            F.base(1.25).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.25, 0.6)).clamp(0.95, 2.2).round(2),
            "冲刺速度", { unit: "格/刻", description: "切进去时每刻移动的距离；快到读不出中间过程，这就是「急速」。" }),
        /** 判定半径：0.42 +（身高 − 1.4）×0.1 [−0.08,0.26]；夹 0.34..0.72。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.34, 0.72).round(2),
            "判定半径", { unit: "格", description: "撞上去能覆盖多大一圈；身板大的个体不容易被侧身让开。" }),
        /** 折返距离：3.8 +（速度 − 55）×0.03 [−0.7,1.9] +（等级 − 30）×0.02 [0,0.8]；交棒 ×0.78／远遁 ×1.15；夹 2.6..7。 */
        return: formula(
            F.base(3.8).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.7, 1.9))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.8))
                .times(F.when(F.pref("handoff", text("worldcombat.skill.uturn.preference.handoff")), F.const(0.78), F.const(1.15)))
                .clamp(2.6, 7).round(2),
            "折返距离", {
                unit: " 格",
                description: "撞完之后往回收多远；速度与等级越大退得越远，交棒式收得更近（去靠向伙伴），远遁式拉得更开。"
            }),
        /** U 形弧宽：1.1 +（宽度 − 0.9）×1.4 [−0.2,1.8] +（体重 − 50）×0.008 [−0.2,0.7]；夹 0.5..3。 */
        arc: formula(
            F.base(1.1).plus(F.body("width").minus(0.9).times(1.4).clamp(-0.2, 1.8))
                .plus(F.body("weight").minus(50).times(0.008).clamp(-0.2, 0.7)).clamp(0.5, 3).round(2),
            "折返弧宽", {
                unit: " 格",
                description: "U 形折返往侧面偏出的距离；身宽体重的个体绕出的弧更明显，回去的路和来路分得越开。"
            }),
        /** 交棒搜寻半径：6 +（等级 − 30）×0.06 [0,2.4]；夹 4..9。 */
        rally: formula(
            F.base(6).plus(F.level().minus(30).times(0.06).clamp(0, 2.4)).clamp(4, 9).round(1),
            "接应半径", { unit: " 格", description: "交棒式会退到这么远以内、位于背离目标一侧的伙伴身边；等级越高越能招呼远处的伙伴。" }),
        /** 虫粉数：16 +（物攻 − 60）×0.16 [−5,18] +（速度 − 55）×0.1 [−2,9]；夹 10..46。 */
        motes: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.16).clamp(-5, 18))
                .plus(F.stat("speed").minus(55).times(0.1).clamp(-2, 9)).clamp(10, 46).round(0),
            "抖落虫粉", { unit: "粒", description: "折返时抖落的虫粉数量，直接驱动表现密度；物攻与速度越大抖得越多。" }),
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 6).round(0),
            "起手", "压身蓄势的时间；速度越快起得越短。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.4)).clamp(4, 8).round(0),
            "收招", "落回身位后收势的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5)).clamp(18, 34).round(0),
            "冷却", "再折返一次前的等待；速度越快回得越快。")
    });

    defineDamage("uturn", "strike", { rationale: "虫式折返的贴身一击：份量中等，卖的是出手与脱身，不是一击致命。" }, { contact: true });

    stages("uturn", [
        { level: 32, values: { strike: 56, recharge: 22 } },
        { level: 50, values: { strike: 66, recharge: 18 } }
    ]);

    describe("uturn", [
        { key: "description.0", values: ["strike"] },
        { key: "description.1", values: ["dash", "speed", "collisionRadius"] },
        { key: "description.2", values: ["return", "arc", "rally"] },
        { key: "description.3", values: ["motes"] },
        { key: "handoff.on", values: [], when: function (context) { return read(context.detail.values, ["handoff"]) === true; } },
        { key: "handoff.off", values: [], when: function (context) { return read(context.detail.values, ["handoff"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.strike"] }
    ]);
}
