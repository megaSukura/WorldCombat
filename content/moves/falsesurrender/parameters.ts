/**
 * 假跪真撞 / falsesurrender 的参数与伤害段。
 *
 * 原生事实：Dark、物理、威力 80、命中必定（accuracy true）、PP 10、接触，无次要效果（Cobblemon 1.8）。
 * 翻译：把「装作低头认错，用凌乱的头发突刺，攻击必定命中」翻成一次**以认输为饵的伏低突刺**——施法者先伏低
 * （真的把自己暴露出去：起手不能动、时间也长），骗过对手的注意；就在这一低头之间，凌乱的头发从低处窜出去扎进
 * 护架下方。因为出刺点在自己最低、对手最松懈的一刻，所以躲不掉。对手的注意越不在施法者身上，这一下越狠。
 * 数据分散：物攻定突刺威力、速度定头发窜出的快慢与伏低的时长、体型高度定发梢够到多远、等级定射程与压制时长、
 * 对手是否在盯着施法者决定伏低加成是否生效。
 * 配置 grovel（伏低）在「低得更深、够得更远、加成更狠」与「起手更快、暴露更短」之间取舍。
 *
 * 伤害段：lash 是那一下凌乱发刺。
 */
namespace PokemonSkills {
    actionParameters.define("falsesurrender", {
        /** 突刺威力：物攻每比 60 多 1 加 0.18，夹在 46..146。 */
        lash: formula(
            F.base(62).plus(F.stat("attack").minus(60).times(0.18)).clamp(46, 146).round(1),
            "突刺威力", {
                unit: "威力",
                description: "凌乱发刺的威力；物攻越高扎得越深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 发梢距离：基础 3.2 格，碰撞箱每比 1.4 高 1 格加 0.2，等级每比 30 高 1 加 0.03，伏低 ×1.15，夹在 2.8..5.4。 */
        hairReach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(0.2)).plus(F.level().minus(30).times(0.03))
                .times(F.when(F.pref("grovel"), F.const(1.15), F.const(1)))
                .clamp(2.8, 5.4).round(2),
            "发梢距离", {
                unit: "格",
                description: "伏低时乱发能够到多远的目标；也是射程与指示线长度。大个子发更长。"
            }),
        /** 发速：基础 1.1 格/刻，速度每比 60 快 1 加 0.005，夹在 0.9..1.6。 */
        lashSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.005)).clamp(0.9, 1.6).round(2),
            "发速", {
                unit: "格/刻",
                description: "凌乱发刺窜出去的速度；越快越难在刺到之前挪开。目标离得越远，发梢到场越晚。"
            }),
        /** 伏低加成：基础 0.3，物攻每比 60 多 1 加 0.0015，伏低 ×1.25，夹在 0.18..0.58。 */
        ambush: percent(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.0015))
                .times(F.when(F.pref("grovel"), F.const(1.25), F.const(1)))
                .clamp(0.18, 0.58),
            "伏低加成", "对手的注意不在施法者身上（没有盯着施法者出手）时，这一刺额外增加的威力幅度。"),
        /** 发梢半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.1，夹在 0.4..0.8。 */
        whipRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.4, 0.8).round(2),
            "发梢半径", {
                unit: "格",
                description: "发刺的横向判定半径；大个子发束更粗、更易扎中。"
            }),
        /** 伏低时长：基础 12 刻，速度每比 60 快 1 少 0.05，伏低 +4，夹在 6..18。 */
        bowTicks: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05))
                .plus(F.when(F.pref("grovel"), F.const(4), F.const(0)))
                .clamp(6, 18).round(0),
            "伏低时长", "伏低装作认错的时长；这段时间施法者不能动，是被反击的窗口。"),
        /** 压制时长：基础 20 刻，等级每比 30 高 1 加 0.3，夹在 12..40。 */
        staggerTicks: seconds(
            F.base(20).plus(F.level().minus(30).times(0.3)).clamp(12, 40).round(0),
            "压制时长", "撞中后把目标钉在原地一小段的时长；等级高的个体压得更久。"),
        /** 顶退：基础 0.4 格，物攻每比 60 多 1 加 0.003，夹在 0.25..0.9。 */
        push: formula(
            F.base(0.4).plus(F.stat("attack").minus(60).times(0.003)).clamp(0.25, 0.9).round(2),
            "顶退", {
                unit: "格",
                description: "撞中后把目标顶开的距离；物攻高的个体顶得更远。"
            })
    });

    defineDamage("falsesurrender", "lash", {}, { contact: true });

    stages("falsesurrender", [
        { level: 40, values: { lash: 72, hairReach: 4.0 } },
        { level: 56, values: { lash: 86, ambush: 0.42 } }
    ]);

    describe("falsesurrender", [
        { key: "description.0", values: ["lash", "ambush"] },
        { key: "description.1", values: ["hairReach", "lashSpeed", "whipRadius"] },
        { key: "description.2", values: ["bowTicks", "staggerTicks", "push"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash", "tier.0.hairReach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.ambush"] }
    ]);
}
