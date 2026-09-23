/**
 * 爬击 / skittersmack 的参数与数值来源。
 *
 * 原生事实：虫／物理／威力 70／命中 90／PP 10／接触／100% 让目标特攻下降 1 级／目标单体。
 *
 * 翻译：把「从对手背后爬近后进行攻击」落成一件有形状的事——施法者先贴着地面绕到目标的侧后方，
 * 再从背后用带甲壳的前肢拍一记。它与同族分开的地方是**落点**：只有它会让施法者绕到目标的身后，
 * 从对方看不见的那一侧出手；绕到背后的一击更重（`backstab` 加成），只能从侧面掠过的一记只是普通拍打。
 * 如果目标跑开、绕行被挡，这一记就落在空处。
 *
 * 数值来源（每项读不同的精灵数据）：
 *   strike     拍击威力：物攻定力道、等级定发力。
 *   backstab   背击加成：物攻定从背后下手能多榨出多少。
 *   scuttle    绕行弧长：速度与体型宽度定要绕多远才能到背后。
 *   pace       爬行速度：速度定每刻挪几格。
 *   standoff   贴身距离：目标体型宽度定站到它身后多远。
 *   reach      出手距离：速度与身高定前肢够到多远，也是本招射程。
 *   smackWidth 拍击扇面：等级定张角，也是画面里那一拍的宽度。
 *   dropStages 特攻下降级数：固定 1 级（原生 100%）。
 *   motes      甲屑数量：物攻定，也驱动画面。
 *   tempo／aftercast／recharge：速度定节奏，背击式更慢更久。
 *
 * 配置 `deepflank`（背击式，默认开）：开＝绕更远的弧、绕到真正的背后，命中吃 `backstab` 加成，但起手 +1、冷却 +4；
 * 关（贴掠式）＝贴着目标身侧掠过、出手更快，代价是拿不到背击加成、也从侧面出手。两向各有局面。
 *
 * 伤害段 `strike`：一次接触拍击，带 contact 标记。
 */
namespace PokemonSkills {
    export const skittersmackId = "skittersmack";
    export const skittersmackScene = "world_combat:move_skittersmack";
    export const skittersmackHitText = "world_combat.move.skittersmack.text.hit";
    export const skittersmackFocusText = "world_combat.move.skittersmack.text.focus";
    export const skittersmackMissText = "world_combat.move.skittersmack.text.miss";

    actionParameters.define(skittersmackId, {
        /** 拍击威力：46 + 物攻偏移[−10,26] + 等级(≥25)偏移[0,10]；背击 ×1.06 / 贴掠 ×0.96；夹 30..100。 */
        strike: formula(
            F.base(46)
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-10, 26))
                .plus(F.level().minus(25).times(0.22).clamp(0, 10))
                .times(F.when(F.pref("deepflank"), F.const(1.06), F.const(0.96)))
                .clamp(30, 100).round(1),
            "拍击威力", {
                unit: "威力",
                description: "前肢拍在目标身上那一下的基础威力；物攻越高、等级越高越疼。对手防御、相性与暴击在命中时另算。"
            }),
        /** 背击加成：16% + 物攻偏移[−4%,24%]，背击式生效、贴掠式归零；夹 0..40%。 */
        backstab: percent(
            F.base(0.16).plus(F.stat("attack").minus(60).times(0.0016).clamp(-0.04, 0.24))
                .times(F.when(F.pref("deepflank"), F.const(1), F.const(0)))
                .clamp(0, 0.4).round(3),
            "背击加成", "绕到目标背后出手时额外增加的伤害比例；贴掠式从侧面掠过，没有这一项。"),
        /** 绕行弧长：1.9 + 速度偏移[−0.3,0.7] + 体型宽度偏移[−0.2,0.9]；背击 ×1.3 / 贴掠 ×0.75；夹 1.0..3.6。 */
        scuttle: formula(
            F.base(1.9)
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.3, 0.7))
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.2, 0.9))
                .times(F.when(F.pref("deepflank"), F.const(1.3), F.const(0.75)))
                .clamp(1.0, 3.6).round(2),
            "绕行弧长", {
                unit: "格",
                description: "从目标身侧绕到背后要走的弧长；速度越快、身体越宽的个体能一步跨过更大的弧。它决定画面里那条爬行轨迹有多长。"
            }),
        /** 爬行速度：0.75 + 速度偏移[−0.12,0.4]；夹 0.55..1.2。 */
        pace: formula(
            F.base(0.75).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.12, 0.4)).clamp(0.55, 1.2).round(2),
            "爬行速度", {
                unit: "格/刻",
                description: "绕行时每刻挪动的距离；速度快的个体贴地爬得更急，绕到背后用的时间更短。"
            }),
        /** 贴身距离：0.7 + 目标体型宽度偏移[−0.15,0.9]；夹 0.55..1.6。 */
        standoff: formula(
            F.base(0.7).plus(F.target("body.width").minus(0.9).times(0.6).clamp(-0.15, 0.9)).clamp(0.55, 1.6).round(2),
            "贴身距离", {
                unit: "格",
                description: "绕到目标背后之后停在它身后多远；目标体宽越大，要站得越靠外才够得着它的背。"
            }),
        /** 出手距离：2.6 + 速度偏移[−0.15,0.5] + 身高偏移[−0.2,0.7] + 背击 +0.2；夹 1.6..4.4。 */
        reach: formula(
            F.base(2.6)
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.5))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.7))
                .plus(F.when(F.pref("deepflank"), F.const(0.2), F.const(0)))
                .clamp(1.6, 4.4).round(2),
            "出手距离", {
                unit: "格",
                description: "前肢能够到目标的距离；速度与身高决定伸展范围，也是本招的实际射程。"
            }),
        /** 拍击扇面：76 + 等级(≥20)偏移[0,20]；夹 60..110。 */
        smackWidth: formula(
            F.base(76).plus(F.level().minus(20).times(0.5).clamp(0, 20)).clamp(60, 110).round(0),
            "拍击扇面", {
                unit: "度",
                description: "最后那一拍扫过的总开口；等级越高挥得越开。判定与画面用同一个角度。"
            }),
        /** 特攻下降：固定 1 级，与原生 100% 一致。 */
        dropStages: formula(
            F.base(1),
            "特攻下降", {
                unit: "级",
                description: "拍中后目标特攻下降的能力等级；对宝可梦落到原生特攻等级，对其他战斗者落到攻击阶梯。原生为必中 1 级。"
            }),
        /** 甲屑数量：14 + 物攻偏移[−4,16]；夹 10..40。 */
        motes: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.16).clamp(-4, 16)).clamp(10, 40).round(0),
            "甲屑数量", {
                unit: "个",
                description: "拍击时迸出的甲屑与振落的光点数量；物攻越高越多，粒子也按它发射。"
            }),
        /** 起手：6 − 速度偏移[−1,2] + 背击 1；夹 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2))
                .plus(F.when(F.pref("deepflank"), F.const(1), F.const(0)))
                .clamp(4, 10).round(0),
            "起手", "压低身体、蹬地准备爬行的时间；速度越快越短，绕远路要多花一点。"),
        /** 收招：6 − 速度偏移[−1,2]；夹 4..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "拍完收回前肢、重新站稳的时间；速度越快收得越干脆。"),
        /** 冷却：20 − 速度偏移[−3,5] + 背击 4；夹 14..30。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 5))
                .plus(F.when(F.pref("deepflank"), F.const(4), F.const(0)))
                .clamp(14, 30).round(0),
            "冷却", "两次爬击之间的等待；速度越快回得越快，绕背的一记等得更久。")
    });

    defineDamage(skittersmackId, "strike", {}, { contact: true });

    stages(skittersmackId, [
        { level: 30, values: { strike: 54 } },
        { level: 50, values: { scuttle: 2.2 } }
    ]);

    describe(skittersmackId, [
        { key: "description.0", values: ["strike", "backstab"] },
        { key: "description.1", values: ["dropStages"] },
        { key: "description.2", values: ["reach", "scuttle", "standoff"] },
        { key: "description.3", values: ["smackWidth"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deepflank"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deepflank"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.scuttle"] }
    ]);
}
