/**
 * 洁净光芒 / lusterpurge —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 95／命中 100／PP 5／目标单体／50% 概率让目标特防下降 1 级（拉帝欧斯的招牌）。
 *
 * 翻译：把「释放耀眼的光芒」重做成一束朝瞄准方向的短时强光：它先是一道很细的亮芯，随后由芯向两侧张开成
 * 一个有限的光扇；光扇里的每个敌人最多各吃一次原主伤，并各掷一次全族最高的碾防概率。施法者不移动、不追踪，
 * 敌人可以从束外绕开；墙面会截住光。触发碾防的目标身上只留一记很短的亮点，不留下持续假光场。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core         强光威力：特攻定亮度，等级定光压。
 *   beamLength   光束射程：特攻与体型共同决定照多远。
 *   fanAngle     光扇张角：等级与特攻共同决定张开多大，聚光形态收窄。
 *   coreAngle    芯的初始张角：固定很窄，是张开前的束芯（内部参数）。
 *   openTicks    张开时间：速度决定芯张成扇的快慢。
 *   sunderChance 碾防概率：特攻决定，基础 50% 取自原生。
 *   sunderStage  碾防级数：固定 1 级，与原生一致。
 *   markTicks    亮点时长：等级与特攻决定碾防后亮点停留多久。
 *   rays         光束数：特攻与等级决定散出的光束数量，也驱动表现。
 *   tempo        起手：速度决定聚光出手的快慢。
 *
 * 配置 `focus`（聚光）：开启＝光扇收窄到 0.7、威力 ×1.18、碾防概率 +0.06、起手 +2 刻、冷却 +4 刻，
 * 适合正面把一个目标照透；关闭＝光扇更宽、威力与概率按基础值，适合扫前方一片。两向各有适用局面。
 *
 * 伤害段 `core`：光扇扫到每人身上各自结算一次，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -1)。
 */
namespace PokemonSkills {
    actionParameters.define("lusterpurge", {
        core: formula(
            F.base(92)
                .plus(F.stat("specialAttack").minus(70).times(0.26).clamp(-20, 36))
                .plus(F.level().minus(35).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("focus"), F.const(1.18), F.const(1)))
                .clamp(56, 146).round(1),
            "强光威力", {
                unit: "威力",
                description: "光扇扫到每人身上各自结算一次的基础威力；特攻越高越亮，等级越高光压越强，聚光形态更集中。"
            }),
        beamLength: formula(
            F.base(6.0)
                .plus(F.stat("specialAttack").minus(70).times(0.022).clamp(-1.0, 2.2))
                .plus(F.body("height").minus(1.6).times(0.6).clamp(-0.4, 1.2))
                .clamp(4.0, 9.5).round(2),
            "光束射程", {
                unit: "格",
                description: "强光从身前打出去多远；特攻高、体型大的个体照得更远。它也是本招的实际射程与指示器长度。"
            }),
        fanAngle: formula(
            F.base(44)
                .plus(F.level().minus(35).times(0.4).clamp(0, 12))
                .plus(F.stat("specialAttack").minus(70).times(0.05).clamp(-4, 8))
                .times(F.when(F.pref("focus"), F.const(0.7), F.const(1)))
                .clamp(26, 70).round(1),
            "光扇张角", {
                unit: "度",
                description: "光束由芯张开后向两侧铺出的总角度；等级与特攻越高铺得越开，聚光形态收得更窄。判定与画面用同一个角度。"
            }),
        coreAngle: hidden(7),
        openTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5)).clamp(4, 10).round(0),
            "张开时间", "细亮芯张开成光扇要多久；速度快的个体铺得越急。"),
        sunderChance: percent(
            F.base(0.50)
                .plus(F.stat("specialAttack").minus(70).times(0.001).clamp(-0.05, 0.09))
                .plus(F.when(F.pref("focus"), F.const(0.06), F.const(0)))
                .clamp(0.40, 0.68).round(3),
            "碾防概率", "命中时把目标特防压低 1 级的概率；原生 50% 起，是全族最高的一招，聚光形态再高一点。"),
        sunderStage: formula(
            F.base(1),
            "碾防级数", {
                unit: "级",
                description: "一次碾防让目标特防下降的能力等级。"
            }),
        markTicks: seconds(
            F.base(22)
                .plus(F.level().minus(35).times(0.3).clamp(0, 12))
                .plus(F.stat("specialAttack").minus(70).times(0.1).clamp(-2, 6))
                .clamp(14, 42).round(0),
            "亮点时长", "碾防生效后，目标被洗去防护时身上停留的亮点多久；等级与特攻越高留得稍久，但这只是画面提示，特防下降会一直保留。"),
        rays: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(70).times(0.06))
                .plus(F.level().minus(35).times(0.2))
                .clamp(6, 24).round(),
            "光束数", {
                unit: "束",
                description: "光扇张开时散出的光束数量，也驱动表现的密度；特攻与等级越高光束越密。"
            }),
        tempo: seconds(
            F.base(14)
                .minus(F.stat("speed").minus(60).times(0.05))
                .plus(F.when(F.pref("focus"), F.const(2), F.const(0)))
                .clamp(8, 18).round(),
            "起手", "把强光聚到一点再放出的时间；速度越快越短，聚光形态多花一点。")
    });

    defineDamage("lusterpurge", "core", {});

    stages("lusterpurge", [
        { level: 45, values: { core: 108, beamLength: 6.4 } }
    ]);

    describe("lusterpurge", [
        { key: "description.0", values: ["core"] },
        { key: "description.1", values: ["beamLength", "fanAngle", "openTicks"] },
        { key: "description.2", values: ["sunderChance", "sunderStage"] },
        { key: "description.3", values: ["pref.focus"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.beamLength"] }
    ]);
}
