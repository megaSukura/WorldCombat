/**
 * 自由落体 / skydrop 的参数与伤害段。
 *
 * 原生事实：Flying／Physical／威力 60／命中 100／PP 10／contact＋charge／gravity／nosleeptalk／noassist。
 *   第 1 回合把对手带到空中（对手不能行动），第 2 回合摔下攻击；对手太重（原生约 ≥200kg）时抓不起来。
 *
 * 翻译：把两回合压成一段连续动作——**贴身抓住 → 提上天 → 滞空（对手不能行动）→ 摔到地面**。原生的
 *   「太重抓不动」保留为一条可读的反制：超过 `liftCap` 的目标在提交前就被拒绝，不花 PP。
 *   原生第二回合的 60 威力落成落地那一记 `slam`，按**目标体重**与**实际提起的高度**结算：抓得越高、
 *   目标越沉，摔得越重；天花板压顶提不高时这一记随之变轻。
 *
 * 与同族分开（「垂直轴」）：自由落体是贴身、单体、控制最重的一招——它把目标从战场里摘出去一段，
 *   再连本带利摔回来；击落是远程打落会飞的目标，飞身重压是近身跃起压下来（双属性、按体重结算）。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   slam      摔落威力 60 + 物攻偏移 + **目标体重**偏移；配置再乘一档，落地时另乘实际高度系数。
 *   liftCap   起吊上限 300kg + 物攻偏移 + **施法者体重**偏移：力量与自身体量决定能拎起多沉的目标。
 *   altitude  提起高度 4 格 + 施法者身高偏移；高抛配置再抬一档。
 *   holdTicks 滞空时长 22 刻 − 速度偏移 + 高抛加成：速度快滞留短，高抛滞留久。
 *   liftSpeed 上升速度 0.5 格/刻 + 速度偏移。
 *   dropSpeed 摔落速度 1.0 格/刻 + 速度偏移：决定落地那一下的节奏。
 *   reach     抓取距离 4 格 + 速度 + 等级。
 *
 * 配置 `carryHigh`（高抛）：开启＝更高、滞空更久、摔落 ×1.15，起手 +3 刻、冷却 +10 刻；关闭＝低位速摔、
 *   摔落 ×0.85、收手更快。两向各有适用局面。
 *
 * 伤害段 `slam` 与参数同名，走共享换算（原生类别 Physical、属性 Flying、contact）。
 */
namespace PokemonSkills {
    /** 配置项的值：高抛（true）与低位速摔（false）。 */
    export function skydropHigh(config: any): boolean { return !!config && config.carryHigh === true; }

    actionParameters.define("skydrop", {
        /** 摔落威力：60 + 物攻偏移[−12,30] + 目标体重偏移[−8,44]；高抛 ×1.15 / 速摔 ×0.85；夹 40..170。 */
        slam: formula(
            F.base(60)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-12, 30))
                .plus(F.target("individual.weight", { key: "worldcombat.skill.skydrop.value.targetWeight", fallback: "目标体重" }).minus(200).times(0.06).clamp(-8, 44))
                .times(F.when(F.pref("carryHigh"), F.const(1.15), F.const(0.85)))
                .clamp(40, 170).round(1),
            "摔落威力", { base: 60,
                unit: "威力",
                description: "把目标摔到地上那一下的威力；物攻越高、目标越沉摔得越重。落地时再乘实际提起的高度系数（天花板压顶提不高就更轻）；对手防御、相性与暴击在命中时另算。"
            }),
        /** 起吊上限：300kg + 物攻偏移[0,200] + 自身体重偏移[0,160]；夹 180..760 kg。 */
        liftCap: formula(
            F.base(300)
                .plus(F.stat("attack").minus(60).times(3).clamp(0, 200))
                .plus(F.body("weight").minus(300).times(0.4).clamp(0, 160))
                .clamp(180, 760).round(0),
            "起吊上限", {
                unit: "千克",
                description: "能拎起来的目标体重上限；物攻越高、自身体量越大拎得越沉。超过这个重量的目标抓不起来，本招在提交前被拒绝，不花 PP。"
            }),
        /** 提起高度：4 + 身高偏移[−0.4,1.4] + 高抛 1.8；夹 2.6..8 格。 */
        altitude: formula(
            F.base(4.0)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.4, 1.4))
                .plus(F.when(F.pref("carryHigh"), F.const(1.8), F.const(0)))
                .clamp(2.6, 8).round(2),
            "提起高度", { base: 4.0,
                unit: "格",
                description: "把目标提离地面多高；身量越高、高抛配置提得越高，落地的这一记也越重。"
            }),
        /** 滞空时长：22 − 速度偏移[−8,5] + 高抛 18；夹 12..56 刻。 */
        holdTicks: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.1).clamp(-5, 8))
                .plus(F.when(F.pref("carryHigh"), F.const(18), F.const(0)))
                .clamp(12, 56).round(0),
            "滞空时长", "把对手拎在空中停多久；速度快的个体滞留短，高抛配置滞留长。滞空期间对手无法行动。"),
        /** 上升速度：0.5 + 速度偏移[−0.1,0.35]；夹 0.3..1.0 格/刻。 */
        liftSpeed: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.35)).clamp(0.3, 1.0).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "把目标往上提的快慢；速度快的个体更快到位、更少给对手的队友反应时间。"
            }),
        /** 摔落速度：1.0 + 速度偏移[−0.2,0.6]；夹 0.6..1.8 格/刻。 */
        dropSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.6)).clamp(0.6, 1.8).round(2),
            "摔落速度", {
                unit: "格/刻",
                description: "目标被摔下去的快慢；速度快的个体摔得更急。"
            }),
        /** 抓取距离：4 + 速度偏移[−0.5,1.0] + 等级偏移[0,1]；夹 3..6 格。 */
        reach: formula(
            F.base(4).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.5, 1.0))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1))
                .clamp(3, 6).round(1),
            "抓取距离", {
                unit: "格",
                description: "要贴到多近才能抓住对手；速度与等级提高抓取距离。它也是本招的实际射程来源。"
            }),
        /** 抓取判定：0.45 + 体型高度偏移[−0.08,0.25]；夹 0.35..0.8 格。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.25)).clamp(0.35, 0.8).round(2),
            "抓取判定", {
                unit: "格",
                description: "贴身抓取时能抓到的范围；大个子的手臂更长。"
            })
    });

    defineDamage("skydrop", "slam", {}, { contact: true });

    stages("skydrop", [
        { level: 30, values: { slam: 70 } },
        { level: 50, values: { slam: 82, altitude: 5 } }
    ]);

    describe("skydrop", [
        { key: "description.0", values: ["slam"] },
        { key: "description.1", values: ["liftCap"] },
        { key: "description.2", values: ["altitude", "holdTicks"] },
        { key: "description.3", values: ["reach", "liftSpeed", "dropSpeed"] },
        { key: "high.on", values: [], when: function (context) { return skydropHigh(context.detail.values); } },
        { key: "high.off", values: [], when: function (context) { return !skydropHigh(context.detail.values); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.altitude"] }
    ]);
}
