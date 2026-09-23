/**
 * 攻击指令 / attackorder —— 参数与伤害段。
 *
 * 原生事实：Bug／物理／威力 90／命中 100／PP 15／不接触／critRatio 2（Cobblemon 1.8，仅蜂女王 1 位学习者）。
 * 原生描述：「召唤手下，让其朝对手发起攻击，容易击中要害」。
 *
 * 翻译：把「召唤手下去打」落成**一队会飞的手下从施法者身边依次扑向目标、每只落一记小刺**：手下的数量、飞行快慢
 *   和每只的轻重都是参数，被中途打掉的手下就不再落这一下——原生的「容易击中要害」在这里变成「每次小刺各自掷一次
 *   会心，手下越多越容易撞上要害」。它是回复指令的同胞：同一群手下，一个把治疗带回来，一个扑上去。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   sting            每只手下威力：物攻定刺劲，等级定调度。
 *   underlings       手下面数：等级与「虫海」档位决定放出几只，驱动画面里的数量与命中次数。
 *   reach            指挥距离：身高与速度决定能把手下派到多远；也是实际射程。
 *   flight           飞行速度：速度决定手下扑得有多快（越慢留给对手越多清场时间）。
 *   stagger          放出间隔：速度决定手下是一只只出去还是几乎同时出去。
 *   underlingHealth  手下生命：档位决定单只多耐打（被清掉的手下不再落刺）。
 *   ttl              手下存活：射程决定它们最多飞多久。
 *   tempo／aftercast／recharge 时序：速度决定起手、收招与冷却；虫海档位更缓。
 *
 * 配置 swarm（虫海）：开启＝手下面数 +2、飞行速度 ×1，但每只威力 ×0.8、单只生命降到 3（更多次小刺、更容易撞上
 *   会心，也更容易被一口气清光）；关闭＝精锐手下，每只威力 ×1.25、飞行 ×1.15、单只生命 7，代价是面数更少。
 *
 * 伤害段 sting：每只手下扑到目标身上刺的那一下（不接触）；每只独立结算，因此各自掷一次会心。
 */
namespace PokemonSkills {
    export const attackorderId = "attackorder";
    export const attackorderScene = "world_combat:move_attackorder";
    export const attackorderUnderling = "world_combat:move/attackorder/underling";
    export const attackorderCallText = "world_combat.move.attackorder.text.call";

    actionParameters.define(attackorderId, {
        /** 每只手下威力：基础 20，物攻每比 60 多 1 加 0.08（夹 -4..12），等级每比 30 高 1 加 0.08（夹 -3..8）；虫海 ×0.8 / 精锐 ×1.25；夹在 10..46。 */
        sting: formula(
            F.base(20).plus(F.stat("attack").minus(60).times(0.08).clamp(-4, 12))
                .plus(F.level().minus(30).times(0.08).clamp(-3, 8))
                .times(F.when(F.pref("swarm"), F.const(0.8), F.const(1.25)))
                .clamp(10, 46).round(1),
            "每只手下威力", {
                unit: "威力",
                description: "每只手下扑到目标身上刺一下的威力；物攻定刺劲、等级定调度，精锐手下单只更重。每只独立结算，各自掷一次会心。"
            }),
        /** 手下面数：基础 3，等级每比 20 高 1 加 0.05（夹 0..3），虫海 +2；夹在 2..8 并向下取整。 */
        underlings: formula(
            F.base(3).plus(F.level().minus(20).times(0.05).clamp(0, 3))
                .plus(F.when(F.pref("swarm"), F.const(2), F.const(0))).clamp(2, 8).floor(),
            "手下面数", {
                unit: "只",
                description: "召唤出的手下数量；等级越高越多，虫海档位再加两只。手下越多，画面里的小刺越密、命中次数越多。"
            }),
        /** 指挥距离：基础 5.5 格，身高每比 1.4 高 1 加 0.4（夹 -0.3..0.8），速度每比 55 快 1 加 0.01（夹 -0.2..0.4）；夹在 4.5..7.5。 */
        reach: formula(
            F.base(5.5).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.3, 0.8))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.2, 0.4))
                .clamp(4.5, 7.5).round(2),
            "指挥距离", {
                unit: "格",
                description: "手下能被派到多远；身高的个体指挥半径更大。它也是本招的实际射程来源。"
            }),
        /** 飞行速度：基础 0.42 格／刻，速度每比 55 快 1 加 0.002；精锐 ×1.15；夹在 0.3..0.6。 */
        flight: formula(
            F.base(0.42).plus(F.stat("speed").minus(55).times(0.002)).clamp(0.3, 0.6)
                .times(F.when(F.pref("swarm"), F.const(1), F.const(1.15))).round(3),
            "飞行速度", {
                unit: "格/刻",
                description: "手下扑向目标的速度；速度快的个体调度得利落，精锐手下飞得更快。越慢留给对手的清场时间越长。"
            }),
        /** 放出间隔：基础 3 刻，速度每比 55 快 1 减 0.02 刻（夹 -0.8..2）；夹在 2..6。 */
        stagger: formula(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 2)).clamp(2, 6).round(0),
            "放出间隔", {
                unit: "刻",
                description: "手下是一只只出去还是几乎同时出去；间隔越短越像一拥而上。"
            }),
        /** 手下生命：虫海 3 点、精锐 7 点。 */
        underlingHealth: formula(
            F.when(F.pref("swarm"), F.const(3), F.const(7)).round(0),
            "手下生命", {
                unit: "点",
                description: "每只手下的生命；被中途打掉的手下不再落这一刺。虫海档更脆、精锐档更耐打。"
            }),
        /** 手下存活：基础 60 刻加射程每格 8 刻（夹 0..40）；夹在 80..160。 */
        ttl: seconds(
            F.base(60).plus(F.body("height").minus(1.4).times(40).clamp(0, 40)).clamp(80, 160).round(0),
            "手下存活", "手下最多在场上飞多久；够不到目标就自行散去，被清掉则更早消失。"),
        /** 起手：基础 10 刻，速度每比 55 快 1 减 0.03 刻（夹 -2..4）；夹在 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4)).clamp(6, 14).round(0),
            "起手", "振翅下令、把手下召到身边的时间；速度越快越短。"),
        /** 收招：基础 9 刻，速度每比 55 快 1 减 0.02 刻；夹在 5..12。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02)).clamp(5, 12).round(0),
            "收招", "下令后退回的时间；手下在前方继续扑击。"),
        /** 冷却：基础 34 刻，速度每比 55 快 1 减 0.06 刻，虫海 +4；夹在 20..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.06))
                .plus(F.when(F.pref("swarm"), F.const(4), F.const(0))).clamp(20, 48).round(0),
            "冷却", "再召一队手下前的等待；速度越快回得越快，虫海档缓得更久。")
    });

    defineDamage(attackorderId, "sting", {});

    stages(attackorderId, [
        { level: 32, values: { sting: 26 } },
        { level: 50, values: { underlings: 5, sting: 30 } }
    ]);

    describe(attackorderId, [
        { key: "description.0", values: ["underlings","sting"] },
        { key: "description.1", values: ["reach", "flight", "stagger"] },
        { key: "description.2", values: ["underlingHealth","ttl"] },
        { key: "stance.swarm", values: [], when: function (context) { return read(context.detail.values, ["swarm"]) === true; } },
        { key: "stance.elite", values: [], when: function (context) { return read(context.detail.values, ["swarm"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sting"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.underlings", "tier.1.sting"] }
    ]);
}
