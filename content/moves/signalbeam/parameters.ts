/**
 * 信号光束 / signalbeam —— 参数与伤害段。
 *
 * 原生事实：Bug／特殊／威力 75／命中 100／PP 15／单体；10% 概率使目标混乱（Cobblemon 1.8 / Showdown，
 * 描述作 "a sinister beam of light"）。
 *
 * 翻译：把「一道信号光」落成一条**沿瞄准方向拉开的信号走廊**——施法者点亮身前的信号源，整条走廊一次照到
 * 路径上的每个敌人；被照到的人信号错乱。它是本族学习者最多的一员，也是唯一**一次点一走廊人**的远程招式；
 * 与幻象光线分开：幻象光线是一条会追的紫光只打一个，信号光束是一条不会拐弯的宽走廊。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   beam         光束威力：特攻定信号强度，等级让信号更烈。
 *   reach        走廊长度：特攻决定信号能铺多远。
 *   gauge        走廊半宽：体宽与身高决定光束多宽——身体越大，铺得越宽。
 *   confuseChance 错乱概率：原生 10% 起，特攻与等级提高，脉冲模式更高。
 *   dazeTicks    错乱时长：特攻与等级决定信号错乱多久。
 *   fumble       失手率：错乱期间每次想出手被打散的概率，存进载体振幅。
 *   motes        光点数：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `pulse`（脉冲）双向取舍：开启＝走廊更窄、单发 ×1.15、错乱概率 ×1.3，但射程 ×0.88，
 * 适合点名一个；关闭（连续）＝走廊更宽更长、可一次兜住更多人，代价是单发与错乱概率更基础。
 *
 * 错乱行为（本单元自己的变体）：目标每次想出手都可能被打散；此外，错乱期间它再挨任何招式命中，错乱的信号
 * 都会反冲一下——按自身特攻额外掉一点血。这是信号光束区别于幻象光线（被打散时续时长）的地方。
 *
 * 伤害段 `beam`：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const signalbeamId = "signalbeam";
    export const signalbeamScene = "world_combat:move_signalbeam";
    export const signalbeamEffect = "world_combat:signalbeam_jam";
    export const signalbeamDazeText = "world_combat.move.signalbeam.text.daze";
    export const signalbeamJoltText = "world_combat.move.signalbeam.text.jolt";
    export const signalbeamMissText = "world_combat.move.signalbeam.text.miss";

    actionParameters.define(signalbeamId, {
        /** 光束威力：62 + 特攻偏移[−12,30] + 等级(≥25)偏移[0,10]，脉冲 ×1.15；夹 36..116。 */
        beam: formula(
            F.base(62)
                .plus(F.stat("specialAttack").minus(54).times(0.28).clamp(-12, 30))
                .plus(F.level().minus(25).times(0.4).clamp(0, 10))
                .times(F.when(F.pref("pulse"), F.const(1.15), F.const(1)))
                .clamp(36, 116).round(1),
            "光束威力", {
                unit: "威力",
                description: "走廊里每个敌人各吃一次的基础威力；特攻越高信号越烈，脉冲模式单发更重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 走廊长度：12 + 特攻偏移[−1.5,4]，脉冲 ×0.88／连续 ×1.12；夹 8..18。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(54).times(0.05).clamp(-1.5, 4))
                .times(F.when(F.pref("pulse"), F.const(0.88), F.const(1.12)))
                .clamp(8, 18).round(2),
            "走廊长度", {
                unit: "格",
                description: "信号走廊能铺多远；特攻越高越远，连续模式更长。它也是本招的实际射程来源。"
            }),
        /** 走廊半宽：0.7 + 体宽偏移[−0.1,0.5] + 身高偏移[−0.05,0.3]，脉冲 ×0.62／连续 ×1.3；夹 0.45..2.2。 */
        gauge: formula(
            F.base(0.7)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.1, 0.5))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.05, 0.3))
                .times(F.when(F.pref("pulse"), F.const(0.62), F.const(1.3)))
                .clamp(0.45, 2.2).round(2),
            "走廊半宽", {
                unit: "格",
                description: "信号走廊的半宽（判定与画面同宽）；体宽和身高越大铺得越宽，连续模式更宽。它同时驱动画面里那条光带的宽度。"
            }),
        /** 错乱概率：10% + 特攻偏移[−4%,12%] + 等级(≥25)偏移[0,6%]，脉冲 ×1.3；夹 8%..42%。 */
        confuseChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(54).times(0.0014).clamp(-0.04, 0.12))
                .plus(F.level().minus(25).times(0.0012).clamp(0, 0.06))
                .times(F.when(F.pref("pulse"), F.const(1.3), F.const(1)))
                .clamp(0.08, 0.42).round(3),
            "错乱概率", "被信号照到后陷入错乱的概率；原生 10% 起，特攻与等级越高越容易，脉冲更高。"),
        /** 错乱时长：150 + 特攻偏移[−20,60] + 等级(≥26)偏移[0,50] 刻；夹 110..320。 */
        dazeTicks: seconds(
            F.base(150)
                .plus(F.stat("specialAttack").minus(54).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(26).times(1.2).clamp(0, 50))
                .clamp(110, 320).round(0),
            "错乱时长", "信号错乱持续多久；特攻越高、等级越高越久。"),
        /** 失手率：30% + 特攻偏移[−5%,10%]；夹 18%..48%。 */
        fumble: percent(
            F.base(0.30)
                .plus(F.stat("specialAttack").minus(54).times(0.0012).clamp(-0.05, 0.1))
                .clamp(0.18, 0.48).round(3),
            "错乱失手率", "错乱期间目标每次想出手被打散的概率；特攻越高的施法者干扰越强。"),
        /** 光点数：14 + 特攻偏移[0,22] + 等级(≥25)偏移[0,10]；夹 12..46。 */
        motes: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(54).times(0.16).clamp(0, 22))
                .plus(F.level().minus(25).times(0.3).clamp(0, 10))
                .clamp(12, 46).round(0),
            "光点数", {
                unit: "点",
                description: "信号光带上跳动的光点数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：11 − 速度偏移[−2.5,3]，脉冲 +2；夹 6..16。 */
        tempo: seconds(
            F.base(11)
                .minus(F.stat("speed").minus(58).times(0.035).clamp(-2.5, 3))
                .plus(F.when(F.pref("pulse"), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "点亮信号源、把光摊成一条走廊的时间；速度越快越短，脉冲多收一刻。"),
        /** 收招：8 − 速度偏移[−1.5,2.5]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(58).times(0.02).clamp(-1.5, 2.5)).clamp(5, 12).round(0),
            "收招", "拉出光带后的收势；速度越快越利落。"),
        /** 冷却：28 − 速度偏移[−5,8]，脉冲 +5；夹 18..44。 */
        recharge: seconds(
            F.base(28)
                .minus(F.stat("speed").minus(58).times(0.05).clamp(-5, 8))
                .plus(F.when(F.pref("pulse"), F.const(5), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "再次拉开信号走廊前的等待；脉冲模式蓄得更久。"),
        /** 单次最多点几个人：协议常量。 */
        maxTargets: hidden(4)
    });

    defineDamage(signalbeamId, "beam", {});

    stages(signalbeamId, [
        { level: 30, values: { beam: 70 } },
        { level: 46, values: { beam: 80, confuseChance: 0.20 } }
    ]);

    describe(signalbeamId, [
        { key: "description.0", values: ["beam", "gauge", "reach"] },
        { key: "description.1", values: ["confuseChance", "dazeTicks", "fumble"] },
        { key: "pulse.on", values: [], when: function (context) { return read(context.detail.values, ["pulse"]) === true; } },
        { key: "pulse.off", values: [], when: function (context) { return read(context.detail.values, ["pulse"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.beam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.beam", "tier.1.confuseChance"] }
    ]);
}
