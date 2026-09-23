/**
 * 棉孢子 / Cotton Spore 的参数与数值来源。
 *
 * 原生：Grass／Status／威力 —／命中 100／PP 40／目标 allAdjacentFoes／boosts={spe:-2}（大幅降低速度）／
 *       flags 含 powder（粉末类）。
 * 世界化：不是朝一个方向打出去，而是**当场炸开一团棉絮**——孢子以自身为圆心扑向四周，
 *   黏在附近每个非友方身上，大幅拖慢它们的脚步。它是本组唯一不需要瞄准、也不需要目标在身的招：
 *   想让它成立，必须自己走进人群。覆盖、黏度、留絮时长各读一项个体数据，配置「爆发」在覆盖与深度之间取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   burstRadius  3.0 + (宽度 − 0.9) × 1.2 格，爆发 ×1.25／聚集 ×0.8，夹 1.6..4.5；体型越宽炸得越开。
 *   speedDrop    基础 2 级，体重 ≥ 220 升到 3 级，聚集再 +1（夹 2..3）；越沉、越集中，黏得越死。
 *   clingTicks   110 + 亲密度 × 0.5，爆发 ×0.85／聚集 ×1.25，夹 90..260；越亲近越愿意让棉絮留久些。
 *   spores       24 + (特攻 − 60) × 0.4，夹 14..64；特攻越高，一次炸出的孢子越多（也是画面里的数量）。
 *   maxTargets   4 + (等级 − 30) × 0.06，夹 4..8；等级越高罩住的人越多。
 *   tempo        9 − (速度 − 60) × 0.03 刻，夹 7..13；速度越快越早炸开。
 *   recharge     100 + (等级 − 30) × 0.5 刻，夹 90..130；爆发 ×0.9，聚集 ×1.15。
 */
namespace PokemonSkills {
    export const cottonsporeId = "cottonspore";
    export const cottonsporeEffect = "world_combat:cotton_clung";
    export const cottonsporeScene = "world_combat:move_cottonspore";
    export const cottonsporeSpot = "world_combat:status/cottoned";

    actionParameters.define(cottonsporeId, {
        burstRadius: formula(
            F.base(3.0).plus(F.body("width").minus(0.9).times(1.2))
                .times(F.when(F.pref("spread", text("worldcombat.skill.cottonspore.preference.spread")), F.const(1.25), F.const(0.8)))
                .clamp(1.6, 4.5).round(2),
            "孢子半径", {
                unit: " 格",
                description: "孢子以自身为圆心覆盖的半径；体型越宽炸得越开，爆发取向铺得更广。"
            }),
        speedDrop: formula(
            F.base(2).plus(F.when(F.body("weight").gte(220), F.const(1), F.const(0)))
                .plus(F.when(F.pref("spread", text("worldcombat.skill.cottonspore.preference.spread")), F.const(0), F.const(1)))
                .clamp(2, 3),
            "速度下降", {
                unit: " 级",
                description: "被棉絮黏住者损失的速度等级；体重 220 以上再多一级，聚集取向也再多一级。"
            }),
        clingTicks: seconds(
            F.base(110).plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("spread", text("worldcombat.skill.cottonspore.preference.spread")), F.const(0.85), F.const(1.25)))
                .clamp(90, 260).round(0),
            "留絮时长", "棉絮黏在身上多久；越亲近留得越久，聚集取向更黏。"),
        spores: formula(
            F.base(24).plus(F.stat("specialAttack").minus(60).times(0.4)).clamp(14, 64).round(0),
            "孢子量", {
                unit: " 个",
                description: "一次炸出的孢子数量；特攻越高越多，画面里的飞行孢子也按它画出。"
            }),
        maxTargets: formula(F.base(4).plus(F.level().minus(30).max(0).times(0.06)).clamp(4, 8).round(0), "黏住人数", {
            unit: " 人",
            description: "一次最多黏住几个人；等级越高罩得越多。"
        }),
        tempo: seconds(F.base(9).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(7, 13), "起手",
            "把孢子鼓起来需要多久；速度越快越早炸开。"),
        recharge: seconds(F.base(100).plus(F.level().minus(30).max(0).times(0.5)).clamp(90, 130), "冷却",
            "两次炸开之间的等待；等级越高越熟练。")
    });
    describe(cottonsporeId, [
        { key: "description.0", values: ["speedDrop", "clingTicks"] },
        { key: "description.1", values: ["burstRadius", "maxTargets"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
