/**
 * 水之誓约 / waterpledge 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，取自带 Showdown 数据）：Water／特殊／威力 80／命中 100／PP 10／优先度 0／
 *   非接触；与火之誓约、草之誓约组合时威力升到 150，并按组合把场地变成彩虹／湿地。
 *
 * 翻译：一股水柱从选定点**涌地而起**的柱状冲击：柱体对范围内每个敌人结算一次特殊伤害、把他们浇湿拖慢，
 *   并沿水势把他们推开顶起；柱脚留下一汪浸水的誓约印（规则 `world_combat:field/pledge_water`），
 *   站在上面的敌人持续被拖慢。落点附近已有火或草的誓约印时共鸣：这一击威力 ×`comboPower`，
 *   并把周围挂起**彩虹**（水＋火）或塌成**湿地**（水＋草）——组合产物按另一元素的身份决定，与原生一致。
 *
 * 数值来源（每项读不同的个体数据）：
 *   pillar       水柱威力：特攻 + 等级；配置 deluge 再调 1.10／0.96。
 *   pillarRadius 水柱半径：体重（身体越沉涌出的水越多）+ 特攻小幅。
 *   pillarHeight 水柱高度：等级。
 *   push／lift    推开的距离与顶起初速：体重 + 特攻（越沉越猛）。
 *   slowTicks    浇湿拖慢时长：特攻。
 *   markRadius   誓约印半径：**当前生命比例**（满血涌得更开）+ 体重；配置 deluge 再调。
 *   markTicks    誓约印停留：等级。
 *   reach        施放距离：**速度**（水势越快够得越远）；配置 deluge 缩短／延长。
 *   comboDetect  共鸣判定半径：特攻。
 *   comboScale   组合场半径倍率：特攻；配置 deluge 再调。comboPower 组合威力倍率：特攻。
 *   burst        水花数量：特攻（同时驱动粒子数）。scarCells 地面浸水块数：特攻。
 *   tempo        起手：速度。recharge 冷却：等级；配置 deluge +12／−4。
 *
 * 配置 `deluge`（涌誓）：开启＝威力 ×1.10、誓约印 ×1.2、推开 ×1.25，但射程 ×0.9、冷却 +12——涌得更猛更大，
 *   却站得更近、回手更慢；关闭（缓流）：射程 ×1.1、冷却 −4、推开 ×0.9——远、快、推得轻。
 *
 * 伤害段 `pillar` 与参数同名，走共享换算（原生类别 Special、Water 属性）。
 */
namespace PokemonSkills {
    export const waterpledgeId = "waterpledge";
    export const waterpledgeScene = "world_combat:move_waterpledge";
    export const waterpledgeScar = "world_combat:field/pledge_water";
    /** 水＋火 → 彩虹；水＋草 → 湿地。 */
    export const waterpledgeRainbow = "world_combat:field/waterpledge_rainbow";
    export const waterpledgeWetland = "world_combat:field/waterpledge_wetland";
    export const waterpledgeHitText = "world_combat.move.waterpledge.text.hit";
    export const waterpledgeComboText = "world_combat.move.waterpledge.text.combo";
    export const waterpledgeMissText = "world_combat.move.waterpledge.text.miss";

    actionParameters.define(waterpledgeId, {
        /** 水柱威力：70 + 特攻偏移[−22,70] + 等级偏移[0,24]；涌誓 ×1.10 / 缓流 ×0.96；夹 55..172。 */
        pillar: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.88).clamp(-22, 70))
                .plus(F.level().minus(20).times(0.5).clamp(0, 24))
                .times(F.when(F.pref("deluge"), F.const(1.10), F.const(0.96)))
                .clamp(55, 172).round(1),
            "水柱威力", {
                unit: "威力",
                description: "水柱对柱内每个敌人结算一次的基础威力；特攻越高、等级越高越猛。命中时与另一誓约共鸣还会整体放大。对手防御、相性与暴击在命中时另算。"
            }),
        /** 水柱半径：1.5 + 体重偏移[−0.2,0.8] + 特攻偏移[−0.15,0.4]；夹 1.2..3.0。 */
        pillarRadius: formula(
            F.base(1.5)
                .plus(F.body("weight").minus(60).times(0.005).clamp(-0.2, 0.8))
                .plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.15, 0.4))
                .clamp(1.2, 3.0).round(2),
            "水柱半径", {
                unit: "格",
                description: "水柱涌起多大一圈；身体越沉的个体涌出的水越多，也决定画面里那根柱的粗细。"
            }),
        /** 水柱高度：3.3 + 等级偏移[0,1.9]；夹 2.8..6.2。 */
        pillarHeight: formula(
            F.base(3.3).plus(F.level().minus(20).times(0.055).clamp(0, 1.9)).clamp(2.8, 6.2).round(1),
            "水柱高度", {
                unit: "格",
                description: "水柱涌多高，也是判定覆盖的竖直范围；等级越高柱越高。"
            }),
        /** 推开距离：1.0 + 体重偏移[−0.2,0.9] + 特攻偏移[−0.15,0.6]；涌誓 ×1.25 / 缓流 ×0.9；夹 0.5..2.6。 */
        push: formula(
            F.base(1.0)
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.9))
                .plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.15, 0.6))
                .times(F.when(F.pref("deluge"), F.const(1.25), F.const(0.9)))
                .clamp(0.5, 2.6).round(2),
            "推开距离", {
                unit: "格",
                description: "被水势沿离中心方向推开的距离；身体越沉、特攻越高推得越远，涌誓更猛。"
            }),
        /** 顶起初速：0.35 + 体重偏移[−0.08,0.4]；夹 0.15..0.75。 */
        lift: formula(
            F.base(0.35).plus(F.body("weight").minus(60).times(0.003).clamp(-0.08, 0.4)).clamp(0.15, 0.75).round(3),
            "顶起初速", {
                unit: "格/刻",
                description: "被水势向上顶起的初速；越沉的个体掀起的水越高。"
            }),
        /** 浇湿拖慢时长：60 + 特攻偏移[0,40]；夹 50..130 tick。 */
        slowTicks: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(0, 40)).clamp(50, 130).round(),
            "浇湿拖慢时长", "被水柱浇透后移动被拖慢多久；特攻越高拖得越久。"),
        /** 誓约印半径：1.6 + 生命比例偏移[0,0.5] + 体重偏移[−0.15,0.5]；涌誓 ×1.2 / 缓流 ×0.85；夹 1.1..2.9。 */
        markRadius: formula(
            F.base(1.6)
                .plus(F.actor("healthRatio").minus(0.5).times(1.0).clamp(0, 0.5))
                .plus(F.body("weight").minus(60).times(0.003).clamp(-0.15, 0.5))
                .times(F.when(F.pref("deluge"), F.const(1.2), F.const(0.85)))
                .clamp(1.1, 2.9).round(2),
            "誓约印半径", {
                unit: "格",
                description: "柱脚下那汪浸水誓约印覆盖多大；生命越满水势越足、印越宽，涌誓更大。"
            }),
        /** 誓约印停留：170 + 等级偏移[0,120]；夹 100..320 tick。 */
        markTicks: seconds(
            F.base(170).plus(F.level().minus(20).times(2.5).clamp(0, 120)).clamp(100, 320).round(),
            "誓约印停留", "这汪浸水誓约印留多久；站在上面的敌人会持续被拖慢。"),
        /** 施放距离：9 + 速度偏移[−1.5,5]；涌誓 ×0.9 / 缓流 ×1.1；夹 6..16。 */
        reach: formula(
            F.base(9).plus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 5))
                .times(F.when(F.pref("deluge"), F.const(0.9), F.const(1.1)))
                .clamp(6, 16).round(1),
            "施放距离", {
                unit: "格",
                description: "能把水柱call到多远；速度越快水势够得越远，涌誓更近、缓流更远。"
            }),
        /** 共鸣判定半径：3.3 + 特攻偏移[0,1.2]；夹 2.6..5.2。 */
        comboDetect: formula(
            F.base(3.3).plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 1.2)).clamp(2.6, 5.2).round(2),
            "共鸣判定半径", {
                unit: "格",
                description: "落点附近多大范围内若有火或草的誓约印就会共鸣；特攻越高越容易呼应。"
            }),
        /** 组合场半径倍率：2.0 + 特攻偏移[0,0.9]，涌誓 ×1.15 / 缓流 ×0.95；夹 1.7..3.2。 */
        comboScale: formula(
            F.base(2.0).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 0.9))
                .times(F.when(F.pref("deluge"), F.const(1.15), F.const(0.95)))
                .clamp(1.7, 3.2).round(2),
            "组合场倍率", {
                unit: "倍",
                description: "共鸣时彩虹／湿地的半径相对誓约印放大多少；特攻越高场地越广。"
            }),
        /** 组合威力倍率：1.7 + 特攻偏移[0,0.5]；夹 1.7..2.2。 */
        comboPower: formula(
            F.base(1.7).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(0, 0.5)).clamp(1.7, 2.2).round(2),
            "组合威力倍率", {
                unit: "倍",
                description: "与另一誓约共鸣时这一击整体乘上的倍率；原生组合把 80 抬到 150，这里翻成 ×1.7 起。"
            }),
        /** 水花数量：44 + 特攻 ×0.5；夹 36..116。直接驱动画面密度。 */
        burst: formula(
            F.base(44).plus(F.stat("specialAttack").times(0.5)).clamp(36, 116).round(0),
            "水花数量", {
                unit: "滴",
                description: "水柱涌起时喷出的水花数量；特攻越高越密，粒子直接按它发射。"
            }),
        /** 地面浸水块数：10 + 特攻 ×0.06；夹 8..20。 */
        scarCells: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.06)).clamp(8, 20).round(0),
            "地面浸水块数", {
                unit: "块",
                description: "柱脚把地表浸成水渍的块数；随特攻增长，也决定水渍的密度。"
            }),
        /** 起手：10 − 速度偏移[−3,3]；夹 6..16 tick。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 3)).clamp(6, 16).round(),
            "起手", "从聚水到水柱涌起需要多久；速度越快越短。"),
        /** 冷却：80 − 等级偏移[0,20] + 涌誓 12 / 缓流 −4；夹 52..120 tick。 */
        recharge: seconds(
            F.base(80).minus(F.level().minus(20).times(0.5).clamp(0, 20))
                .plus(F.when(F.pref("deluge"), F.const(12), F.const(-4)))
                .clamp(52, 120).round(),
            "冷却", "一次誓约后要等多久；等级越高回手越快，涌誓更久、缓流更快。"),
        maxTargets: hidden(6)
    });

    stages(waterpledgeId, [
        { level: 38, values: { pillar: 94 } },
        { level: 56, values: { pillar: 116 } }
    ]);

    defineDamage(waterpledgeId, "pillar", { defenceCoefficient: 0.0044, rationale: "水柱的冲击对防御的穿透略强于默认，让特攻与体重的差别更可见。" });

    describe(waterpledgeId, [
        { key: "description.0", values: ["pillar","maxTargets"] },
        { key: "description.1", values: ["pillarRadius","pillarHeight"] },
        { key: "description.2", values: ["push","lift","slowTicks"] },
        { key: "description.3", values: ["markRadius","markTicks"] },
        { key: "description.4", values: ["comboDetect","comboPower","comboScale"] },
        { key: "description.combo", values: [] },
        { key: "description.5", values: ["reach", "tempo"] },
        { key: "deluge.on", values: [], when: function (context) { return read(context.detail.values, ["deluge"]) === true; } },
        { key: "deluge.off", values: [], when: function (context) { return read(context.detail.values, ["deluge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pillar"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pillar"] }
    ]);
}
