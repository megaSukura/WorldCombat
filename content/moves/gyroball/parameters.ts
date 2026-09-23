/**
 * 陀螺球 / gyroball 的参数与伤害段。
 *
 * 原生事实：Steel／物理／威力 0（由公式决定）／命中 100／PP 5／接触／bullet；
 *   威力 = floor(25 × 目标速度 / 自己速度) + 1，上限 150（Cobblemon 1.8，117 位直接学习者）。
 *   原生描述：「让身体高速旋转并撞击对手。速度比对手越慢，威力越大。」
 *
 * 翻译：把「越慢越强」翻成一件有形状的事——**站定把自己旋成一枚沉重的钢陀螺**，把「对手比自己快多少」
 *   一点点拧进转速里，转够了再短促地撞上去。对手越快，转速越高、这一撞越沉。它是唯一以「慢」为燃料的
 *   物理接触招：快的个体用它只是普通一撞，慢的个体才把它用成重锤。
 *
 * 与同族分开：电球（electroball）是同一台秤的反方向——它称的是「自己比对手快多少」、并把结果远投出去；
 *   两者并排站着，一个是贴身钢球、一个是远处电团，燃料方向相反。滚动系列（rollout／steelroller）靠跨出手
 *   变重或吃掉场地区分，陀螺球只在原地转满一圈、靠双方速度差决定一撞的分量。
 *
 * 数值分散（每个参数各吃不同的精灵数据，小差距才在场上看得出来）：
 *   roll     撞击威力：目标速度 / 自己速度的比值是主项（陀螺在越快的对手面前转得越猛），
 *            物攻给撞的狠度、体重给压进去的份量；定桩式 ×1.14、轻旋式 ×0.94。
 *   load     速度差载荷（目标速度 ÷ 自己速度，0..6）：详情页可读，也是画面里陀螺体积与转速的来源。
 *   lunge    垫前距离：速度给一点点，慢的个体滚不远。
 *   rush     每刻位移：速度，画面里陀螺前进的速度。
 *   collisionRadius 判定半径：碰撞箱宽度与身高。
 *   push     击退：体重与物攻。
 *   grains   钢屑点数：物攻派生，表现按它发射。
 *   tempo/recover/recharge 速度与等级决定起手、收招与冷却；定桩式转得更久也更费。
 *
 * 配置 `brace`（定桩式，默认关）双向取舍：
 *   开（定桩）：威力 ×1.14、击退 ×1.18，但垫前 ×0.86、每刻位移 ×0.92、起手 +2 刻、冷却 +6 刻——转得重，够得近。
 *   关（轻旋，原生形态）：垫得更远、转得更快、收招干净，代价是单发较低。
 *
 * 伤害段 `roll` 走共享换算（对手防御、相性与暴击在命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const gyroballId = "gyroball";
    export const gyroballScene = "world_combat:move_gyroball";
    export const gyroballHitText = "world_combat.move.gyroball.text.hit";
    export const gyroballMissText = "world_combat.move.gyroball.text.miss";
    export const gyroballSpinText = "world_combat.move.gyroball.text.spin";

    /** 速度差载荷：目标速度 ÷ max(1, 自己速度)，夹 0..6。威力的燃料，也是表现里陀螺的体积来源。 */
    const gyroballGap: Formula.Node = F.target("stat.speed", { key: "worldcombat.skill.gyroball.value.targetSpeed", fallback: "目标速度" })
        .max(1).div(F.stat("speed").max(1)).clamp(0, 6);

    actionParameters.define(gyroballId, {
        /** 撞击威力：(16 + 速度差 × 21 + 物攻偏移[−8,30] + 体重偏移[0,26]) × 定桩 1.14 / 轻旋 0.94；夹 24..168。 */
        roll: formula(
            F.base(16)
                .plus(gyroballGap.as({ key: "worldcombat.skill.gyroball.value.gap", fallback: "速度差载荷" }).times(21))
                .plus(F.stat("attack").minus(50).times(0.28).clamp(-8, 30))
                .plus(F.body("weight").minus(60).times(0.06).clamp(0, 26))
                .times(F.when(F.pref("brace"), F.const(1.14), F.const(0.94)))
                .clamp(24, 168).round(1),
            "撞击威力", {
                unit: "威力",
                description: "钢陀螺撞上去这一下的威力。主项是目标速度 ÷ 自己速度：对手比自己快越多，陀螺转得越猛、撞得越沉。物攻给狠度、体重给份量。定桩式再抬一成四。对手防御、相性与暴击在命中时另算。"
            }),
        /** 速度差载荷：目标速度 ÷ max(1, 自己速度)，夹 0..6；详情页可读，画面里陀螺的大小与转速按它走。 */
        load: formula(
            gyroballGap.as({ key: "worldcombat.skill.gyroball.value.gap", fallback: "速度差载荷" }).round(2),
            "速度差载荷", {
                unit: "倍",
                description: "陀螺从「对手比自己快多少」里攒到的载荷（目标速度 ÷ 自己速度，0..6）。它直接进撞击威力的公式；表现里的陀螺体积、转速与钢屑也按它放大，所以对手越快，画面上的陀螺越沉。"
            }),
        /** 垫前距离：2.4 + 速度偏移[−0.3,0.7]；定桩 ×0.86；夹 1.8..3.6。 */
        lunge: formula(
            F.base(2.4).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.3, 0.7))
                .times(F.when(F.pref("brace"), F.const(0.86), F.const(1)))
                .clamp(1.8, 3.6).round(2),
            "垫前距离", {
                unit: "格",
                description: "转满之后朝对手垫进去的距离，也是本招的实际射程来源；腿快的个体垫得远一点，定桩式滚得近。"
            }),
        /** 每刻位移：0.5 + 速度偏移[−0.08,0.25]；定桩 ×0.92；夹 0.4..0.9。 */
        rush: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.08, 0.25))
                .times(F.when(F.pref("brace"), F.const(0.92), F.const(1)))
                .clamp(0.4, 0.9).round(2),
            "滚动速度", {
                unit: "格/刻",
                description: "陀螺每刻前进的距离；速度快的个体滚得利落，定桩式沉一点。"
            }),
        /** 判定半径：0.5 + 宽度偏移[−0.06,0.3] + 身高偏移[−0.05,0.2]；夹 0.42..0.92。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.35).clamp(-0.06, 0.3))
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.2))
                .clamp(0.42, 0.92).round(2),
            "判定半径", {
                unit: "格",
                description: "陀螺的轮缘能扫到多大一圈；身板越宽的个体扫得越宽，画面里的钢球与它一致。"
            }),
        /** 击退：0.35 + 体重偏移[0,0.55] + 物攻偏移[−0.05,0.3]；定桩 ×1.18；夹 0.2..1.1。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(80).times(0.003).clamp(0, 0.55))
                .plus(F.stat("attack").minus(50).times(0.004).clamp(-0.05, 0.3))
                .times(F.when(F.pref("brace"), F.const(1.18), F.const(1)))
                .clamp(0.2, 1.1).round(2),
            "击退", {
                unit: "格",
                description: "被撞中的人沿滚动方向被顶开的距离；越重、物攻越高顶得越远，定桩式撞得更开。"
            }),
        /** 钢屑点数：14 + 物攻偏移[−3,14]；夹 9..40。 */
        grains: formula(
            F.base(14).plus(F.stat("attack").minus(50).times(0.12).clamp(-3, 14)).clamp(9, 40).round(0),
            "钢屑点数", {
                unit: "点",
                description: "陀螺转动与撞击时迸出的钢屑数量，随物攻增长；粒子直接按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：9 − 速度偏移[−1,3]；定桩 +2；夹 5..14。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 3))
                .plus(F.when(F.pref("brace"), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "站定旋成陀螺的时间；速度越快转起来越快，定桩式要多转两刻。"),
        /** 收招：8 − 速度偏移[−2,3]；夹 4..12。 */
        recover: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "撞完收住陀螺的时间；速度越快收得越干脆。"),
        /** 冷却：28 − 等级偏移[0,8] + 定桩 6；夹 16..44。 */
        recharge: seconds(
            F.base(28).minus(F.level().minus(20).times(0.15).clamp(0, 8))
                .plus(F.when(F.pref("brace"), F.const(6), F.const(0)))
                .clamp(16, 44).round(0),
            "冷却", "下一记陀螺球前的等待；等级高的个体回得更快，定桩式更费。PP 5 的代价。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(gyroballId, "roll", {}, { contact: true });

    stages(gyroballId, [
        { level: 30, values: { roll: 34 } },
        { level: 52, values: { roll: 42, collisionRadius: 0.62 } }
    ]);

    describe(gyroballId, [
        { key: "description.0", values: ["roll","load"] },
        { key: "description.1", values: ["lunge", "rush", "collisionRadius", "push"] },
        { key: "brace.on", values: [], when: function (context) { return read(context.detail.values, ["brace"]) === true; } },
        { key: "brace.off", values: [], when: function (context) { return read(context.detail.values, ["brace"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.roll"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.roll", "tier.1.collisionRadius"] }
    ]);
}
