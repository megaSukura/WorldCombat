/**
 * 巴投 / circlethrow —— 第 078 组「强制退场」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：格斗、物理、威力 60、命中 90、PP 10、优先度 -6、接触；说明是
 *   「扔飞对手，强制拉后备宝可梦上场；如果对手为野生宝可梦，战斗将直接结束」。
 * - 即时战斗翻译：贴身抓住一个对手，越肩把它摔到自己背面。抓取要求实际近距身体接触与通视；命中成功后才进入
 *   抛投，抛线每刻按目标实际当前位置短步推进，途中撞天花板／墙就地落下收束，不追赶越墙的计划点。落地只在原地
 *   做一次允许的动作打断，并尝试原生 partyForceOut；抗搬运者吃抓摔伤害但不播放越肩飞行。本招不再持续清目标。
 * - 参数分散到精灵数据：摔击威力取物攻与等级，抓取距离取物攻，投掷距离取体重，抛物线顶高取体重，环数取物攻，
 *   抛飞时间取速度，时序取速度与等级。
 * - 配置 tight（贴身固投）：开启＝甩击 ×1.1、抓取距离 ×0.92，代价是投掷距离 ×0.8；关闭＝投掷距离 ×1.3、
 *   抓得稍远，代价是甩击 ×0.95。贴身更狠、更近，远掷更远、更轻。两个方向各有适用局面。
 *
 * 伤害段名 slam：这一摔随精灵数据变化的那部分威力。对手防御、相性与暴击在命中时由共享结算另算。
 */
namespace PokemonSkills {
    export const circlethrowId = "circlethrow";
    export const circlethrowScene = "world_combat:move_circlethrow";
    export const circlethrowThrowText = "world_combat.move.circlethrow.text.throw";
    export const circlethrowMissText = "world_combat.move.circlethrow.text.miss";
    export const circlethrowSwitchText = "world_combat.move.circlethrow.text.switch";

    actionParameters.define(circlethrowId, {
        /** 甩击威力：基础 44；物攻每比 60 多 1 加 0.35（夹 -14..+40），等级每比 30 多 1 加 0.3（夹 -4..+10）；tight ×1.1、远掷 ×0.95；夹在 32..100。 */
        slam: formula(
            F.base(44, "甩击威力")
                .plus(F.stat("attack").minus(60).times(0.35).clamp(-14, 40))
                .plus(F.level().minus(30).times(0.3).clamp(-4, 10))
                .times(F.when(F.pref("tight", text("worldcombat.skill.circlethrow.preference.tight")), F.const(1.1), F.const(0.95)))
                .clamp(32, 100).round(1),
            "甩击威力", {
                unit: "威力",
                description: "这一摔随精灵数据变化的那部分：物攻给出摔劲，等级给出熟练度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抓取距离：基础 2.5 格 +（物攻 − 60）×0.01（夹 -0.3..+0.8）；tight ×0.92；夹在 2.1..3.4 格。 */
        grip: formula(
            F.base(2.5, "抓取距离")
                .plus(F.stat("attack").minus(60).times(0.01).clamp(-0.3, 0.8))
                .times(F.when(F.pref("tight", text("worldcombat.skill.circlethrow.preference.tight")), F.const(0.92), F.const(1)))
                .clamp(2.1, 3.4).round(2),
            "抓取距离", {
                unit: " 格",
                description: "要贴身到这个距离、且中间无遮挡才能抓住对手；手劲大的抓得稍远，贴身固投要更近。它也是本招的实际射程。"
            }),
        /** 投掷距离：基础 3.2 格 +（体重 − 50）×0.004（夹 -0.2..+0.8）；tight ×0.8、远掷 ×1.3；夹在 1.8..6.5 格。 */
        fling: formula(
            F.base(3.2, "投掷距离")
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.2, 0.8))
                .times(F.when(F.pref("tight", text("worldcombat.skill.circlethrow.preference.tight")), F.const(0.8), F.const(1.3)))
                .clamp(1.8, 6.5).round(2),
            "投掷距离", {
                unit: " 格",
                description: "把对手从你头顶摔到身后多远；身子越重的个体送得越远，贴身固投会收回一些。撞墙会就地落下。"
            }),
        /** 抛物线顶高：基础 0.7 格 +（体重 − 50）×0.004（夹 -0.1..+0.5）；夹在 0.4..1.6 格。 */
        arc: formula(
            F.base(0.7, "抛物线顶高")
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.5))
                .clamp(0.4, 1.6).round(2),
            "抛物线顶高", {
                unit: " 格",
                description: "对手从头顶掠过时被抛到多高；身子越重的个体甩得越高。"
            }),
        /** 抛飞时间：基础 10 刻 −（速度 − 60）×0.02（夹 -2..+2）；夹在 6..14 刻。 */
        air: seconds(
            F.base(10, "抛飞时间")
                .minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .clamp(6, 14).round(0),
            "抛飞时间", "从抓住到落地的抛飞时间；速度越快摔得越干脆。"),
        /** 环数：基础 12 个 +（物攻 − 60）×0.1（夹 -2..+14）；夹在 8..30 个；驱动画面里的气环与尘环数量。 */
        rings: formula(
            F.base(12, "环数")
                .plus(F.stat("attack").minus(60).times(0.1).clamp(-2, 14))
                .clamp(8, 30).round(0),
            "环数", {
                unit: " 个",
                description: "抓取与落地时绽开的气环与尘环数量；摔劲越大越多，画面里的环也按它发射。"
            }),
        /** 起手：基础 11 刻 −（速度 − 60）×0.03（夹 -2..+2）；夹在 7..17 刻。 */
        tempo: seconds(
            F.base(11, "起手")
                .minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 2))
                .clamp(7, 17).round(0),
            "起手", "俯身、抓腕、转身的整套准备要多久；速度越快起得越短。"),
        /** 收招：基础 9 刻 −（速度 − 60）×0.02（夹 -2..+2）；夹在 5..13 刻。 */
        aftercast: seconds(
            F.base(9, "收招")
                .minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .clamp(5, 13).round(0),
            "收招", "摔完站稳的时间；快的个体收得干脆。"),
        /** 冷却：基础 100 刻 − 等级 ×0.4；夹在 75..150 刻。 */
        recharge: seconds(
            F.base(100, "冷却")
                .minus(F.level().times(0.4))
                .clamp(75, 150).round(0),
            "冷却", "两次巴投之间的等待；等级越高越熟练。PP 10 的代价。")
    });

    stages(circlethrowId, [
        { level: 32, values: { slam: 64 } },
        { level: 48, values: { slam: 76, fling: 4.2 } }
    ]);

    defineDamage(circlethrowId, "slam", { defenceCoefficient: 0.005, rationale: "摔击对防御的穿透接近默认，突出物攻与体重的差别。" }, { contact: true });

    describe(circlethrowId, [
        { key: "description.0", values: ["slam","grip"] },
        { key: "description.1", values: ["fling","arc","air"] },
        { key: "description.2", values: [] },
        { key: "tight.on", values: [], when: function (context) { return read(context.detail.values, ["tight"]) === true; } },
        { key: "tight.off", values: [], when: function (context) { return read(context.detail.values, ["tight"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.fling"] },
        { key: "description.additional", values: [] }
    ]);
}
