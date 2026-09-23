/**
 * 食梦 / dreameater —— 参数、伤害段与「目标梦有多深」的现场判读。
 *
 * 原生事实：Psychic／特殊／威力 100／命中 100／PP 15／吸取一半伤害；
 *   `onTryImmunity` 只在目标处于睡眠（或特性昏迷）时成立，否则这一招根本用不出来（Cobblemon 1.8，180 位已实装学习者）。
 *
 * 核心念头：只有对方睡着时，梦才会从它头顶浮起来——把梦拉成一道紫烟吸进自己口里，梦越沉，这一口越大。
 * 翻译：不投物、不接触，直接在睡着的目标与自身之间拉出一条抽取线；伤害的一半转回自身（共享 `drain`），
 *   并让「够不够清醒」进入公式：目标没在做梦时公式给出的是被腰斩的 0.55 倍，画面读得出这一口会落空。
 *
 * 与家族分开：吸取探藤、超级吸取抛荚、木角用身体撞、终极吸取立根——它们只要够到就能抽；
 *   只有食梦**必须先让对方睡着**，且吸取量随目标剩余睡眠时长增长；它是家族里唯一读目标状态的一招。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   dream    梦之威力 100 + 特攻偏移 + 梦的深度；目标清醒 ×0.55；深潜式 ×0.85 / 浅尝式 ×1.12。
 *   sap      回血比例 0.50 + 特攻偏移 + 梦的深度；深潜式 ×1.3 / 浅尝式 ×0.9。
 *   reach    梦境抽取距离 9 + 特攻偏移 + 等级偏移；也是实际射程来源。
 *   mist     梦境判定 0.46 + 体型身高偏移；睡者的头顶被抽住多大的圈。
 *   motes    梦烟数量 14 + 特攻偏移 + 梦的深度；直接驱动画面密度。
 *   draw／settle／recharge 速度决定起手、收招与冷却；深潜式沉得更久。
 *
 * 配置 `deep`（深潜梦境）双向取舍：开＝回血比例 ×1.3、但威力 ×0.85、起手 +4 刻、冷却 +4 刻（续航取向）；
 *   关（浅尝）＝威力 ×1.12、回血 ×0.9、出手快（爆发取向）。两向各有局面。
 *
 * 伤害段 `dream` 与参数同名，走共享换算（原生类别 Special，Psychic 属性）。
 */
namespace PokemonSkills {
    export const dreameaterId = "dreameater";
    export const dreameaterScene = "world_combat:move_dreameater";

    /** 这次求值面对的目标；动作现场优先，其次才是显式 target 上下文。 */
    function dreameaterActor(context: FactContext): CombatActor | null {
        if (context.target !== undefined && context.target !== null && context.target.actor) return context.target.actor;
        return context.action ? context.action.target() : null;
    }
    /** 目标身上正在维系的睡眠效果；没有、已醒或对象是友方都返回 null。 */
    function dreameaterSleep(context: FactContext): CombatMobEffect | null {
        const world = context.world, actor = context.actor, target = dreameaterActor(context);
        if (!world || !actor || !target || !world.valid(target) || world.friendly(target)) return null;
        return CombatStatus.representative(world, target, "sleep");
    }

    defineFacts(dreameaterId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id !== "dreameater.depth") return undefined;
            const dream = dreameaterSleep(context);
            // 剩余睡眠刻数映射成 0..1 的梦深；160 刻（8 秒）以上算满。
            return dream === null ? 0 : Math.max(0, Math.min(1, dream.duration() / 160));
        } };
    });

    actionParameters.define(dreameaterId, {
        /** 梦之威力：100 + 特攻偏移[−18,44] + 梦深[0,20]；目标无梦 ×0.55；深潜 ×0.85 / 浅尝 ×1.12；夹 46..176。 */
        dream: formula(
            F.base(100)
                .plus(F.stat("specialAttack").minus(65).times(0.42).clamp(-18, 44))
                .plus(F.var("dreameater.depth", text("worldcombat.skill.dreameater.value.depth")).times(20))
                .times(F.when(F.target("status.sleep", text("worldcombat.skill.dreameater.value.dreaming")).gt(0), F.const(1), F.const(0.55)))
                .times(F.when(F.pref("deep", text("worldcombat.skill.dreameater.preference.deep")), F.const(0.85), F.const(1.12)))
                .clamp(46, 176).round(1),
            "梦之威力", {
                unit: "威力",
                description: "从熟睡目标身上抽走的一口梦有多重；特攻越高、对方的梦越沉越重，目标没在做梦时减半有余。对手特防、相性与暴击在命中时另算。"
            }),
        /** 回血比例：0.50 + 特攻偏移[−0.03,0.06] + 梦深[0,0.16]；深潜 ×1.3 / 浅尝 ×0.9；夹 0.42..0.80。 */
        sap: percent(
            F.base(0.50)
                .plus(F.stat("specialAttack").minus(65).times(0.0006).clamp(-0.03, 0.06))
                .plus(F.var("dreameater.depth", text("worldcombat.skill.dreameater.value.depth")).times(0.16))
                .times(F.when(F.pref("deep", text("worldcombat.skill.dreameater.preference.deep")), F.const(1.3), F.const(0.9)))
                .clamp(0.42, 0.80),
            "汲取比例", "造成的伤害转为自身回复的比例（原生一半）；特攻越高、梦越沉抽得越足，深潜式更黏。"),
        /** 梦境抽取距离：9 + 特攻偏移[−1.5,3] + 等级(≥30)偏移[0,2]；夹 7..14。 */
        reach: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(65).times(0.05).clamp(-1.5, 3))
                .plus(F.level().minus(30).times(0.05).clamp(0, 2)).clamp(7, 14).round(2),
            "梦境抽取距离", {
                unit: "格",
                description: "能从多远把睡者的梦抽过来；特攻与等级越高够得越远。它也是本招的实际射程来源。"
            }),
        /** 梦境判定：0.46 + 身高偏移[−0.08,0.30]；夹 0.36..0.80。 */
        mist: formula(
            F.base(0.46).plus(F.body("height").minus(1.35).times(0.12).clamp(-0.08, 0.30)).clamp(0.36, 0.80).round(2),
            "梦境判定", {
                unit: "格",
                description: "抽取线在目标头上罩住多大一圈；个高的个体拉出的梦境更粗。"
            }),
        /** 梦烟数量：14 + 特攻偏移[−3,12] + 梦深[0,10]；夹 10..40。同时驱动画面密度。 */
        motes: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(65).times(0.12).clamp(-3, 12))
                .plus(F.var("dreameater.depth", text("worldcombat.skill.dreameater.value.depth")).times(10))
                .clamp(10, 40).round(0),
            "梦烟数量", {
                unit: "缕",
                description: "被抽离的梦烟有几缕；特攻越高、对方的梦越沉越密，直接驱动画面的发射量。"
            }),
        /** 起手：9 − 速度偏移[−2,3] + 深潜式 4；夹 6..16。 */
        draw: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.dreameater.preference.deep")), F.const(4), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把对方的梦拉离身体前，先沉入梦境的时间；速度越快越短，深潜式要沉得更久。"),
        /** 收招：10 − 速度偏移[−2,3]；夹 6..14。 */
        settle: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(6, 14).round(0),
            "收招", "把梦境咽下、回过神来收住的时间。"),
        /** 冷却：34 − 速度偏移[−4,6] + 深潜式 4；夹 24..46。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 6))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.dreameater.preference.deep")), F.const(4), F.const(0)))
                .clamp(24, 46).round(0),
            "冷却", "两次食梦之间的等待；速度快的个体回得更快，深潜式更费。")
    });

    defineDamage(dreameaterId, "dream", { defenceCoefficient: 0.005,
        rationale: "从睡者体内抽走的一口梦，防御按默认系数减伤。" }, {});

    stages(dreameaterId, [
        { level: 30, values: { dream: 118, motes: 18 } },
        { level: 48, values: { dream: 134, sap: 0.58, reach: 11, motes: 24 } }
    ]);

    describe(dreameaterId, [
        { key: "description.0", values: ["dream","sap"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.additional", values: [] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dream"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dream", "tier.1.sap", "tier.1.reach"] }
    ]);
}
