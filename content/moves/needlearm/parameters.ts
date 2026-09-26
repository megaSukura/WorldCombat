/**
 * 尖刺臂 / needlearm —— 参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 60／命中 100／PP 15／接触／30% 畏缩（Cobblemon 1.8；本招在原生说明里
 *   被列为 5 位学习者，Cobblemon 1.8 的物种学习表未收，故试玩用主题相符的草系宝可梦装备本招）。
 *   原生描述：「用带刺的手臂猛烈地挥舞进行攻击，有时会使对手畏缩。」
 *
 * 翻译：把「带刺的手臂猛烈挥舞」落成一记**贴身抡臂横扫**——施法者先短扑上一步，随后带刺的手臂从右到左
 *   抡过一大片扇形，按转过的扇面分三拍扫；每一拍扫到的人挨一记接触伤害、有概率一滞，但一个敌人在整套挥臂里
 *   只受一次主伤。手臂收势，危险就结束，地上不留任何东西。
 *
 * 与同族分开：空气斩是一条看得见的直线月牙；神通力看不见、在一点上延迟合拢；回旋踢把目标抛飞。
 *   尖刺臂是唯一**贴身短扑后、挥一大片从右到左扇面**的那记，玩家凭「贴身一大圈横扫」把它认出来。
 * 与既有草系近战分开（vinewhip／woodhammer／powerwhip）：藤鞭抽一记不落地、木槌裂地并反震自己、
 *   强力鞭打是长距离重抽；尖刺臂是短距离、大张角的多段横扫。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   rake        挥击威力：物攻定臂劲，等级定这一挥的深度。
 *   span        挥扫半径：身高与物攻决定这一臂能够到多远（也是本招实际射程）。
 *   lunge       扑上距离：身高与速度决定先扑上几步再抡。
 *   swing       扑出速度：速度决定扑上那一步多急。
 *   arc         扇面张角：速度决定转身抡过多少度（宽张角更容易扫到绕行的敌人）。
 *   flinchChance 畏缩几率：原生 30% 起，物攻再抬一档。
 *   flinchTicks 畏缩持续。
 *   thorns      尖刺量：物攻与等级换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；横扫式以挥击更轻、出手更慢换更宽的扇面与更远的挥扫。
 *
 * 配置 `broad`（横扫式）双向取舍：开＝张角 ×1.28、挥扫半径 ×1.08，但挥击 ×0.90、起手 +2、冷却 +5，
 *   适合被多敌贴身、有人绕后时一次扫开；关（重挥式，默认）＝挥击 ×1.12、起手更快、冷却更短，但扇面更窄。
 *   扫一片 vs 抡一记重的，两向各有局面。
 *
 * 伤害段 `rake` 与参数同名，走共享换算（原生类别 Physical，Grass 属性，带 contact 标记）。
 */
namespace PokemonSkills {
    export const needlearmId = "needlearm";
    export const needlearmScene = "world_combat:move_needlearm";
    export const needlearmFlinchEffect = "world_combat:needlearm_flinch";
    export const needlearmHitText = "world_combat.move.needlearm.text.hit";
    export const needlearmMissText = "world_combat.move.needlearm.text.miss";
    export const needlearmFlinchText = "world_combat.move.needlearm.text.flinch";
    /** 挥臂分几拍扫过扇面。 */
    export const needlearmBeats = 3;
    /** 表现里挥扫半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const needlearmReference = 2.4;

    actionParameters.define(needlearmId, {
        /** 挥击威力：基础 60，物攻每比 60 多 1 加 0.30（夹 −12..40），等级每 1 级加 0.25（夹 0..10）；
         *  横扫式 ×0.90 / 重挥式 ×1.12；夹在 40..120。 */
        rake: formula(
            F.base(60).plus(F.stat("attack").minus(60).times(0.30).clamp(-12, 40))
                .plus(F.level().minus(28).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("broad", text("worldcombat.skill.needlearm.preference.broad")), F.const(0.90), F.const(1.12)))
                .clamp(40, 120).round(1),
            "挥击威力", {
                unit: "威力",
                description: "带刺手臂扫中目标这一下的基础威力；物攻给臂劲，等级决定挥得多深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 挥扫半径：基础 2.4 格，碰撞箱每比 1.4 高 1 格加 0.4（夹 −0.2..0.9），物攻每比 60 多 1 加 0.004（夹 −0.1..0.3）；
         *  横扫式 ×1.08；夹在 2.0..3.8。它也是本招实际射程。 */
        span: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.9))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.3))
                .times(F.when(F.pref("broad", text("worldcombat.skill.needlearm.preference.broad")), F.const(1.08), F.const(1)))
                .clamp(2.0, 3.8).round(2),
            "挥扫半径", {
                unit: "格",
                description: "带刺手臂抡过的那片扇形有多远；个子高、臂劲大的个体够得更远。它也是本招的实际射程。"
            }),
        /** 扑上距离：基础 1.0 格，碰撞箱每比 1.4 高 1 格加 0.25（夹 −0.1..0.5），速度每比 60 快 1 加 0.004（夹 −0.1..0.2）；
         *  夹在 0.7..1.8。 */
        lunge: formula(
            F.base(1.0).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.5))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.2)).clamp(0.7, 1.8).round(2),
            "扑上距离", {
                unit: "格",
                description: "挥臂前先扑上几步再抡；个子高、速度快的个体压得更近。"
            }),
        /** 扑出速度：基础 0.75 格/刻，速度每比 60 快 1 加 0.006（夹 −0.15..0.35）；夹在 0.5..1.15。 */
        swing: formula(
            F.base(0.75).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.35)).clamp(0.5, 1.15).round(2),
            "扑出速度", {
                unit: "格/刻",
                description: "扑上那一步每刻前进多少；速度越快扑得越急，留给对手走位的时间越短。"
            }),
        /** 扇面张角：基础 150 度，速度每比 60 快 1 加 0.25（夹 −20..30）；横扫式 ×1.28；夹在 90..260。 */
        arc: formula(
            F.base(150).plus(F.stat("speed").minus(60).times(0.25).clamp(-20, 30))
                .times(F.when(F.pref("broad", text("worldcombat.skill.needlearm.preference.broad")), F.const(1.28), F.const(1)))
                .clamp(90, 260).round(0),
            "扇面张角", {
                unit: "度",
                description: "手臂从右到左抡过多大一片扇形；转得越快扫得越开，贴着施法者绕行的敌人也更容易被扫到。"
            }),
        /** 畏缩几率：基础 0.30，物攻每比 60 多 1 加 0.0012（夹 −0.05..0.12）；夹在 0.16..0.46。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.16, 0.46).round(3),
            "畏缩几率", "被挥中的畏缩几率（原生 30%）；臂劲越大越容易把人打懵。"),
        /** 畏缩持续：基础 12 刻；夹在 8..20 刻。 */
        flinchTicks: seconds(
            F.base(12).clamp(8, 20).round(0),
            "畏缩持续", "被挥懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 尖刺量：基础 22，物攻每比 60 多 1 加 0.18（夹 −5..16），等级每 1 级加 0.2（夹 0..6）；夹在 14..56。 */
        thorns: formula(
            F.base(22).plus(F.stat("attack").minus(60).times(0.18).clamp(-5, 16))
                .plus(F.level().minus(28).times(0.2).clamp(0, 6)).clamp(14, 56).round(0),
            "尖刺量", {
                unit: "根",
                description: "挥臂时甩出的尖刺数量，也驱动表现密度；物攻与等级越高越密。"
            }),
        /** 起手：基础 6 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；横扫式 +2；夹在 4..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 2))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.needlearm.preference.broad")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "压低身子、把刺拢到臂上的时间；速度越快越短，横扫式多蓄一会儿。"),
        /** 收招：基础 7 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；夹在 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "抡完收臂的收势；速度越快越利落。"),
        /** 冷却：基础 20 刻，速度每比 60 快 1 减 0.04（夹 −4..6）；横扫式 +5；夹在 13..36。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.needlearm.preference.broad")), F.const(5), F.const(0))).clamp(13, 36).round(0),
            "冷却", "两次尖刺臂之间的等待；横扫式缓得稍久。"),
        minimumMove: hidden(0.04)
    });

    defineDamage(needlearmId, "rake", { rationale: "带刺手臂的接触横扫；与原生一致走物理类别。" }, { contact: true });

    stages(needlearmId, [
        { level: 32, values: { rake: 70, span: 2.6 } }
    ]);

    describe(needlearmId, [
        { key: "description.0", values: ["rake","span"] },
        { key: "description.1", values: ["arc","lunge","swing"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "description.3", values: ["pref.broad"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rake", "tier.0.span"] }
    ]);
}
