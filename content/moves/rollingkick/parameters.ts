/**
 * 回旋踢 / rollingkick —— 参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 60／命中 85／PP 15／接触／30% 畏缩（Cobblemon 1.8，8 位直接学习者）。
 *   原生描述：「一边使身体快速旋转，一边踢飞对手进行攻击，有时会使对手畏缩。」
 *
 * 翻译：把「旋转着踢飞对手」落成一记**急旋蓄势、再一腿把目标抛飞的一击**——施法者先原地急旋一圈聚起惯性，
 *   随后扑出半步、抡起回旋腿正中目标，把它沿踢击方向**抛到半空飞出去**；那一脚的震荡有概率让对手一滞。
 * 原生的 85% 命中落成「方向在提交那一刻锁死」：起旋的时间里目标移开原本的位置，这一腿就扫空。
 *
 * 与同族分开：空气斩是一条看得见的直线月牙；神通力看不见、延迟合拢；尖刺臂是贴身挥击并在地上留刺。
 *   回旋踢是唯一**把目标抛飞、改变它落点**的那记。
 * 与既有踢招/横扫招分开（triplekick／megakick／brutalswing）：三连踢对同一目标分三段、不抛飞；
 *   飞踢是直线突进；狂舞挥打是原地转一整圈扫全体、只把人朝外推一点；回旋踢只打一个目标，却把它抛得最高最远。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   kick        踢力：物攻定腿劲，速度定旋转的冲劲。
 *   reach       扑击距离：身高与速度决定这一腿能够到多远（驱动实际射程）。
 *   lunge       扑出速度：速度决定扑出那半步多急。
 *   launchAway  抛飞距离：物攻与自身体重决定把目标踢出多远；不是单纯的击退，是抛飞。
 *   launchUp    抛飞高度：把目标抬离地面的分量（抛飞式更高）。
 *   flinchChance 畏缩几率：原生 30% 起，速度再抬一档。
 *   flinchTicks 畏缩持续。
 *   sparks      火星量：速度与物攻换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定起旋与收招；抛飞式多转一会儿、冷却更久。
 *
 * 配置 `liftoff`（抛飞式）双向取舍：开＝抛飞距离 ×1.25、抛飞高度 +0.35、起旋 +2、冷却 +4，把目标扔得更远更高；
 *   关（盘踢式，默认）＝踢力 ×1.10、起手更快、冷却更短，但抛得近、弧线平。抛远拉开 vs 打重留在原地，两向各有局面。
 *
 * 伤害段 `kick` 与参数同名，走共享换算（原生类别 Physical，Fighting 属性，带 contact 标记）。
 */
namespace PokemonSkills {
    export const rollingkickId = "rollingkick";
    export const rollingkickScene = "world_combat:move_rollingkick";
    export const rollingkickFlinchEffect = "world_combat:rollingkick_flinch";
    export const rollingkickHitText = "world_combat.move.rollingkick.text.hit";
    export const rollingkickMissText = "world_combat.move.rollingkick.text.miss";
    export const rollingkickFlinchText = "world_combat.move.rollingkick.text.flinch";
    export const rollingkickLaunchText = "world_combat.move.rollingkick.text.launch";
    /** 表现里扑击半径的参考值（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const rollingkickReference = 2.4;

    actionParameters.define(rollingkickId, {
        /** 踢力：基础 60，物攻每比 60 多 1 加 0.30（夹 −12..40），速度每比 60 快 1 加 0.10（夹 −4..12）；
         *  抛飞 ×0.92 / 盘踢 ×1.10；夹在 40..120。 */
        kick: formula(
            F.base(60).plus(F.stat("attack").minus(60).times(0.30).clamp(-12, 40))
                .plus(F.stat("speed").minus(60).times(0.10).clamp(-4, 12))
                .times(F.when(F.pref("liftoff", text("worldcombat.skill.rollingkick.preference.liftoff")), F.const(0.92), F.const(1.10)))
                .clamp(40, 120).round(1),
            "踢力", {
                unit: "威力",
                description: "回旋腿正中目标那一下的基础威力；物攻给腿劲，速度让旋转更冲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑击距离：基础 2.8 格，碰撞箱每比 1.4 高 1 格加 0.45，速度每比 60 快 1 加 0.01（夹 −0.15..0.4）；
         *  夹在 2.2..4.0。它也是本招实际射程。 */
        reach: formula(
            F.base(2.8).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.2, 1.0))
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5)).clamp(2.2, 4.0).round(2),
            "扑击距离", {
                unit: "格",
                description: "从扑出到踢到目标的距离；个子高、速度快的个体够得更远。它也是本招的实际射程。"
            }),
        /** 踢击判定：基础 0.42 格，碰撞箱每比 1.4 高 1 格加 0.12（夹 −0.05..0.24）；夹在 0.3..0.7。 */
        foot: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.24)).clamp(0.3, 0.7).round(2),
            "踢击判定", {
                unit: "格",
                description: "回旋腿扫过的横向判定半径；腿越长、个子越高大，越不容易被侧身让开。"
            }),
        /** 扑出速度：基础 0.70 格/刻，速度每比 60 快 1 加 0.006（夹 −0.15..0.35）；夹在 0.5..1.1。 */        lunge: formula(
            F.base(0.70).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.35)).clamp(0.5, 1.1).round(2),
            "扑出速度", {
                unit: "格/刻",
                description: "扑出那半步每刻前进多少；速度越快扑得越急，留给对手走位的时间越短。"
            }),
        /** 抛飞距离：基础 1.0 格，物攻每比 60 多 1 加 0.006（夹 −0.2..0.9），自身体重每比 300hg 多 1hg 加 0.002（夹 −0.1..0.6）；
         *  抛飞 ×1.25 / 盘踢 ×0.85；夹在 0.6..2.8。 */
        launchAway: formula(
            F.base(1.0).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.2, 0.9))
                .plus(F.body("weight").minus(300).times(0.002).clamp(-0.1, 0.6))
                .times(F.when(F.pref("liftoff", text("worldcombat.skill.rollingkick.preference.liftoff")), F.const(1.25), F.const(0.85)))
                .clamp(0.6, 2.8).round(2),
            "抛飞距离", {
                unit: "格",
                description: "被踢中的人沿踢击方向飞出多远；物攻与自身体重决定这一腿能抛多开。抛飞式扔得最远，也用它把人从队友身边踢出去。"
            }),
        /** 抛飞高度：基础 0.28，抛飞 +0.35；夹在 0.15..0.9。 */
        launchUp: formula(
            F.base(0.28).plus(F.when(F.pref("liftoff", text("worldcombat.skill.rollingkick.preference.liftoff")), F.const(0.35), F.const(0)))
                .clamp(0.15, 0.9).round(2),
            "抛飞高度", {
                unit: "格",
                description: "被踢中的人抬离地面多高；它让这一腿是「踢飞」而不是单纯的击退。"
            }),
        /** 畏缩几率：基础 0.30，速度每比 60 快 1 加 0.0012（夹 −0.05..0.12）；夹在 0.16..0.46。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("speed").minus(60).times(0.0012).clamp(-0.05, 0.12)).clamp(0.16, 0.46).round(3),
            "畏缩几率", "被这一腿踢中的畏缩几率（原生 30%）；转得越快越容易把人踢懵。"),
        /** 畏缩持续：基础 12 刻；夹在 8..20 刻。 */
        flinchTicks: seconds(
            F.base(12).clamp(8, 20).round(0),
            "畏缩持续", "被踢懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 火星量：基础 20，速度每比 60 快 1 加 0.15（夹 −5..14），物攻每比 60 多 1 加 0.12（夹 −4..12）；夹在 12..56。 */
        sparks: formula(
            F.base(20).plus(F.stat("speed").minus(60).times(0.15).clamp(-5, 14))
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 12)).clamp(12, 56).round(0),
            "火星量", {
                unit: "点",
                description: "起旋与踢出时卷起的火星数量，也驱动表现密度；速度与物攻越高越密。"
            }),
        /** 起旋（起手）：基础 9 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；抛飞 +2；夹在 5..15。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 2))
                .plus(F.when(F.pref("liftoff", text("worldcombat.skill.rollingkick.preference.liftoff")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "起旋", "原地转起来、聚够惯性再扑出去的时间；速度越快转得越短，抛飞式多转一会儿。它也是对手走开的窗口。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.02（夹 −2..3）；夹在 4..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "踢完落回站姿、稳住的收势；速度越快越利落。"),
        /** 冷却：基础 22 刻，速度每比 60 快 1 减 0.04（夹 −4..6）；抛飞 +4；夹在 14..38。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("liftoff", text("worldcombat.skill.rollingkick.preference.liftoff")), F.const(4), F.const(0))).clamp(14, 38).round(0),
            "冷却", "两次回旋踢之间的等待；抛飞式缓得稍久。"),
        traceAhead: hidden(1.0),
        minimumMove: hidden(0.04)
    });

    defineDamage(rollingkickId, "kick", { rationale: "回旋腿的接触踢击；与原生一致走物理类别。" }, { contact: true });

    stages(rollingkickId, [
        { level: 30, values: { kick: 70, launchAway: 1.3 } }
    ]);

    describe(rollingkickId, [
        { key: "description.0", values: ["kick","launchAway"] },
        { key: "description.1", values: ["reach","lunge"] },
        { key: "description.2", values: ["launchUp","flinchChance","flinchTicks"] },
        { key: "description.3", values: ["pref.liftoff"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick", "tier.0.launchAway"] }
    ]);
}
