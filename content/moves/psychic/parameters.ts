/**
 * 精神强念 / psychic —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 90／命中 100／PP 10／单体；10% 概率使目标特防下降 1 级
 *   （Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「强大的念力」落成一记**抓住并操纵**的重手——先在目标身上收拢一团紫靛的念力、把它按在原地，
 * 在短暂的操纵窗口里持续瞄准把念力锚点拖到初始目标周围，目标就被朝锚点带；松手前狠狠一挤。
 * 它是本组最重、最慢、最贵的一发，身份是「握」：抓住、定住、拖到一边、压特防。
 * 相对于念力（便宜快发的骚扰弹），精神强念是看得见的短控制重击。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   grip          擒压威力：特攻定念力压强，等级让挤压更深。
 *   squeeze       挤压威力：第二下的挤压，由特攻决定，慢而重。
 *   reach         射程：特攻决定念力能够到多远；缠握式更近。
 *   gripTicks     定身时长：等级决定按多久；缠握式按得更久。
 *   drag          操纵预算／锚点范围：特攻决定能拖多远；大个子的抵抗在运行时按目标体型折减（见 skill.ts）。
 *   sunderChance  特防下降概率：原生 10% 起，特攻与等级提高，缠握式更容易。
 *   sunderStages  特防下降级数：固定 1 级，与原生一致。
 *   squeezeDelay  操纵窗口：速度决定抓住后能引导多久，窗口结束才挤第二下。
 *   spirals       念力丝数：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `hold`（缠握）双向取舍：开启＝定身 ×1.5、挤压 ×1.25、操纵预算 ×1.2、特防下降 ×1.3，但擒压 ×0.94、
 * 射程 ×0.85、起手 +3、冷却 +6；关闭（点握）＝更远更快更重的一抓，代价是按得短、挤得轻、压特防更少见。
 *
 * 伤害段 `grip`（抓取那一下）与 `squeeze`（随后挤压那一下）走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const psychicId = "psychic";
    export const psychicScene = "world_combat:move_psychic";
    export const psychicGripText = "world_combat.move.psychic.text.grip";
    export const psychicSunderText = "world_combat.move.psychic.text.sunder";
    export const psychicSqueezeText = "world_combat.move.psychic.text.squeeze";

    actionParameters.define(psychicId, {
        /** 擒压威力：78 + 特攻偏移[−16,44] + 等级(≥30)偏移[0,12]，缠握 ×0.94；夹 52..150。 */
        grip: formula(
            F.base(78)
                .plus(F.stat("specialAttack").minus(60).times(0.36).clamp(-16, 44))
                .plus(F.level().minus(30).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("hold"), F.const(0.94), F.const(1)))
                .clamp(52, 150).round(1),
            "擒压威力", {
                unit: "威力",
                description: "念力抓住目标那一下的基础威力；特攻越高念力越沉，等级让挤压更深。对手特防、相性与暴击在命中时另算。"
            }),
        /** 挤压威力：30 + 特攻偏移[−8,22]，缠握 ×1.25；夹 16..64。 */
        squeeze: formula(
            F.base(30)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-8, 22))
                .times(F.when(F.pref("hold"), F.const(1.25), F.const(1)))
                .clamp(16, 64).round(1),
            "挤压威力", {
                unit: "威力",
                description: "抓稳后第二下的基础威力；特攻越高挤得越狠，缠握式明显更重。它让这一招的伤害分两段落地。"
            }),
        /** 射程：12 + 特攻偏移[−1.5,3.5]，缠握 ×0.85；夹 9..16。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3.5))
                .times(F.when(F.pref("hold"), F.const(0.85), F.const(1)))
                .clamp(9, 16).round(2),
            "射程", {
                unit: "格",
                description: "念力能够到多远；特攻越高越远，缠握式更近。它也是本招的实际射程来源。"
            }),
        /** 定身时长：50 + 等级(≥30)偏移[0,40] 刻，缠握 ×1.5；夹 40..140。 */
        gripTicks: seconds(
            F.base(50)
                .plus(F.level().minus(30).times(1.2).clamp(0, 40))
                .times(F.when(F.pref("hold"), F.const(1.5), F.const(1)))
                .clamp(40, 140).round(0),
            "定身时长", "目标被念力按在原地的时长；等级越高按得越久，缠握式按得更久。挤压要在它还被困住时才落下。"),
        /** 拖拽距离：1.1 + 特攻偏移[−0.2,0.9]，缠握 ×1.2；夹 0.6..2.6。 */
        drag: formula(
            F.base(1.1)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.2, 0.9))
                .times(F.when(F.pref("hold"), F.const(1.2), F.const(1)))
                .clamp(0.6, 2.6).round(2),
            "拖拽距离", {
                unit: "格",
                description: "抓住后念力锚点能移动到初始目标周围的范围，同时也是整场操纵里目标最多被推走的总距离；特攻越高拉得越远，缠握式更用力。体型越大的目标抵抗越强，运行时按它的身高折减。"
            }),
        /** 特防下降概率：10% + 特攻偏移[−4%,12%] + 等级偏移[0,5%]，缠握 ×1.3；夹 8%..36%。 */
        sunderChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.04, 0.12))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .times(F.when(F.pref("hold"), F.const(1.3), F.const(1)))
                .clamp(0.08, 0.36).round(3),
            "特防下降概率", "抓住的瞬间让目标特防下降 1 级的概率；原生 10% 起，特攻与等级越高越容易，缠握式更容易。"),
        /** 特防下降级数：固定 1 级。 */
        sunderStages: formula(
            F.base(1),
            "特防下降级数", {
                unit: "级",
                description: "一次碾念让目标特防下降的能力等级。"
            }),
        /** 挤压延迟：10 − 速度偏移[−2.5,3]，缠握 +3；夹 5..18。 */
        squeezeDelay: seconds(
            F.base(10)
                .minus(F.stat("speed").minus(60).times(0.04).clamp(-2.5, 3))
                .plus(F.when(F.pref("hold"), F.const(3), F.const(0)))
                .clamp(5, 18).round(0),
            "挤压延迟", "抓住后能持续操纵念力锚点的窗口时长；速度越快跟得越紧，窗口更短但挤压更快，缠握式多按一会儿再挤。"),
        /** 念力丝数：14 + 特攻偏移[0,22] + 等级(≥25)偏移[0,12]；夹 14..48。 */
        spirals: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.16).clamp(0, 22))
                .plus(F.level().minus(25).times(0.3).clamp(0, 12))
                .clamp(14, 48).round(0),
            "念力丝数", {
                unit: "束",
                description: "抓住时收拢的念力丝数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：14 − 速度偏移[−3,4]，缠握 +3；夹 8..20。 */
        tempo: seconds(
            F.base(14)
                .minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4))
                .plus(F.when(F.pref("hold"), F.const(3), F.const(0)))
                .clamp(8, 20).round(0),
            "起手", "把念力聚成一只握需要多久；速度越快越短，缠握式多蓄一会儿。"),
        /** 收招：9 − 速度偏移[−1.5,3]；夹 5..13。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3)).clamp(5, 13).round(0),
            "收招", "挤压结束后的收势；速度越快越利落。"),
        /** 冷却：40 − 速度偏移[−6,9]，缠握 +6；夹 26..60。 */
        recharge: seconds(
            F.base(40)
                .minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 9))
                .plus(F.when(F.pref("hold"), F.const(6), F.const(0)))
                .clamp(26, 60).round(0),
            "冷却", "两次聚念之间的等待；它是本组最贵的冷却，换来的是一记带控制的重击。")
    });

    defineDamage(psychicId, "grip", {});
    defineDamage(psychicId, "squeeze", {});

    stages(psychicId, [
        { level: 38, values: { grip: 100, reach: 13 } },
        { level: 52, values: { grip: 112, sunderChance: 0.20 } }
    ]);

    describe(psychicId, [
        { key: "description.0", values: ["grip","squeeze"] },
        { key: "description.1", values: ["gripTicks","drag","squeezeDelay"] },
        { key: "description.2", values: ["sunderChance","sunderStages"] },
        { key: "description.failure", values: [] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.grip", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.grip", "tier.1.sunderChance"] }
    ]);
}
