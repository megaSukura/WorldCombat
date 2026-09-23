/**
 * 尖刺臂 / needlearm —— 参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 60／命中 100／PP 15／接触／30% 畏缩（Cobblemon 1.8；本招在原生说明里
 *   被列为 5 位学习者，Cobblemon 1.8 的物种学习表未收，故试玩用主题相符的草系宝可梦装备本招）。
 *   原生描述：「用带刺的手臂猛烈地挥舞进行攻击，有时会使对手畏缩。」
 *
 * 翻译：把「带刺的手臂猛烈挥舞」落成一记**抡臂猛挥、把尖刺甩进地面的挥击**——施法者压低身子扑上一步，
 *   带刺的手臂自外向内横扫目标；被扫中的人挨一记接触伤害、有概率一滞，而那些甩出去的尖刺会插进周围的地面，
 *   留下一小片荆棘地：谁站在里面会被反复扎刺、脚步也被绊慢。
 *   它是本组唯一**在场上留下东西**的一招：打完之后，那块荆棘地还在替它继续施压。
 *
 * 与同族分开：空气斩是一条看得见的直线月牙；神通力看不见、延迟合拢；回旋踢把目标抛飞。
 *   尖刺臂是唯一**贴身挥击并在原地留下荆棘地**的那记，玩家凭「打过的地上多出一片刺」把它认出来。
 * 与既有草系近战分开（vinewhip／woodhammer／powerwhip）：藤鞭抽一记不落地、木槌裂地并反震自己、
 *   强力鞭打是长距离重抽；尖刺臂是短距离挥扫并留下会持续扎人的荆棘。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   rake        挥击威力：物攻定臂劲，等级定这一挥的深度。
 *   reach       扑击距离：身高与速度决定这一臂能够到多远（驱动实际射程）。
 *   swing       扑出速度：速度决定扑上那一步多急。
 *   grip        刺臂判定：碰撞箱高度决定横扫的横向判定半径。
 *   flinchChance 畏缩几率：原生 30% 起，物攻再抬一档。
 *   flinchTicks 畏缩持续。
 *   briarRadius 荆棘半径：身高与物攻决定甩出的刺铺多大一圈。
 *   briarTicks  荆棘存在时长：等级决定那片刺在地里留多久。
 *   briarPower  扎刺威力：物攻决定每根刺扎得多深。
 *   briarInterval 扎刺间隔：速度决定被扎得多频繁。
 *   thorns      尖刺量：物攻与等级换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；荆棘式以挥击更轻、出手更慢换更大更久更疼的荆棘地。
 *
 * 配置 `briar`（荆棘式）双向取舍：开＝荆棘半径 ×1.2、存在 ×1.3、扎刺 ×1.15，但挥击 ×0.9、起手 +2、冷却 +5，
 *   适合封锁地面、拖住对手；关（挥击式，默认）＝挥击 ×1.12、起手更快、冷却更短，但只留一小片刺。封锁 vs 输出，两向各有局面。
 *
 * 伤害段：`rake`（挥击，Ground/接触）与 `briar`（荆棘扎刺，无接触）两段，均走共享换算。
 */
namespace PokemonSkills {
    export const needlearmId = "needlearm";
    export const needlearmScene = "world_combat:move_needlearm";
    export const needlearmRule = "world_combat:move_needlearm/bramble";
    export const needlearmFlinchEffect = "world_combat:needlearm_flinch";
    export const needlearmHitText = "world_combat.move.needlearm.text.hit";
    export const needlearmMissText = "world_combat.move.needlearm.text.miss";
    export const needlearmFlinchText = "world_combat.move.needlearm.text.flinch";
    export const needlearmBriarText = "world_combat.move.needlearm.text.briar";
    export const needlearmPrickText = "world_combat.move.needlearm.text.prick";
    /** 表现里荆棘半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const needlearmReference = 1.6;

    actionParameters.define(needlearmId, {
        /** 挥击威力：基础 60，物攻每比 60 多 1 加 0.30（夹 −12..40），等级每 1 级加 0.25（夹 0..10）；
         *  荆棘式 ×0.9 / 挥击式 ×1.12；夹在 40..120。 */
        rake: formula(
            F.base(60).plus(F.stat("attack").minus(60).times(0.30).clamp(-12, 40))
                .plus(F.level().minus(28).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("briar", text("worldcombat.skill.needlearm.preference.briar")), F.const(0.9), F.const(1.12)))
                .clamp(40, 120).round(1),
            "挥击威力", {
                unit: "威力",
                description: "带刺手臂横扫目标这一下的基础威力；物攻给臂劲，等级决定挥得多深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑击距离：基础 2.6 格，碰撞箱每比 1.4 高 1 格加 0.45，速度每比 60 快 1 加 0.008（夹 −0.15..0.35）；
         *  夹在 2.2..3.8。它也是本招实际射程。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.2, 1.0))
                .plus(F.stat("speed").minus(60).times(0.008).clamp(-0.2, 0.5)).clamp(2.2, 3.8).round(2),
            "扑击距离", {
                unit: "格",
                description: "从扑上到挥中的距离；个子高、速度快的个体够得更远。它也是本招的实际射程。"
            }),
        /** 扑出速度：基础 0.75 格/刻，速度每比 60 快 1 加 0.006（夹 −0.15..0.35）；夹在 0.5..1.15。 */
        swing: formula(
            F.base(0.75).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.35)).clamp(0.5, 1.15).round(2),
            "扑出速度", {
                unit: "格/刻",
                description: "扑上那一步每刻前进多少；速度越快扑得越急，留给对手走位的时间越短。"
            }),
        /** 刺臂判定：基础 0.42 格，碰撞箱每比 1.4 高 1 格加 0.13（夹 −0.06..0.26）；夹在 0.3..0.72。 */
        grip: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.13).clamp(-0.06, 0.26)).clamp(0.3, 0.72).round(2),
            "刺臂判定", {
                unit: "格",
                description: "带刺手臂横扫的横向判定半径；手臂越长越宽，越不容易被侧身让开。"
            }),
        /** 畏缩几率：基础 0.30，物攻每比 60 多 1 加 0.0012（夹 −0.05..0.12）；夹在 0.16..0.46。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.16, 0.46).round(3),
            "畏缩几率", "被挥中的畏缩几率（原生 30%）；臂劲越大越容易把人打懵。"),
        /** 畏缩持续：基础 12 刻；夹在 8..20 刻。 */
        flinchTicks: seconds(
            F.base(12).clamp(8, 20).round(0),
            "畏缩持续", "被挥懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 荆棘半径：基础 1.6 格，碰撞箱每比 1.4 高 1 格加 0.35，物攻每比 60 多 1 加 0.006（夹 −0.1..0.4）；
         *  荆棘式 ×1.2；夹在 1.2..3.0。它也是画面范围。 */
        briarRadius: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.15, 0.8))
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.4))
                .times(F.when(F.pref("briar", text("worldcombat.skill.needlearm.preference.briar")), F.const(1.2), F.const(0.88)))
                .clamp(1.2, 3.0).round(2),
            "荆棘半径", {
                unit: "格",
                description: "甩出去的尖刺铺成多大一圈；个子高、物攻高的个体铺得更开，荆棘式再放大。它也是画面上的荆棘范围。"
            }),
        /** 荆棘时长：基础 140 刻，等级每 1 级加 2.5 刻（夹 0..70）；荆棘式 ×1.3；夹在 90..260。 */
        briarTicks: seconds(
            F.base(140).plus(F.level().minus(28).times(2.5).clamp(0, 70))
                .times(F.when(F.pref("briar", text("worldcombat.skill.needlearm.preference.briar")), F.const(1.3), F.const(0.9)))
                .clamp(90, 260).round(0),
            "荆棘时长", "那片荆棘插在地里留多久；等级越高、荆棘式越久，对手越得绕开这块地。"),
        /** 扎刺威力：基础 14，物攻每比 60 多 1 加 0.1（夹 −3..8）；荆棘式 ×1.15；夹在 10..30。 */
        briarPower: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.1).clamp(-3, 8))
                .times(F.when(F.pref("briar", text("worldcombat.skill.needlearm.preference.briar")), F.const(1.15), F.const(1)))
                .clamp(10, 30).round(1),
            "扎刺威力", {
                unit: "威力",
                description: "站在荆棘里每次被扎的伤害；物攻越高刺越深，荆棘式更疼。"
            }),
        /** 扎刺间隔：基础 24 刻，速度每比 60 快 1 减 0.1（夹 −4..5）；夹在 14..40。 */
        briarInterval: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.1).clamp(-5, 6)).clamp(14, 40).round(0),
            "扎刺间隔", "同一个目标在荆棘里每隔多久被扎一次；与施法者速度无关地由这片刺本身决定。"),
        /** 尖刺量：基础 22，物攻每比 60 多 1 加 0.18（夹 −5..16），等级每 1 级加 0.2（夹 0..6）；夹在 14..56。 */
        thorns: formula(
            F.base(22).plus(F.stat("attack").minus(60).times(0.18).clamp(-5, 16))
                .plus(F.level().minus(28).times(0.2).clamp(0, 6)).clamp(14, 56).round(0),
            "尖刺量", {
                unit: "根",
                description: "甩出去插进地里的尖刺数量，也驱动表现密度；物攻与等级越高越密。"
            }),
        /** 起手：基础 6 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；荆棘 +2；夹在 4..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 2))
                .plus(F.when(F.pref("briar", text("worldcombat.skill.needlearm.preference.briar")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "压低身子、把刺拢到臂上的时间；速度越快越短，荆棘式多蓄一会儿。"),
        /** 收招：基础 7 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；夹在 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "挥完收臂的收势；速度越快越利落。"),
        /** 冷却：基础 20 刻，速度每比 60 快 1 减 0.04（夹 −4..6）；荆棘 +5；夹在 13..36。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("briar", text("worldcombat.skill.needlearm.preference.briar")), F.const(5), F.const(0))).clamp(13, 36).round(0),
            "冷却", "两次尖刺臂之间的等待；荆棘式缓得稍久。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    defineDamage(needlearmId, "rake", { rationale: "带刺手臂的接触挥击；与原生一致走物理类别。" }, { contact: true });
    defineDamage(needlearmId, "briar", { rationale: "荆棘扎刺的小额伤害；不是挥击本身，走同一套结算。" }, {});

    stages(needlearmId, [
        { level: 32, values: { rake: 70, briarTicks: 160 } }
    ]);

    describe(needlearmId, [
        { key: "description.0", values: ["rake","grip"] },
        { key: "description.1", values: ["reach","swing"] },
        { key: "description.2", values: ["flinchChance","flinchTicks","briarRadius","briarTicks"] },
        { key: "description.3", values: ["briarPower","briarInterval"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rake", "tier.0.briarTicks"] }
    ]);
}
