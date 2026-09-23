/**
 * 火之誓约 / firepledge 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，取自带 Showdown 数据）：Fire／特殊／威力 80／命中 100／PP 10／优先度 0／
 *   非接触；与草之誓约、水之誓约组合时威力升到 150，并按组合把场地变成火海／彩虹。
 *
 * 翻译：把「柱状攻击 + 与另一誓约组合成场地」翻成**一根从选定点拔地而起的火柱**：柱体对范围内每个敌人
 *   结算一次特殊伤害并点燃；柱脚下留一圈燃烧的誓约印（本单元场地规则 `world_combat:field/pledge_fire`），
 *   站在上面的敌人持续燃烧。落点附近已有草或水的誓约印时两者共鸣：这一击威力 ×`comboPower`，
 *   并把周围变成**火海**（火＋草）或**彩虹**（火＋水）——组合产物按另一元素的身份决定，与原生一致。
 *
 * 数值来源（每项读不同的个体数据，把差距摊到不同参数上）：
 *   pillar       火柱威力：特攻 + 等级（火越热烧得越狠）；配置 fierce 再调 1.12／0.96。
 *   pillarRadius 火柱半径：体型高度（个子高柱更粗）+ 特攻小幅。
 *   pillarHeight 火柱高度：等级（等级越高柱越高）。
 *   burnTicks    点燃持续：特攻（火越烈烧得越久）。
 *   markRadius   誓约印半径：体型高度。
 *   markTicks    誓约印停留：等级；配置 fierce 让它更短（烧得更猛留得短）／更长。
 *   reach        施放距离：特攻。
 *   comboDetect  共鸣判定半径：特攻（越强的火越容易与别的誓约呼应）。
 *   comboScale   组合场半径倍率：特攻；配置 fierce 再调。
 *   comboPower   组合威力倍率：特攻。
 *   burst        画面火星数量：特攻（同时驱动粒子数）。
 *   scarCells    地面烙痕块数：特攻（同时驱动粒子与租借范围）。
 *   tempo        起手：速度。recharge 冷却：等级；配置 fierce 更长。
 *
 * 配置 `fierce`（烈誓）：开启＝威力 ×1.12、柱更粗、冷却 +12，但誓约印只留七成时间；关闭（缓誓）＝威力 ×0.96、
 *   誓约印 ×1.25、冷却更短。两向都有适用局面：烈誓吃一波爆发，缓誓把地面烧得更久。
 *
 * 伤害段 `pillar` 与参数同名，走共享换算（原生类别 Special、Fire 属性）。
 */
namespace PokemonSkills {
    export const firepledgeId = "firepledge";
    export const firepledgeScene = "world_combat:move_firepledge";
    /** 本单元的燃烧誓约印（只由本单元注册；别的誓约按同一套命名读取它）。 */
    export const firepledgeScar = "world_combat:field/pledge_fire";
    /** 火＋草 → 火海；火＋水 → 彩虹。 */
    export const firepledgeSea = "world_combat:field/firepledge_seaoffire";
    export const firepledgeRainbow = "world_combat:field/firepledge_rainbow";
    export const firepledgeHitText = "world_combat.move.firepledge.text.hit";
    export const firepledgeComboText = "world_combat.move.firepledge.text.combo";
    export const firepledgeMissText = "world_combat.move.firepledge.text.miss";

    actionParameters.define(firepledgeId, {
        /** 火柱威力：72 + 特攻偏移[−24,72] + 等级偏移[0,24]；烈誓 ×1.12 / 缓誓 ×0.96；夹 56..170。 */
        pillar: formula(
            F.base(72)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-24, 72))
                .plus(F.level().minus(20).times(0.5).clamp(0, 24))
                .times(F.when(F.pref("fierce"), F.const(1.12), F.const(0.96)))
                .clamp(56, 170).round(1),
            "火柱威力", {
                unit: "威力",
                description: "火柱对柱内每个敌人结算一次的基础威力；特攻越高、等级越高烧得越狠。命中时与另一誓约共鸣还会整体放大。对手防御、相性与暴击在命中时另算。"
            }),
        /** 火柱半径：1.5 + 高度偏移[−0.2,0.7] + 特攻偏移[−0.15,0.5]；夹 1.1..2.8。 */
        pillarRadius: formula(
            F.base(1.5)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.7))
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.15, 0.5))
                .clamp(1.1, 2.8).round(2),
            "火柱半径", {
                unit: "格",
                description: "火柱罩住多大一圈；个子高、特攻高的个体柱体更粗，也决定画面里那根柱的粗细。"
            }),
        /** 火柱高度：3.4 + 等级偏移[0,1.8]；夹 2.8..6.0。 */
        pillarHeight: formula(
            F.base(3.4).plus(F.level().minus(20).times(0.05).clamp(0, 1.8)).clamp(2.8, 6.0).round(1),
            "火柱高度", {
                unit: "格",
                description: "火柱从地面窜多高，也是判定火柱覆盖的竖直范围；等级越高柱越高。"
            }),
        /** 点燃持续：70 + 特攻偏移[0,40]；夹 50..140 tick。 */
        burnTicks: seconds(
            F.base(70).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(0, 40)).clamp(50, 140).round(),
            "点燃持续", "被火柱点到的敌人身上的灼伤持续多久；特攻越高烧得越久。"),
        /** 誓约印半径：1.7 + 高度偏移[−0.2,0.6]；夹 1.3..2.8。 */
        markRadius: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.6)).clamp(1.3, 2.8).round(2),
            "誓约印半径", {
                unit: "格",
                description: "柱脚下那圈燃烧的誓约印覆盖多大；体型越高印越宽，也决定地面烙痕的范围。"
            }),
        /** 誓约印停留：180 + 等级偏移[0,120]，烈誓 ×0.7 / 缓誓 ×1.25；夹 100..340 tick。 */
        markTicks: seconds(
            F.base(180).plus(F.level().minus(20).times(2.5).clamp(0, 120))
                .times(F.when(F.pref("fierce"), F.const(0.7), F.const(1.25)))
                .clamp(100, 340).round(),
            "誓约印停留", "这圈燃烧的印留多久；站在上面的敌人会持续燃烧。烈誓留得短、缓誓留得久。"),
        /** 施放距离：10 + 特攻偏移[−1.5,5]；夹 8..16。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1.5, 5)).clamp(8, 16).round(1),
            "施放距离", {
                unit: "格",
                description: "能把火柱call到多远；特攻高的个体够得更远。"
            }),
        /** 共鸣判定半径：3.2 + 特攻偏移[0,1.2]；夹 2.6..5.0。 */
        comboDetect: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 1.2)).clamp(2.6, 5.0).round(2),
            "共鸣判定半径", {
                unit: "格",
                description: "落点附近多大范围内若有草或水的誓约印就会共鸣；特攻越高越容易呼应。"
            }),
        /** 组合场半径倍率：2.0 + 特攻偏移[0,0.9]，烈誓 ×1.15 / 缓誓 ×0.95；夹 1.7..3.2。 */
        comboScale: formula(
            F.base(2.0).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 0.9))
                .times(F.when(F.pref("fierce"), F.const(1.15), F.const(0.95)))
                .clamp(1.7, 3.2).round(2),
            "组合场倍率", {
                unit: "倍",
                description: "共鸣时火海／彩虹的半径相对誓约印放大多少；特攻越高场地越广。"
            }),
        /** 组合威力倍率：1.7 + 特攻偏移[0,0.5]；夹 1.7..2.2。 */
        comboPower: formula(
            F.base(1.7).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(0, 0.5)).clamp(1.7, 2.2).round(2),
            "组合威力倍率", {
                unit: "倍",
                description: "与另一誓约共鸣时这一击整体乘上的倍率；原生组合把 80 抬到 150，这里翻成 ×1.7 起。"
            }),
        /** 火星数量：48 + 特攻 ×0.5；夹 40..120。直接驱动画面密度。 */
        burst: formula(
            F.base(48).plus(F.stat("specialAttack").times(0.5)).clamp(40, 120).round(0),
            "火星数量", {
                unit: "个",
                description: "火柱窜起时喷出的火星数量；特攻越高越密，粒子直接按它发射。"
            }),
        /** 地面烙痕块数：10 + 特攻 ×0.06；夹 8..20。 */
        scarCells: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.06)).clamp(8, 20).round(0),
            "地面烙痕块数", {
                unit: "块",
                description: "柱脚把地表烙成焦土的块数；随特攻增长，也决定烙痕的密度。"
            }),
        /** 起手：10 − 速度偏移[−3,3]；夹 6..16 tick。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 3)).clamp(6, 16).round(),
            "起手", "从聚火到火柱拔地而起需要多久；速度越快越短。"),
        /** 冷却：80 − 等级偏移[0,20] + 烈誓 12 / 缓誓 −6；夹 52..120 tick。 */
        recharge: seconds(
            F.base(80).minus(F.level().minus(20).times(0.5).clamp(0, 20))
                .plus(F.when(F.pref("fierce"), F.const(12), F.const(-6)))
                .clamp(52, 120).round(),
            "冷却", "一次誓约后要等多久；等级越高回手越快，烈誓更久、缓誓更快。"),
        maxTargets: hidden(6)
    });

    stages(firepledgeId, [
        { level: 38, values: { pillar: 96 } },
        { level: 56, values: { pillar: 118 } }
    ]);

    defineDamage(firepledgeId, "pillar", { defenceCoefficient: 0.0042, rationale: "火焰柱对防御的穿透略强于默认，让特攻与等级的差别更可见。" });

    describe(firepledgeId, [
        { key: "description.0", values: ["pillar","maxTargets"] },
        { key: "description.1", values: ["pillarRadius","pillarHeight","burnTicks"] },
        { key: "description.2", values: ["markRadius","markTicks","scarCells"] },
        { key: "description.3", values: ["comboDetect","comboPower","comboScale"] },
        { key: "description.4", values: ["reach", "tempo"] },
        { key: "fierce.on", values: [], when: function (context) { return read(context.detail.values, ["fierce"]) === true; } },
        { key: "fierce.off", values: [], when: function (context) { return read(context.detail.values, ["fierce"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pillar"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pillar"] }
    ]);
}
