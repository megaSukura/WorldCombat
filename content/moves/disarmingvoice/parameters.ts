/**
 * 魅惑之声 / disarmingvoice 的参数与伤害段。
 *
 * 原生事实：Fairy、特殊、威力 40、命中必定（accuracy true）、PP 15、打所有相邻对手、声音招式（Cobblemon 1.8）。
 * 翻译：把“发出魅惑的叫声，给予精神上的伤害，必定命中”翻成一圈以自身为心的声场——声音充满整块空间，
 * 站在里面的对手避无可避；它伤的是心，命中后让对手错拍（降速），soothe（安抚）时还卸掉出手的劲（降攻）。
 * 数据分散：特攻定威力与卸劲/时长，身高与等级定声场半径，速度定扩张速度，等级定错拍与卸劲等级。
 * 配置 soothe（安抚）让同一句叫声在两种玩法间取舍：降攻控制但威力打折、更慢；清唱则满威力、更快。
 *
 * 伤害段：note 是声波落在每个目标身上的那一下。
 */
namespace PokemonSkills {
    actionParameters.define("disarmingvoice", {
        /** 声波威力：特攻每比 60 多 1 加 0.16，夹在 22..72；安抚时 ×0.85（声音先卸劲，再伤人）。 */
        note: formula(
            F.base(38).plus(F.stat("specialAttack").minus(60).times(0.16))
                .times(F.when(F.pref("soothe"), F.const(0.85), F.const(1)))
                .clamp(18, 72).round(1),
            "声波威力", { base: 38,
                unit: "威力",
                description: "每个被声场罩住的目标承受的威力；安抚形态把一部分力气用在卸劲上，威力打八五折。"
            }),
        /** 声场半径：基础 6 格，碰撞箱每比 1.4 高 1 格加 0.8，等级每比 30 高 1 加 0.03，夹在 4..9。 */
        radius: formula(
            F.base(6).plus(F.body("height").minus(1.4).times(0.8)).plus(F.level().minus(30).times(0.03))
                .clamp(4, 9).round(1),
            "声场半径", { base: 6,
                unit: "格",
                description: "叫声充满以自身为心的多大一块空间；大个子、等级高的个体唱得更远。"
            }),
        /** 扩张速度：基础 0.9 格/刻，速度每比 60 快 1 加 0.004，夹在 0.7..1.3。 */
        waveSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.7, 1.3).round(2),
            "扩张速度", {
                unit: "格/刻",
                description: "声波从身上扩到边缘的速度；越快目标越晚才听到，但仍躲不出声场。"
            }),
        /** 错拍等级：基础 1，特攻每比 60 多 1 加 0.01，夹在 1..2 并向下取整。 */
        stagger: formula(
            F.base(1).plus(F.stat("specialAttack").minus(60).times(0.01)).clamp(1, 2).floor(),
            "错拍等级", {
                unit: "级",
                description: "被叫声震到后速度下降的能力等级；特攻越高，声场越让人失准。"
            }),
        /** 卸劲等级：安抚时为基础 1 + 每 20 级比 30 高出一级（夹在 1..2 向下取整），否则为 0。 */
        soften: formula(
            F.when(F.pref("soothe"),
                F.base(1).plus(F.level().minus(30).div(20).floor()).clamp(1, 2),
                F.const(0)),
            "卸劲等级", {
                unit: "级",
                description: "安抚形态下攻击下降的能力等级；等级越高卸得越狠，清唱时为 0。"
            }),
        /** 魅惑时长：安抚时为 60 刻 + 特攻每比 60 多 1 加 0.4（夹在 40..120），否则为 0。 */
        charmTicks: seconds(
            F.when(F.pref("soothe"),
                F.base(60).plus(F.stat("specialAttack").minus(60).times(0.4)).clamp(40, 120).round(0),
                F.const(0)),
            "魅惑时长", "安抚形态下魅惑状态在目标身上停留的时长；清唱时为 0。")
    });

    defineDamage("disarmingvoice", "note", {}, { sound: true });

    stages("disarmingvoice", [
        { level: 30, values: { note: 46 } },
        { level: 48, values: { radius: 8 } }
    ]);

    describe("disarmingvoice", [
        { key: "description.0", values: ["note", "radius"] },
        { key: "description.1", values: ["stagger", "waveSpeed"] },
        { key: "description.2", values: ["soften", "charmTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.note"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.radius"] }
    ]);
}
