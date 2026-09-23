/**
 * 神通力 / extrasensory —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 80／命中 100／PP 20／目标单体／10% 畏缩（Cobblemon 1.8，49 位直接学习者）。
 *   原生描述：「发出看不见的神奇力量进行攻击，有时会使对手畏缩。」
 *
 * 翻译：把「看不见的神奇力量」落成一记**落在选定地点、延迟合拢的预感打击**——施法者先「看见」力量该出现的地方，
 *   在那里留下一道极淡的幻影；片刻之后，看不见的力从四面收拢、把那一小块地上的敌人一齐攥住。
 *   因为力量本身不可见，对手只读得到那道将散未散的幻影：能在合拢前离开那块地就躲开了，站着不动就被攥住。
 *   原生的 10% 畏缩是猛然一攥的错神：被攥住的目标有较小概率一滞。
 *
 * 与同族分开：空气斩是一条看得见的直线月牙；回旋踢贴着自己转圈；尖刺臂是贴身挥击并留刺。
 *   神通力是唯一**看不见、延迟爆发、以地点为目标**的一击——它赌的是对手会站在哪里，而不是现在就站在哪里。
 * 与既有念力招分开（confusion／psybeam／futuresight）：那些是即时弹道或远未来；神通力只等一小段、落在自选的点上。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   crush       攥力：特攻定力有多紧，等级定这一攥的深度。
 *   radius      合拢半径：碰撞箱高度与特攻决定那一小块地多大（也是画面范围与指示圈）。
 *   reach       施放距离：特攻与等级决定力量出现在多远，也是实际射程。
 *   delay       伏笔时长：速度决定幻影撑多久（快则更短），伏击式会拉长。
 *   flinchChance 畏缩几率：原生 10% 起，特攻再抬一点。
 *   flinchTicks 畏缩持续。
 *   motes       力量丝量：特攻与等级换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；伏击式以更长的冷却换更大更重的一攥。
 *
 * 配置 `premonition`（伏击式）双向取舍：开＝延迟 +6 刻、半径 ×1.15、威力 ×1.08、冷却 +6，赌对手会停在预判的点上；
 *   关（即时式，默认）＝延迟更短、起手更快、冷却更短，但半径更小、威力略低，更依赖对手当下站着不动。
 *
 * 伤害段 `crush` 与参数同名，走共享换算（原生类别 Special，Psychic 属性，无接触）。
 */
namespace PokemonSkills {
    export const extrasensoryId = "extrasensory";
    export const extrasensoryScene = "world_combat:move_extrasensory";
    export const extrasensoryFlinchEffect = "world_combat:extrasensory_flinch";
    export const extrasensoryHitText = "world_combat.move.extrasensory.text.hit";
    export const extrasensoryMissText = "world_combat.move.extrasensory.text.miss";
    export const extrasensoryFlinchText = "world_combat.move.extrasensory.text.flinch";
    /** 表现里合拢半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const extrasensoryReference = 1.7;

    actionParameters.define(extrasensoryId, {
        /** 攥力：基础 80，特攻每比 60 多 1 加 0.32（夹 −14..44），等级每 1 级加 0.3（夹 0..12）；伏击 ×1.08；夹在 56..150。 */
        crush: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.32).clamp(-14, 44))
                .plus(F.level().minus(28).times(0.3).clamp(0, 12))
                .times(F.when(F.pref("premonition", text("worldcombat.skill.extrasensory.preference.premonition")), F.const(1.08), F.const(0.97)))
                .clamp(56, 150).round(1),
            "攥力", {
                unit: "威力",
                description: "看不见的力收拢那一下的威力；特攻决定攥得多紧，等级决定这一攥多深。对手特防、相性与暴击在命中时另算。"
            }),
        /** 合拢半径：基础 1.7 格，碰撞箱每比 1.4 高 1 格加 0.4，特攻每比 60 多 1 加 0.01（夹 0..0.7）；伏击 ×1.15；夹在 1.2..3.2。 */
        radius: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.15, 0.9))
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.7))
                .times(F.when(F.pref("premonition", text("worldcombat.skill.extrasensory.preference.premonition")), F.const(1.15), F.const(0.95)))
                .clamp(1.2, 3.2).round(2),
            "合拢半径", {
                unit: "格",
                description: "力量在选定点合拢的那一小块地有多大；个子高、特攻高的个体攥得更开，伏击式再放大。它也是画面范围与指示圈。"
            }),
        /** 施放距离：基础 10 格，特攻每比 60 多 1 加 0.04（夹 −1.5..3.5），等级每 1 级加 0.05（夹 0..2）；夹在 7..15。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3.5))
                .plus(F.level().minus(28).times(0.05).clamp(0, 2)).clamp(7, 15).round(1),
            "施放距离", {
                unit: "格",
                description: "力量能出现在多远的地方；特攻与等级决定它够得着哪片地，也是本招的实际射程。"
            }),
        /** 伏笔时长：基础 16 刻，速度每比 60 快 1 减 0.05（夹 −4..3）；伏击 +6；夹在 8..30。 */
        delay: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("premonition", text("worldcombat.skill.extrasensory.preference.premonition")), F.const(6), F.const(0)))
                .clamp(8, 30).round(0),
            "伏笔时长", "幻影在选定点停留多久才合拢；速度越快留得越短，伏击式拉得更长——留给对手走开的时间，也留给施法者预判落点。"),
        /** 畏缩几率：基础 0.10，特攻每比 60 多 1 加 0.001（夹 −0.02..0.08）；夹在 0.05..0.24。 */
        flinchChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.02, 0.08)).clamp(0.05, 0.24).round(3),
            "畏缩几率", "被猛然一攥的畏缩几率（原生 10%）；特攻越高越容易让对手错神。"),
        /** 畏缩持续：基础 10 刻；夹在 8..18 刻。 */
        flinchTicks: seconds(
            F.base(10).clamp(8, 18).round(0),
            "畏缩持续", "被攥懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 力量丝量：基础 22，特攻每比 60 多 1 加 0.22（夹 −6..18），等级每 1 级加 0.2（夹 0..6）；夹在 14..56。 */
        motes: formula(
            F.base(22).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-6, 18))
                .plus(F.level().minus(28).times(0.2).clamp(0, 6)).clamp(14, 56).round(0),
            "力量丝量", {
                unit: "缕",
                description: "合拢时卷起的看不见的力丝数量，也驱动表现密度；特攻与等级越高越密。"
            }),
        /** 起手：基础 9 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；即时式再 −2；夹在 5..14。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 2))
                .plus(F.when(F.pref("premonition", text("worldcombat.skill.extrasensory.preference.premonition")), F.const(2), F.const(-1)))
                .clamp(5, 14).round(0),
            "起手", "看见力量该落之处、留下幻影前的时间；速度越快越短，伏击式多看一会儿。"),
        /** 收招：基础 7 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；夹在 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "力量散去后的收势；速度越快越利落。"),
        /** 冷却：基础 25 刻，速度每比 60 快 1 减 0.04（夹 −4..6）；伏击 +6；夹在 17..40。 */
        recharge: seconds(
            F.base(25).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("premonition", text("worldcombat.skill.extrasensory.preference.premonition")), F.const(6), F.const(0))).clamp(17, 40).round(0),
            "冷却", "两次神通力之间的等待；伏击式缓得更久。")
    });

    defineDamage(extrasensoryId, "crush", { rationale: "看不见的念力挤压；与原生一致走特殊类别，不改变减伤规则。" }, {});

    stages(extrasensoryId, [
        { level: 42, values: { crush: 94, radius: 1.9 } }
    ]);

    describe(extrasensoryId, [
        { key: "description.0", values: ["crush", "radius"] },
        { key: "description.1", values: ["reach", "delay"] },
        { key: "description.2", values: ["flinchChance", "flinchTicks"] },
        { key: "description.3", values: ["pref.premonition"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush", "tier.0.radius"] }
    ]);
}
