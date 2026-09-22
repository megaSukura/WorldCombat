/**
 * 克命爪 / direclaw —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，仅大狃拉 1 位学习者）：Poison／物理／威力 80／命中 100／PP 15／接触／
 *   次要：50% 让目标陷入中毒、麻痹、睡眠三者之一（各 1/3）。原生描述：「以破灭之爪瞄准要害进行攻击。」
 *
 * 核心念头：一记深爪，三道爪痕同时犁开同一道伤口——爪上的余毒在收爪那一刻**挑一种**诅咒按进去。
 *   它是这一组里唯一「单手一记、但结果三选一」的近身招：伤害一次结算，状态一次掷取。
 *
 * 世界化：三道平行爪痕是这一招的形状（判定取身前一块窄面，画面用同一组顶点画三条线）；命中结算 `rake`
 *   接触伤害，并按 `ailmentChance` 掷一次状态，从中毒／麻痹／睡眠里挑一种（`favor` 可提前指定倾向）。
 *   原生的「瞄准要害」落成数据驱动的 `critChance`：暴击率随速度与等级抬升，高于普通招。
 *
 * 与同族分开：十字毒刃是两刃合拢的一剪、靠切口里会渗的毒取胜；克命爪是**一记深爪、一次掷取三选一**。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   rake           爪伤威力：物攻定刃口、速度定收爪；深创 ×0.88 / 疾撕 ×1.08；夹 54..140。
 *   ailmentChance  余毒几率：物攻＋等级；深创 +0.15；夹 0.30..0.75。
 *   ailmentTicks   余毒时长：物攻；深创 ×1.25。
 *   critChance     暴击几率（「瞄准要害」）：速度＋等级；深创 +0.06；夹 0.15..0.50。
 *   reach          出手距离：速度与等级；夹 2.2..4.0 格，也是实际射程。
 *   cleave         爪痕高度：身高；决定爪痕压到多高、判定能钩到多高。
 *   wound          爪痕间距：身高；三条爪痕分开多宽，也是画面里三道线的间距。
 *   venom          爪上毒液量：物攻；驱动表现数量。
 *   gashes         爪痕条数（原生三道），固定。
 *   tempo／aftercast／recharge  速度定节奏；深创多蓄一拍、冷得稍久，疾撕更快。
 *
 * 配置：
 *   `deep`（深创）双向取舍：开＝余毒几率 +0.15、余毒时长 ×1.25、暴击几率 +0.06，代价是爪伤 ×0.88、起手 +1 刻、冷却 ×1.12；
 *     关（疾撕）＝爪伤 ×1.08、起手 −1 刻、冷却 ×0.95，余毒与暴击回到基准。重伤害还是重留毒，由这一项取舍。
 *   `favor`（余毒倾向）选择：随机（默认）／中毒／麻痹／睡眠。针对局面挑一种——对坦克按中毒、对快攻按麻痹、对高危目标按睡眠。
 *
 * 伤害段 `rake` 与参数同名，走共享换算（原生类别 Physical，Poison 属性，接触）；命中、防御、相性与暴击在命中时另算，
 * 暴击由本招自己的 `critChance` 掷取。余毒经 `CombatStatus.inflict` 落到任何对象上，遵守类型与特性免疫。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const direclawId = "direclaw";
    export const direclawScene = "world_combat:move_direclaw";
    export const direclawReference = 1.0;
    export const direclawHitText = "world_combat.move.direclaw.text.hit";
    export const direclawMissText = "world_combat.move.direclaw.text.miss";
    export const direclawCritText = "world_combat.move.direclaw.text.crit";
    export const direclawPoisonText = "world_combat.move.direclaw.text.poison";
    export const direclawParalysisText = "world_combat.move.direclaw.text.paralysis";
    export const direclawSleepText = "world_combat.move.direclaw.text.sleep";
    export const direclawNoAilmentText = "world_combat.move.direclaw.text.resist";
    /** 余毒倾向：0 随机，1 中毒，2 麻痹，3 睡眠。 */
    export const direclawFavours = ["", "poison", "paralysis", "sleep"];

    actionParameters.define(direclawId, {
        /** 爪伤威力：80 + (物攻−60)×0.32（夹 −14..32）+ (速度−60)×0.06（夹 −3..8）；深创 ×0.88 / 疾撕 ×1.08；夹 54..140。 */
        rake: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-14, 32))
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-3, 8))
                .times(F.when(F.pref("deep"), F.const(0.88), F.const(1.08)))
                .clamp(54, 140).round(1),
            "爪伤威力", {
                base: 80,
                unit: "威力",
                description: "三道爪痕同时犁开那一下的接触威力；物攻给出刃口、速度给出收爪。对手防御、相性与本招自己的暴击在命中时另算。"
            }),
        /** 余毒几率：0.50 + (物攻−60)×0.001（夹 0..0.10）+ (等级−25)×0.002（夹 0..0.08）+ 深创 0.15；夹 0.30..0.75。 */
        ailmentChance: percent(
            F.base(0.50)
                .plus(F.stat("attack").minus(60).times(0.001).clamp(0, 0.10))
                .plus(F.level().minus(25).times(0.002).clamp(0, 0.08))
                .plus(F.when(F.pref("deep"), F.const(0.15), F.const(0)))
                .clamp(0.30, 0.75).round(3),
            "余毒几率", "命中后从中毒／麻痹／睡眠里挑一种按进伤口的几率；物攻与等级越高越容易，深创式明显更毒。目标对相应状态的类型／特性免疫仍然生效。"),
        /** 余毒时长：200 + (物攻−60)×0.6（夹 −30..90）；深创 ×1.25；夹 140..360 秒。 */
        ailmentTicks: seconds(
            F.base(200).plus(F.stat("attack").minus(60).times(0.6).clamp(-30, 90))
                .times(F.when(F.pref("deep"), F.const(1.25), F.const(1)))
                .clamp(140, 360).round(0),
            "余毒时长", "余毒持续多久；物攻决定毒液穿透力，深创式按得更久。"),
        /** 暴击几率：0.28 + (速度−60)×0.0012（夹 0..0.12）+ (等级−25)×0.001（夹 0..0.05）+ 深创 0.06；夹 0.15..0.50。 */
        critChance: percent(
            F.base(0.28)
                .plus(F.stat("speed").minus(60).times(0.0012).clamp(0, 0.12))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("deep"), F.const(0.06), F.const(0)))
                .clamp(0.15, 0.50).round(3),
            "暴击几率", "「瞄准要害」：这一记爪击打出暴击的几率，高于普通招；速度与等级越高越准，深创式更稳。暴击由本招自己的掷取决定，与原生暴击等级叠加计算。"),
        /** 出手距离：2.8 + (速度−60)×0.01（夹 −0.3..0.6）+ (等级−25)×0.02（夹 0..0.5）；夹 2.2..4.0 格。 */
        reach: formula(
            F.base(2.8)
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.3, 0.6))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.5))
                .clamp(2.2, 4.0).round(2),
            "出手距离", {
                unit: "格",
                description: "从站位到爪锋够到的最远距离；腿快、等级高的个体够得更前。它也是本招的实际射程。"
            }),
        /** 爪痕高度：0.5 + (身高−1.3)×0.14（夹 −0.06..0.28）；夹 0.4..0.9 格。 */
        cleave: formula(
            F.base(0.5).plus(F.body("height").minus(1.3).times(0.14).clamp(-0.06, 0.28)).clamp(0.4, 0.9).round(2),
            "爪痕高度", {
                unit: "格",
                description: "三道爪痕从脚上压到多高；高大的个体拉得更长，画面里那道伤口就有多深。"
            }),
        /** 爪痕间距：0.34 + (身高−1.3)×0.1（夹 −0.05..0.2）；夹 0.26..0.62 格。 */
        wound: formula(
            F.base(0.34).plus(F.body("height").minus(1.3).times(0.1).clamp(-0.05, 0.2)).clamp(0.26, 0.62).round(2),
            "爪痕间距", {
                unit: "格",
                description: "三道爪痕彼此分开的宽度；体型越大分得越开。它是判定面的宽度，也是画面里三条线的间距。"
            }),
        /** 毒液量：22 + (物攻−60)×0.25（夹 −4..16）；夹 16..48 个。 */
        venom: formula(
            F.base(22).plus(F.stat("attack").minus(60).times(0.25).clamp(-4, 16)).clamp(16, 48).round(0),
            "毒液量", {
                unit: "个",
                description: "爪上甩出的毒液滴数与收爪时的毒雾量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        gashes: hidden(3),
        /** 起手：7 − (速度−60)×0.03（夹 −1.5..2）+ 深创 1；夹 4..12 刻。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("deep"), F.const(1), F.const(-1)))
                .clamp(4, 12).round(0),
            "起手", "抡起破灭之爪、把毒压上锋刃的时间；速度越快越短，深创式多蓄一拍。"),
        /** 收招：6 − (速度−60)×0.02（夹 −1.5..2）；夹 3..10 刻。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(3, 10).round(0),
            "收招", "收爪、把毒雾抖开的时间；速度越快越利落。"),
        /** 冷却：26 − (速度−60)×0.05（夹 −4..6）；深创 ×1.12 / 疾撕 ×0.95；夹 14..42 刻。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.05).clamp(-4, 6))
                .times(F.when(F.pref("deep"), F.const(1.12), F.const(0.95)))
                .clamp(14, 42).round(0),
            "冷却", "两次深爪之间的等待；深创式缓得更久，疾撕式回得更快。")
    });

    defineCategory(direclawId, "physical");
    defineDamage(direclawId, "rake", { defenceCoefficient: 0.005 }, { contact: true });

    stages(direclawId, [
        { level: 40, values: { rake: 90 } },
        { level: 52, values: { rake: 100, ailmentChance: 0.58, critChance: 0.34 } }
    ]);

    describe(direclawId, [
        { key: "description.0", values: ["rake", "ailmentChance", "ailmentTicks"] },
        { key: "description.1", values: ["reach", "critChance", "gashes"] },
        { key: "description.2", values: ["venom", "wound", "cleave", "tempo", "recharge"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "favor.random", values: [], when: function (context) { return Number(read(context.detail.values, ["favor"]) || 0) === 0; } },
        { key: "favor.poison", values: [], when: function (context) { return Number(read(context.detail.values, ["favor"]) || 0) === 1; } },
        { key: "favor.paralysis", values: [], when: function (context) { return Number(read(context.detail.values, ["favor"]) || 0) === 2; } },
        { key: "favor.sleep", values: [], when: function (context) { return Number(read(context.detail.values, ["favor"]) || 0) === 3; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rake"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rake", "tier.1.ailmentChance", "tier.1.critChance"] }
    ]);
}
