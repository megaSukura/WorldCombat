/**
 * 龙之俯冲 / dragonrush 的参数与伤害段。
 *
 * 原生事实：Dragon／物理／威力 100／命中 75／PP 10／接触／20% 畏缩（Cobblemon 1.8，41 位直接学习者）。
 *   原生描述：「释放出骇人的杀气，一边威慑一边撞击对手。有时会使对手畏缩。」
 *
 * 翻译：把「杀气 + 俯冲」翻成一段**先张势、再扑下**的两拍动作——起手先把自己的杀气铺成一圈可见的威压，
 *   再从高处沿一条弧线俯冲砸在锁定点上；落点小范围内所有敌人一起吃这一撞，被杀气罩住、被速度差镇住的
 *   目标更容易被撞懵。命中率刻意做得比一般接触招低（原生 75%），因为俯冲的落点在起跳时锁定，对手在腾空
 *   期走开就能躲过——这就是它「一边威慑一边撞」的形状。
 *
 * 与同族分开：泰山压顶（bodyslam）是原地起跳的坐压、靠体重压出麻痹；龙之俯冲是**先亮杀气再前扑**的俯冲，
 *   身份在那圈起手威压：玩家从画面就知道它将往哪落、该往哪躲。疯狂滚压（steamroller）贴地滚过一排，不腾空。
 *
 * 数值分散（每个参数各吃不同的精灵数据）：
 *   dive      俯冲威力：物攻给撞击狠度、体重给砸下的份量、身高给龙体的长度；威压式 ×0.94、迅袭式 ×1.08。
 *   accuracy  命中率：速度决定能不能在空中修正落点（原生 75%）；威压式压低、迅袭式抬高。
 *   menace    威压半径：特攻决定杀气的铺开范围，等级给一点；威压式 ×1.3。详情页可读，也是画面里威压圈的大小。
 *   flinchChance 畏缩几率：特攻 + **自己比目标快多少**（快出来的速度=扑到的把握）；威压式 ×1.25。
 *   flinchTicks  畏缩持续：等级与威压式。
 *   landRadius   落点半径：身高与体重。
 *   push         顶开距离：体重与物攻。
 *   hop／airTicks 俯冲高度与滞空：速度决定起跳与落地的快慢。
 *   dust         土屑点数：物攻派生，表现按它发射。
 *   tempo/recover/recharge 速度与等级决定起手、收招与冷却；威压式更慢更费。
 *
 * 配置 `dread`（威压式，默认关）双向取舍：
 *   开（威压）：威压圈更大（×1.3）、畏缩更易（×1.25）更久（+4 刻），但俯冲威力 ×0.94、命中率 −0.04、
 *     起手 +3 刻、冷却 +8 刻——镇得更狠，这一撞更钝。
 *   关（迅袭，原生形态）：威力 ×1.08、命中 +0.04、扑得更快，代价是威压圈更小、畏缩更不稳。
 *
 * 伤害段 `dive` 走共享换算（对手防御、相性与暴击在命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const dragonrushId = "dragonrush";
    export const dragonrushScene = "world_combat:move_dragonrush";
    export const dragonrushFlinchEffect = "world_combat:dragonrush_flinch";
    export const dragonrushHitText = "world_combat.move.dragonrush.text.hit";
    export const dragonrushMissText = "world_combat.move.dragonrush.text.miss";
    export const dragonrushFlinchText = "world_combat.move.dragonrush.text.flinch";

    /** 速度差：自己速度 − 目标速度，只取正；扑得比对手快多少，决定这一撞镇不镇得住。 */
    const dragonrushEdge: Formula.Node = F.stat("speed")
        .minus(F.target("stat.speed", { key: "worldcombat.skill.dragonrush.value.targetSpeed", fallback: "目标速度" })).max(0);

    actionParameters.define(dragonrushId, {
        /** 俯冲威力：(80 + 物攻偏移[−14,38] + 体重偏移[0,24] + 身高偏移[−2,8]) × 威压 0.94 / 迅袭 1.08；夹 58..158。 */
        dive: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.35).clamp(-14, 38))
                .plus(F.body("weight").minus(80).times(0.05).clamp(0, 24))
                .plus(F.body("height").minus(1.4).times(4).clamp(-2, 8))
                .times(F.when(F.pref("dread"), F.const(0.94), F.const(1.08)))
                .clamp(58, 158).round(1),
            "俯冲威力", {
                unit: "威力",
                description: "整条龙从高处砸下这一下的威力；物攻给狠度、体重给份量、身高给龙体的长度。迅袭式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 命中率：0.66 + 速度偏移[−0.08,0.18] + 等级偏移[0,0.06] + 威压 −0.04 / 迅袭 +0.04；夹 0.55..0.92。 */
        accuracy: percent(
            F.base(0.66).plus(F.stat("speed").minus(70).times(0.0022).clamp(-0.08, 0.18))
                .plus(F.level().minus(20).times(0.001).clamp(0, 0.06))
                .plus(F.when(F.pref("dread"), F.const(-0.04), F.const(0.04)))
                .clamp(0.55, 0.92).round(3),
            "命中率", "俯冲能不能砸在锁定的落点上（原生 75%）；速度快的个体能在空中修正，威压式扑得更沉、更容易砸偏。落点在起跳时锁定，对手走开就躲过了。"),
        /** 威压半径：2.6 + 特攻偏移[−0.6,2.2] + 等级偏移[0,1.0]；威压 ×1.3；夹 2..5.6。 */
        menace: formula(
            F.base(2.6).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.6, 2.2))
                .plus(F.level().minus(20).times(0.03).clamp(0, 1.0))
                .times(F.when(F.pref("dread"), F.const(1.3), F.const(1)))
                .clamp(2, 5.6).round(2),
            "威压半径", {
                unit: "格",
                description: "杀气铺开多大一圈；特攻越高、等级越高铺得越开，威压式再大一圈。它也是画面里威压圈的大小——玩家一眼看出这一扑的威慑范围。"
            }),
        /** 畏缩几率：0.16 + 特攻偏移[0,0.16] + 速度差偏移[0,0.12]；威压 ×1.25；夹 0.12..0.52。 */
        flinchChance: percent(
            F.base(0.16).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(0, 0.16))
                .plus(dragonrushEdge.times(0.0012).clamp(0, 0.12))
                .times(F.when(F.pref("dread"), F.const(1.25), F.const(1)))
                .clamp(0.12, 0.52).round(3),
            "畏缩几率", "被这一撞压住、无法开始新动作的几率（原生 20%）；特攻越高杀气越足，扑得比对手越快越镇得住，威压式再抬一档。"),
        /** 畏缩持续：11 + 等级偏移[0,8] 刻；威压 +4；夹 9..24。 */
        flinchTicks: seconds(
            F.base(11).plus(F.level().minus(20).times(0.12).clamp(0, 8))
                .plus(F.when(F.pref("dread"), F.const(4), F.const(0)))
                .clamp(9, 24).round(0),
            "畏缩持续", "被杀气压住的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。等级越高、威压式越久。"),
        /** 落点半径：1.4 + 身高偏移[−0.2,1.1] + 体重偏移[0,0.8]；夹 1.2..3。 */
        landRadius: formula(
            F.base(1.4).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.2, 1.1))
                .plus(F.body("weight").minus(80).times(0.004).clamp(0, 0.8))
                .clamp(1.2, 3.0).round(2),
            "落点半径", {
                unit: "格",
                description: "砸地时被一起罩住的范围；龙体越长、越重砸出的圈越大。"
            }),
        /** 顶开距离：0.4 + 体重偏移[0,0.7] + 物攻偏移[−0.05,0.3]；夹 0.2..1.2。 */
        push: formula(
            F.base(0.4).plus(F.body("weight").minus(80).times(0.004).clamp(0, 0.7))
                .plus(F.stat("attack").minus(60).times(0.003).clamp(-0.05, 0.3))
                .clamp(0.2, 1.2).round(2),
            "顶开距离", {
                unit: "格",
                description: "冲击把落点周围的敌人沿背离方向推开多远；越重、物攻越高推得越远。"
            }),
        /** 跃起高度：2.2 + 速度偏移[−0.4,0.8]；夹 1.6..3。 */
        hop: formula(
            F.base(2.2).plus(F.stat("speed").minus(70).times(0.01).clamp(-0.4, 0.8)).clamp(1.6, 3.0).round(2),
            "跃起高度", {
                unit: "格",
                description: "俯冲前腾到多高；扑得快的个体起得更高。"
            }),
        /** 滞空时长：9 − 速度偏移[−2,3] 刻；威压 +3；夹 6..16。 */
        airTicks: seconds(
            F.base(9).minus(F.stat("speed").minus(70).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("dread"), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "滞空时长", "从起跳到砸地的时间；快脚落得干脆、留给对手的闪避窗口更短，威压式在空中多停一会儿。"),
        /** 土屑点数：16 + 物攻偏移[−3,16]；夹 10..44。 */
        dust: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.12).clamp(-3, 16)).clamp(10, 44).round(0),
            "土屑点数", {
                unit: "点",
                description: "俯冲与砸地时掀起的土屑数量，随物攻增长；粒子直接按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：10 − 速度偏移[−1.5,3] 刻；威压 +3；夹 5..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(70).times(0.03).clamp(-1.5, 3))
                .plus(F.when(F.pref("dread"), F.const(3), F.const(0)))
                .clamp(5, 16).round(0),
            "起手", "从张势到起跳的时间；速度越快越早扑出，威压式要多亮一会儿杀气——这段时间是对手唯一能拉开的机会。"),
        /** 收招：12 − 速度偏移[−2,2.5] 刻；夹 6..16。 */
        recover: seconds(
            F.base(12).minus(F.stat("speed").minus(70).times(0.02).clamp(-2, 2.5)).clamp(6, 16).round(0),
            "收招", "砸地后重新站稳的时间；快脚收得利落。"),
        /** 冷却：38 − 等级偏移[0,7] + 威压 8；夹 22..58。 */
        recharge: seconds(
            F.base(38).minus(F.level().minus(20).times(0.25).clamp(0, 7))
                .plus(F.when(F.pref("dread"), F.const(8), F.const(0)))
                .clamp(22, 58).round(0),
            "冷却", "下一次俯冲前的等待；等级高的个体回得更快，威压式更费。PP 10 的代价。")
    });

    defineDamage(dragonrushId, "dive", {}, { contact: true });

    stages(dragonrushId, [
        { level: 35, values: { dive: 100 } },
        { level: 55, values: { dive: 118, flinchChance: 0.30 } }
    ]);

    describe(dragonrushId, [
        { key: "description.0", values: ["dive","accuracy"] },
        { key: "description.1", values: ["menace","landRadius","flinchChance","flinchTicks"] },
        { key: "description.2", values: ["hop", "airTicks", "push"] },
        { key: "dread.on", values: [], when: function (context) { return read(context.detail.values, ["dread"]) === true; } },
        { key: "dread.off", values: [], when: function (context) { return read(context.detail.values, ["dread"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dive"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dive", "tier.1.flinchChance"] }
    ]);
}
