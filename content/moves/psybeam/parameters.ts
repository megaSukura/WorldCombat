/**
 * 幻象光线 / psybeam —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 65／命中 100／PP 20／单体；10% 概率使目标混乱（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「奇特的光线（peculiar ray）」落成一道**会自己拐弯去追人的幻影射线**——它不笔直，施法者眼神一凝，
 * 射出一道紫光，紫光贴着掩体拐进目标怀里；被追上的人眼前浮出幻影，可能恍惚。它和族里的走法分开：
 * 念力是又直又快的廉价念弹、信号光束是横扫一片的信号走廊，幻象光线只有一条，但会追、会穿。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   ray          射线威力：特攻定幻影的压强，等级让幻影更凝实。
 *   reach        射程：特攻决定这束光能追多远。
 *   velocity     弹速：速度决定紫光窜得多急；重影更沉。
 *   turn         转向：速度决定它每刻能拐多少度——灵巧的个体追得死，笨重的个体追不上。
 *   radius       判定半径：体型高度决定光柱粗细。
 *   confuseChance 恍惚概率：原生 10% 起，特攻与等级提高咬住的机会。
 *   dazeTicks    恍惚时长：特攻与等级决定幻影缠多久。
 *   fumble       失手率：恍惚期间每次想出手被打散的概率，存进载体振幅。
 *   motes        幻光数：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `echo`（回响）双向取舍：开启＝紫光命中后继续穿行去打第二个目标（pierce 1）、转向更死、恍惚更久，
 * 但单发 ×0.86、弹速 ×0.85、起手 +3、冷却 +6；关闭（单影）＝更快更重的一束，只打一个，代价是不会穿。
 *
 * 伤害段 `ray`：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const psybeamId = "psybeam";
    export const psybeamScene = "world_combat:move_psybeam";
    export const psybeamEffect = "world_combat:psybeam_trance";
    export const psybeamDazeText = "world_combat.move.psybeam.text.daze";
    export const psybeamMissText = "world_combat.move.psybeam.text.miss";

    actionParameters.define(psybeamId, {
        /** 射线威力：58 + 特攻偏移[−12,30] + 等级(≥22)偏移[0,10]，回响 ×0.86；夹 34..108。 */
        ray: formula(
            F.base(58)
                .plus(F.stat("specialAttack").minus(52).times(0.28).clamp(-12, 30))
                .plus(F.level().minus(22).times(0.45).clamp(0, 10))
                .times(F.when(F.pref("echo"), F.const(0.86), F.const(1)))
                .clamp(34, 108).round(1),
            "射线威力", {
                unit: "威力",
                description: "紫光追上目标那一下的基础威力；特攻越高幻影越沉，等级让幻影更实。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：12 + 特攻偏移[−1.5,4]，回响 ×0.92；夹 9..17。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(52).times(0.05).clamp(-1.5, 4))
                .times(F.when(F.pref("echo"), F.const(0.92), F.const(1)))
                .clamp(9, 17).round(2),
            "射程", {
                unit: "格",
                description: "紫光能追多远；特攻越高追得越远。它也是本招的实际射程来源。"
            }),
        /** 弹速：1.7 + 速度偏移[−0.25,0.55]，回响 ×0.85；夹 1.2..2.4。 */
        velocity: formula(
            F.base(1.7)
                .plus(F.stat("speed").minus(58).times(0.009).clamp(-0.25, 0.55))
                .times(F.when(F.pref("echo"), F.const(0.85), F.const(1)))
                .clamp(1.2, 2.4).round(2),
            "弹速", {
                unit: "格/刻",
                description: "紫光飞行的速度；速度快的个体窜得更急。回响状态下它更沉，飞得慢一点。"
            }),
        /** 转向：6 + 速度偏移[−1.6,5]，回响 +2.5；夹 3..15。 */
        turn: formula(
            F.base(6)
                .plus(F.stat("speed").minus(58).times(0.06).clamp(-1.6, 5))
                .plus(F.when(F.pref("echo"), F.const(2.5), F.const(0)))
                .clamp(3, 15).round(1),
            "转向", {
                unit: "度/刻",
                description: "紫光每刻能朝目标拐多少度；速度越快追得越死，回响状态更执着。转向慢的个体绕不过横移。"
            }),
        /** 判定半径：0.30 + 碰撞箱高度偏移[−0.04,0.16]，回响 ×0.94；夹 0.24..0.52。 */
        radius: formula(
            F.base(0.30)
                .plus(F.body("height").minus(1.4).times(0.06).clamp(-0.04, 0.16))
                .times(F.when(F.pref("echo"), F.const(0.94), F.const(1)))
                .clamp(0.24, 0.52).round(2),
            "判定半径", {
                unit: "格",
                description: "紫光飞行途中的判定粗细；体型越高光柱越粗。它也是画面上那团紫光的尺寸来源。"
            }),
        /** 恍惚概率：10% + 特攻偏移[−4%,12%] + 等级(≥22)偏移[0,6%]，回响 ×1.15；夹 8%..38%。 */
        confuseChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(52).times(0.0015).clamp(-0.04, 0.12))
                .plus(F.level().minus(22).times(0.0012).clamp(0, 0.06))
                .times(F.when(F.pref("echo"), F.const(1.15), F.const(1)))
                .clamp(0.08, 0.38).round(3),
            "恍惚概率", "命中后让目标陷入恍惚的概率；原生 10% 起，特攻与等级越高越容易咬住。"),
        /** 恍惚时长：140 + 特攻偏移[−20,60] + 等级(≥24)偏移[0,50] 刻，回响 ×1.2；夹 100..320。 */
        dazeTicks: seconds(
            F.base(140)
                .plus(F.stat("specialAttack").minus(52).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(24).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("echo"), F.const(1.2), F.const(1)))
                .clamp(100, 320).round(0),
            "恍惚时长", "被幻影缠住后陷入恍惚的时长；特攻越高、等级越高缠得越久，回响更长。"),
        /** 失手率：30% + 特攻偏移[−5%,10%]；夹 18%..48%。 */
        fumble: percent(
            F.base(0.30)
                .plus(F.stat("specialAttack").minus(52).times(0.0012).clamp(-0.05, 0.1))
                .clamp(0.18, 0.48).round(3),
            "恍惚失手率", "恍惚期间目标每次想出手被打散的概率；特攻越高的施法者幻影越乱。"),
        /** 幻光数：12 + 特攻偏移[0,22] + 等级(≥22)偏移[0,10]；夹 10..44。 */
        motes: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(52).times(0.16).clamp(0, 22))
                .plus(F.level().minus(22).times(0.3).clamp(0, 10))
                .clamp(10, 44).round(0),
            "幻光数", {
                unit: "点",
                description: "紫光上跳动的幻影点数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：10 − 速度偏移[−2.5,3]，回响 +3；夹 6..16。 */
        tempo: seconds(
            F.base(10)
                .minus(F.stat("speed").minus(58).times(0.035).clamp(-2.5, 3))
                .plus(F.when(F.pref("echo"), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "凝出幻影射线的时间；速度越快越短，回响要凝得更久。"),
        /** 收招：7 − 速度偏移[−1.5,2.5]；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(58).times(0.02).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "收招", "射线脱手后的收势；速度越快越利落。"),
        /** 冷却：22 − 速度偏移[−4,6]，回响 +6；夹 14..36。 */
        recharge: seconds(
            F.base(22)
                .minus(F.stat("speed").minus(58).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("echo"), F.const(6), F.const(0)))
                .clamp(14, 36).round(0),
            "冷却", "再次凝出幻影射线前的等待；回响状态等得更久。")
    });

    defineDamage(psybeamId, "ray", {});

    stages(psybeamId, [
        { level: 26, values: { ray: 66 } },
        { level: 42, values: { ray: 76, confuseChance: 0.20 } }
    ]);

    describe(psybeamId, [
        { key: "description.0", values: ["ray", "motes"] },
        { key: "description.1", values: ["confuseChance", "dazeTicks", "fumble"] },
        { key: "description.2", values: ["reach", "velocity", "turn"] },
        { key: "echo.on", values: [], when: function (context) { return read(context.detail.values, ["echo"]) === true; } },
        { key: "echo.off", values: [], when: function (context) { return read(context.detail.values, ["echo"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ray"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ray", "tier.1.confuseChance"] }
    ]);
}
