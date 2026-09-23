/**
 * 电球 / electroball 的参数与伤害段。
 *
 * 原生事实：Electric／特殊／威力 0（由公式决定）／命中 100／PP 10／单体／bullet；
 *   威力 = [40, 60, 80, 120, 150][min(floor(自己速度 / 目标速度), 4)]（Cobblemon 1.8，67 位直接学习者）。
 *   原生描述：「用电气团撞向对手。自己比对手速度越快，威力越大。」
 *
 * 翻译：把「越快越强」翻成一颗会随速度比长大的电团——施法者把「自己比对手快多少」充进电团，
 *   球越充越大、越亮，然后笔直投出去撞上就炸。它是陀螺球（gyroball）的反方向：同一台秤，一个称
 *   「对方比自己快多少」并贴身上去，一个称「自己比对方快多少」并远远投出。
 *
 * 与同族分开：电击／十万伏特一类是短距电刺或麻痹手，电球没有麻痹、也不贴身——它的全部价值在一颗
 *   随速度比放大的远投弹，快脚精灵的专属重炮。
 *
 * 数值分散（每个参数各吃不同的精灵数据）：
 *   charge    电团威力：自己速度 / 目标速度的比值是主项，特攻决定电压；过载式 ×1.12、轻快式 ×0.94。
 *   load      速度差载荷（自己速度 ÷ 目标速度，0..5）：详情页可读，也是画面里电团体积与亮度的来源。
 *   flight    飞行速度：自己速度；过载式把球做重、飞得慢一点（对手更容易走开）。
 *   reach     投掷距离：速度与等级。
 *   collisionRadius 电团判定半径：特攻与身高；过载式 ×1.2。
 *   sparks    电火花量：特攻与载荷，表现按它发射。
 *   tempo/recover/recharge 速度与等级决定起手、收招与冷却；过载式更慢更费。
 *
 * 配置 `overcharge`（过载式，默认关）双向取舍：
 *   开（过载）：威力 ×1.12、判定 ×1.2，但飞行 ×0.85（球更重更慢）、起手 +2 刻、冷却 +6 刻——一发更狠但更容易落空。
 *   关（轻快，原生形态）：飞得快、出手快、回得干净，单发略轻。
 *
 * 伤害段 `charge` 走共享换算（对手特防、相性与暴击在命中时另算）；无接触，不写 contact。
 */
namespace PokemonSkills {
    export const electroballId = "electroball";
    export const electroballScene = "world_combat:move_electroball";
    export const electroballHitText = "world_combat.move.electroball.text.hit";
    export const electroballMissText = "world_combat.move.electroball.text.miss";
    export const electroballMaxText = "world_combat.move.electroball.text.max";

    /** 速度差载荷：自己速度 ÷ max(1, 目标速度)，夹 0..5。威力燃料，也是表现里电团的体积来源。 */
    const electroballLoad: Formula.Node = F.stat("speed").max(1)
        .div(F.target("stat.speed", { key: "worldcombat.skill.electroball.value.targetSpeed", fallback: "目标速度" }).max(1)).clamp(0, 5);

    actionParameters.define(electroballId, {
        /** 电团威力：(20 + 速度差 × 24 + 特攻偏移[−10,34]) × 过载 1.12 / 轻快 0.94；夹 26..172。 */
        charge: formula(
            F.base(20)
                .plus(electroballLoad.as({ key: "worldcombat.skill.electroball.value.gap", fallback: "速度差载荷" }).times(24))
                .plus(F.stat("specialAttack").minus(60).times(0.32).clamp(-10, 34))
                .times(F.when(F.pref("overcharge"), F.const(1.12), F.const(0.94)))
                .clamp(26, 172).round(1),
            "电团威力", {
                unit: "威力",
                description: "电团撞上炸开时的威力。主项是自己速度 ÷ 目标速度：自己比对手快越多，电团越大越狠。特攻给电压。过载式再抬一成二。对手特防、相性与暴击在命中时另算。"
            }),
        /** 速度差载荷：自己速度 ÷ max(1, 目标速度)，夹 0..5；详情页可读，画面里电团的大小与亮度按它走。 */
        load: formula(
            electroballLoad.as({ key: "worldcombat.skill.electroball.value.gap", fallback: "速度差载荷" }).round(2),
            "速度差载荷", {
                unit: "倍",
                description: "电团从「自己比对手快多少」里充到的载荷（自己速度 ÷ 目标速度，0..5）。它直接进威力公式；表现里电团的体积、亮度与电火花量也按它放大。"
            }),
        /** 飞行速度：0.9 + 速度偏移[−0.2,0.6]；过载 ×0.85；夹 0.7..1.9。 */
        flight: formula(
            F.base(0.9).plus(F.stat("speed").minus(80).times(0.006).clamp(-0.2, 0.6))
                .times(F.when(F.pref("overcharge"), F.const(0.85), F.const(1)))
                .clamp(0.7, 1.9).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "电团每刻飞过的距离；速度快、出手利落的个体投得更急，过载式把球做重、飞得慢一点。"
            }),
        /** 投掷距离：8 + 速度偏移[−1.5,3] + 等级偏移[0,1.6]；夹 6..16。 */
        reach: formula(
            F.base(8).plus(F.stat("speed").minus(80).times(0.03).clamp(-1.5, 3))
                .plus(F.level().minus(20).times(0.05).clamp(0, 1.6))
                .clamp(6, 16).round(2),
            "投掷距离", {
                unit: "格",
                description: "电团能投到多远，也是本招的实际射程；速度快的个体投得更远。"
            }),
        /** 判定半径：0.28 + 特攻偏移[−0.05,0.18] + 身高偏移[−0.02,0.12]；过载 ×1.2；夹 0.2..0.6。 */
        collisionRadius: formula(
            F.base(0.28).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.05, 0.18))
                .plus(F.body("height").minus(1.4).times(0.05).clamp(-0.02, 0.12))
                .times(F.when(F.pref("overcharge"), F.const(1.2), F.const(1)))
                .clamp(0.2, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "电团的碰撞半径；特攻高的个体球做得更大、更不容易擦过去，过载式再放大两成。"
            }),
        /** 电火花量：12 + 特攻偏移[−3,18] + 载荷 × 3；夹 10..42。 */
        sparks: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.14).clamp(-3, 18))
                .plus(electroballLoad.as({ key: "worldcombat.skill.electroball.value.gap", fallback: "速度差载荷" }).times(3))
                .clamp(10, 42).round(0),
            "电火花量", {
                unit: "点",
                description: "电团飞行与炸开时迸出的电火花数量；特攻越高、载荷越满越密，粒子直接按它发射。"
            }),
        /** 起手：6 − 速度偏移[−1,2.5]；过载 +2；夹 3..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(80).times(0.02).clamp(-1, 2.5))
                .plus(F.when(F.pref("overcharge"), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "把电充成一颗球的时间；速度越快充得越快，过载式要多攒两刻。"),
        /** 收招：6 − 速度偏移[−1,1.5]；夹 3..10。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(80).times(0.01).clamp(-1, 1.5)).clamp(3, 10).round(0),
            "收招", "投出之后收回手臂的收势；速度越快越利落。"),
        /** 冷却：26 − 速度偏移[−3,5] − 等级偏移[0,4] + 过载 6；夹 14..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(80).times(0.05).clamp(-3, 5))
                .minus(F.level().minus(20).times(0.1).clamp(0, 4))
                .plus(F.when(F.pref("overcharge"), F.const(6), F.const(0)))
                .clamp(14, 40).round(0),
            "冷却", "下一颗电团前的等待；速度越快、等级越高回得越快，过载式更费。PP 10 的代价。")
    });

    defineDamage(electroballId, "charge", {});

    stages(electroballId, [
        { level: 30, values: { charge: 40 } },
        { level: 50, values: { charge: 50, reach: 9.5 } }
    ]);

    describe(electroballId, [
        { key: "description.0", values: ["charge","load"] },
        { key: "description.1", values: ["reach","flight","collisionRadius"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.charge"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.charge","tier.1.reach"] }
    ]);
}
