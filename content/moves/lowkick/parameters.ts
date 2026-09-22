/**
 * 踢倒 / lowkick 的参数与伤害段。
 *
 * 原生事实：Fighting、物理、命中 100、PP 20、接触、威力按**对手体重**分档（<10kg 20、<25kg 40、<50kg 60、<100kg 80、
 * <200kg 100、≥200kg 120）（Cobblemon 1.8，204 位学习者）。
 * 翻译：一记极快的下段扫踢，专扫支撑腿——目标越重，重心越难拉回来，这一记越致命。它**贴身、快、便宜**：
 * 没有远程形态、没有特效，只有一次贴近和一次收腿；对**腾空**的目标扫不到腿，只有半伤且不绊倒。
 *
 * 数据分散（每项读不同的精灵数据；目标侧用目标事实）：
 *   sweep      扫踢威力：**目标体重**给出分量（越重越狠）+ 施法者物攻（踢腿的狠度）+ 速度（扫击的干脆）。
 *   lunge      突进距离：施法者速度 + 等级；配置 reap 加长。
 *   speed      突进速度：施法者速度；踢出的节奏。
 *   collisionRadius 判定半径：施法者碰撞箱高度。
 *   tripStages 掉速等级：**目标体重**（1..3 级）。
 *   rootTicks  绊住时长：**目标体重**；越重越难立刻站稳。
 *   tripTicks  失衡持续：**目标体重** + 等级。
 *   airbornePenalty 腾空折扣：固定 0.5；扫不到腿时只擦到。
 *   prepare/recover/cooldown 起手／收招／冷却：速度与等级，配置 reap 另加。
 *
 * 配置 `reap`（扫堂式，默认关）双向取舍：开＝突进更远，扫踢还会带倒目标身旁的一名敌人，但单发威力略低、
 * 收招与冷却更久；关＝一记更重更快的单体扫踢。两向各有局面（清场 vs 单点速伤）。
 *
 * 伤害段 `sweep` 与参数同名；属性与分类沿用原生 Fighting／物理，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const lowkickMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("lowkick", {
        /** 扫踢威力：基础 20；目标体重每比 10kg 多 1kg 加 0.055（上限 +100）；物攻每比 60 多 1 加 0.2（上限 +22）；速度每比 60 快 1 加 0.1（上限 +14）；扫堂 ×0.9 / 点踢 ×1.05；夹在 18..155。 */
        sweep: formula(
            F.base(20)
                .plus(lowkickMassNode.minus(100).times(0.055).clamp(0, 100))
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-6, 22))
                .plus(F.stat("speed").minus(60).times(0.1).clamp(-4, 14))
                .times(F.when(F.pref("reap", text("worldcombat.skill.lowkick.preference.reap")), F.const(0.9), F.const(1.05)))
                .clamp(18, 155).round(1),
            "扫踢威力", {
                unit: "威力",
                description: "扫中支撑腿的基础威力；**对手越重越狠**，物攻给出踢腿的狠度、速度给出扫击的干脆。命中时的防御、相性与暴击另算。"
            }),
        /** 突进距离：基础 2.6 格；速度每比 60 快 1 加 0.02（上限 +1.2）；等级每高 1 级加 0.01（上限 +0.4）；扫堂 +0.8；夹在 2.0..4.6。 */
        lunge: formula(
            F.base(2.6).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.4, 1.2))
                .plus(F.level().minus(20).times(0.01).clamp(0, 0.4))
                .plus(F.when(F.pref("reap", text("worldcombat.skill.lowkick.preference.reap")), F.const(0.8), F.const(0)))
                .clamp(2.0, 4.6).round(2),
            "突进距离", {
                unit: "格",
                description: "从起步到踢中的总位移；驱动目标接受范围。扫堂式一步迈得更远。"
            }),
        /** 突进速度：基础 0.55 格/刻；速度每比 60 快 1 加 0.005（上限 +0.3）；夹在 0.4..1.0。 */
        speed: formula(
            F.base(0.55).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.1, 0.3)).clamp(0.4, 1.0).round(2),
            "突进速度", {
                unit: "格/刻",
                description: "踢腿时每刻前进的距离；越快越难被让开。"
            }),
        /** 判定半径：基础 0.4 格；碰撞箱每比 1.4 高 1 格加 0.12；夹在 0.3..0.75。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.3, 0.75).round(2),
            "判定半径", {
                unit: "格",
                description: "扫腿能碰到的横向半径；身板越大腿越长。"
            }),
        /** 掉速等级：基础 1；目标体重每超过 25kg 一档加 1，最多 3 级；夹在 1..3。 */
        tripStages: formula(
            F.base(1).plus(lowkickMassNode.gte(500).times(F.const(1))).plus(lowkickMassNode.gte(1000).times(F.const(1))).clamp(1, 3).round(0),
            "掉速等级", {
                unit: "级",
                description: "被扫倒后下降的速度能力等级；越重掉得越多（对其他战斗者落到移动速度属性）。"
            }),
        /** 绊住时长：基础 6 刻；目标体重每比 10kg 多 1kg 加 0.05 刻（上限 +14）；夹在 6..24。 */
        rootTicks: seconds(
            F.base(6).plus(lowkickMassNode.minus(100).times(0.005).clamp(0, 14)).clamp(6, 24).round(0),
            "绊住时长", "被扫倒后短时间站不起来的时间；越重的目标越难立刻稳住。"),
        /** 失衡持续：基础 40 刻；目标体重每比 10kg 多 1kg 加 0.08 刻（上限 +34）；等级每高 1 级加 0.7（上限 +20）；夹在 30..130。 */
        tripTicks: seconds(
            F.base(40).plus(lowkickMassNode.minus(100).times(0.008).clamp(0, 34))
                .plus(F.level().minus(20).times(0.7).clamp(0, 20))
                .clamp(30, 130).round(0),
            "失衡持续", "带着 tripped 身份的持续时间。"),
        /** 腾空折扣：目标双脚离地时威力乘的系数（固定 0.5，且不再绊倒）。 */
        airbornePenalty: percent(F.base(0.5), "腾空折扣", "扫不到支撑腿时的威力系数；腾空的目标只被擦到，也不会被绊倒。"),
        /** 起手：基础 6 刻；速度每比 60 快 1 减 0.04 刻（上限 −3）；夹在 4..11。 */
        prepare: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.04).clamp(-1, 3)).clamp(4, 11).round(0),
            "起手", "压低重心、把脚放稳的时间。"),
        /** 收招：基础 6 刻；速度每比 60 快 1 减 0.03 刻（上限 −3）；夹在 4..11。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 3)).clamp(4, 11).round(0),
            "收招", "收回踢腿、重新站稳的收势。"),
        /** 冷却：基础 18 刻；速度每比 60 快 1 减 0.08 刻（上限 −6）；扫堂 +6；夹在 10..36。 */
        cooldown: seconds(
            F.base(18).minus(F.stat("speed").minus(60).times(0.08).clamp(-2, 6))
                .plus(F.when(F.pref("reap", text("worldcombat.skill.lowkick.preference.reap")), F.const(6), F.const(0)))
                .clamp(10, 36).round(0),
            "冷却", "两次扫踢之间的等待；扫堂式缓得更久。")
    });

    stages("lowkick", [
        { level: 22, values: { sweep: 42 } },
        { level: 42, values: { sweep: 58, lunge: 3.4 } }
    ]);

    defineDamage("lowkick", "sweep", {}, { contact: true });

    describe("lowkick", [
        { key: "description.0", values: ["sweep", "collisionRadius"] },
        { key: "description.1", values: ["lunge", "speed"] },
        { key: "description.2", values: ["tripStages", "rootTicks", "tripTicks"] },
        { key: "reap.on", values: [], when: function (context) { return read(context.detail.values, ["reap"]) === true; } },
        { key: "reap.off", values: [], when: function (context) { return read(context.detail.values, ["reap"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sweep", "tier.1.lunge"] }
    ]);
}
