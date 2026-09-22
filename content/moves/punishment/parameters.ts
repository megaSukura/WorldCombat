/**
 * 惩罚 / punishment —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：恶、物理、基础威力 60、命中 100、PP 5、优先度 0、接触、无追加效果
 *   （28 位学习者）。威力 = 60 + 20 × 目标的正向能力等级总数（含命中与闪避），上限 200。
 *   描述「根据能力变化，对手提高的力量越大，招式的威力越大。」——它是本族唯一**读目标涨了多少**的一招。
 *
 * 翻译：把「对手越强、罚得越重」落成**一记从高处落下的处刑**——施法者把目标涨起来的每一层力量在手里称量，
 *   然后一记压顶砸下去；对手攒得越满，这一记越沉。它是本族唯一从对手身上取力的一招：别的三招把目标的
 *   能力变化抹掉，它反过来把那些变化算进威力。
 *
 * 与同族分开：逐步击破、ＤＤ金勾臂、圣剑都无视目标的能力变化；惩罚把目标的七项正向等级加起来当作威力的一
 *   项，攒得越多打得越重。它是本族的「反制涨能力」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   judge      处刑威力：基础 42 + 目标正向等级 ×18（封顶 +150，重判式再 ×1.35）+ 物攻偏移 + 等级偏移。
 *              本招的核心机制值来自**目标的当前能力等级**，其余来自施法者自身。
 *   reach      臂程：身高给臂长与踏前、速度给前探，也是实际射程。
 *   edge       判定半宽：体宽决定这一砸覆盖多宽。
 *   weights    坠砣量：目标等级给出几枚、物攻给出底数，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏、等级让冷却回得更快；重判式更慢更费。
 *
 * 配置 `heavy`（重判式，默认关）双向取舍：开启＝目标每级正向能力给的威力 ×1.35、射程 +0.2，代价是起手 +3 刻、
 *   收招 +2 刻、冷却 +5 刻——对攒满能力的对手罚得最狠；关闭（速判式）＝出手更快、循环更短，但读能力的系数低。
 *   两向各有局面：对刚叠满能力的坦克用重判，对轻微加速的脆皮用速判。
 *
 * 伤害段 `judge` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。目标的能力变化这里**照常参与**，
 * 既不忽略也不清除。
 *
 * `defineFacts` 把「目标七项正向等级之和」接成公式变量 `punishment.boost`：出招时按当前目标求值，
 * 详情页悬浮没有目标时该变量缺省为 0 并标注「命中时结算」。
 */
namespace PokemonSkills {
    export const punishmentId = "punishment";
    const punishmentBoostText = "worldcombat.skill.punishment.value.judged";
    /** 计入处刑的七项：五项能力加上命中与闪避，与原生 positiveBoosts 同口径。 */
    export const punishmentStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯，另有命中／闪避两级。 */
    export function punishmentStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return String(actor.domain()) === "cobblemon" ? NativeEffects.read(world, actor).stages : CombatStages.read(world, actor);
    }

    /** 目标七项里正面等级的总和；0 表示此刻没有可罚的涨能力。 */
    export function punishmentBoosts(world: CombatWorld, actor: CombatActor): number {
        const stages = punishmentStages(world, actor);
        let total = 0;
        punishmentStats.forEach(function (stat) { const value = stages[stat] || 0; if (value > 0) total += value; });
        return total;
    }

    /** 公式求值时的目标：动作现场优先，其次当前施放目标；详情页没有现场时返回 null。 */
    function punishmentTarget(context: FactContext): CombatActor | null {
        if (context.target && context.target.actor) return context.target.actor;
        return context.action ? context.action.target() : null;
    }

    defineFacts(punishmentId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "punishment.boost") return undefined;
            const world = context.world, target = punishmentTarget(context);
            if (!world || !target || !world.valid(target)) return undefined;
            return punishmentBoosts(world, target);
        } };
    });

    actionParameters.define(punishmentId, {
        /** 处刑威力：42 + 目标正向等级 ×18（封顶 +150，重判 ×1.35）+ 物攻偏移[−10,24] ×0.3 + 等级偏移[−4,10] ×0.2；夹 36..200。 */
        judge: formula(
            F.base(42)
                .plus(F.var("punishment.boost", text(punishmentBoostText)).times(18)
                    .times(F.when(F.pref("heavy", text("worldcombat.skill.punishment.preference.heavy")), F.const(1.35), F.const(1)))
                    .clamp(0, 150).as(text(punishmentBoostText)))
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-10, 24))
                .plus(F.level().minus(28).times(0.2).clamp(-4, 10))
                .clamp(36, 200).round(1),
            "处刑威力", {
                unit: "威力",
                description: "这一记压顶的基准威力；**目标身上每有 1 级正向能力就加 18**（封顶 +150，重判式再 ×1.35），物攻给分量、等级给底气。目标的能力越高，罚得越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 臂程：2.0 + 身高偏移[−0.25,0.7] ×0.4 + 速度偏移[−0.1,0.25] ×0.003；重判 +0.2；夹 1.7..2.9。 */
        reach: formula(
            F.base(2.0).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.25, 0.7))
                .plus(F.stat("speed").minus(60).times(0.003).clamp(-0.1, 0.25))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.punishment.preference.heavy")), F.const(0.2), F.const(0)))
                .clamp(1.7, 2.9).round(2),
            "臂程", {
                unit: "格",
                description: "砸下去能够到多远；身高给臂长与踏前、速度给前探。它也是本招的实际射程来源。"
            }),
        /** 判定半宽：0.34 + 体宽偏移[−0.04,0.16] ×0.12；夹 0.28..0.56。 */
        edge: formula(
            F.base(0.34).plus(F.body("width").minus(0.9).times(0.12).clamp(-0.04, 0.16)).clamp(0.28, 0.56).round(2),
            "判定半宽", {
                unit: "格",
                description: "这一砸覆盖多宽；身板越宽落点越开。画面里那道砸痕的宽窄与它一致。"
            }),
        /** 坠砣量：8 + 目标正向等级 ×5 + 物攻偏移[−2,6] ×0.08；夹 8..44。 */
        weights: formula(
            F.base(8).plus(F.var("punishment.boost", text(punishmentBoostText)).times(5))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-2, 6))
                .clamp(8, 44).round(0),
            "坠砣量", {
                unit: "枚",
                description: "随处刑落下的重量标记数量；目标涨得越高掉下的越多，物攻给底数。粒子按它发射，画面里的枚数与机制一致。"
            }),
        /** 起手：7 − 速度偏移[−1.5,2.5] ×0.025 + 重判 +3；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.025).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.punishment.preference.heavy")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "把这一记提起来、对准目标的时间；速度越快越短，重判式要多称一会儿。"),
        /** 收招：6 − 速度偏移[−1,2] ×0.02 + 重判 +2；夹 4..12。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.punishment.preference.heavy")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "收招", "砸完把重心收回来、重新站稳的时间；速度越快越短，重判式更沉。"),
        /** 冷却：16 − 等级偏移[0,3] ×0.08 + 重判 +5；夹 10..30。 */
        recharge: seconds(
            F.base(16).minus(F.level().minus(28).times(0.08).clamp(0, 3))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.punishment.preference.heavy")), F.const(5), F.const(0)))
                .clamp(10, 30).round(0),
            "冷却", "两次处刑之间等多久；等级越高回得越快，重判式更费。")
    });

    stages(punishmentId, [
        { level: 34, values: { judge: 50 } },
        { level: 50, values: { judge: 58, reach: 2.4 } }
    ]);

    defineDamage(punishmentId, "judge", {}, { contact: true });

    describe(punishmentId, [
        { key: "description.0", values: ["judge", "reach"] },
        { key: "description.1", values: ["edge", "weights"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.judge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.judge", "tier.1.reach"] }
    ]);
}
