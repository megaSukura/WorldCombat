/**
 * 群魔乱舞 / infernalparade 的参数与伤害段。
 *
 * 原生事实：Ghost、特殊、威力 60、命中 100、PP 15、非接触；30% 使目标灼伤；目标处于任意异常时威力翻倍（Cobblemon 1.8）。
 * 翻译：把“无数的火球”做成一支**环绕后再扑上去的鬼火队伍**——先散开，再各自转向追向目标，所以它比同族的两招更“活”。
 * 数量随**等级与速度**，转向能力随**特攻**（灵力越强追得越紧），飞行速度随**速度**，判定随**碰撞箱高度**，
 * 散开角度随**体重**，灼伤概率与持续随**特攻与等级**。目标只要带任意异常就翻倍。
 * 配置 dirge（挽歌）：多一团鬼火、转得更急，但飞得更慢、收招与冷却更长。
 *
 * 伤害段名 parade：整队鬼火随精灵数据变化的那部分（每团按数量均分）。
 */
namespace PokemonSkills {
    /** 目标身上是否带着任意主异常：灼伤、麻痹、中毒／剧毒、冰冻或睡眠。 */
    function infernalparadeAnyStatus(): Formula.Node {
        return F.target("status.burn")
            .plus(F.target("status.paralysis"))
            .plus(F.target("status.poison"))
            .plus(F.target("status.frozen"))
            .plus(F.target("status.sleep"))
            .gt(0);
    }

    actionParameters.define("infernalparade", {
        /** 乱舞总威力：目标带任意异常时 ×2；夹在 40..150。 */
        parade: formula(
            F.base(60)
                .times(F.when(infernalparadeAnyStatus(), F.const(2), F.const(1)).as({ key: "worldcombat.skill.infernalparade.value.react", fallback: "异常引燃" }))
                .clamp(40, 150).round(1),
            "乱舞总威力", {
                unit: "威力",
                description: "整队鬼火合计的基础威力，命中时按团数均分；目标带任意异常时翻倍。对手防御、相性与暴击逐团结算。"
            }),
        /** 鬼火数量：基础 3，每 22 级 +1，速度每比 50 多 1 加 0.02，挽歌 +1；夹在 3..9 的整数。 */
        wisps: formula(
            F.base(3).plus(F.level().div(22)).plus(F.stat("speed").minus(50).max(0).times(0.02))
                .plus(F.when(F.pref("dirge"), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "鬼火数量", {
                unit: "团",
                description: "一次召出的鬼火团数；等级越高、越快越多，挽歌取向下再多一团。"
            }),
        /** 鬼火速度：基础 1.05 格/刻，速度每比 40 多 1 加 0.004；挽歌 ×0.8；夹在 0.55..1.6。 */
        wispSpeed: formula(
            F.base(1.05).plus(F.stat("speed").minus(40).max(0).times(0.004))
                .times(F.when(F.pref("dirge"), F.const(0.8), F.const(1)))
                .clamp(0.55, 1.6).round(2),
            "鬼火速度", {
                unit: "格/刻",
                description: "鬼火飞行的速度；挽歌取向下飞得更慢、更黏人。"
            }),
        /** 单团判定半径：基础 0.24 格，高度每比 1.4 高 1 格加 0.1，夹在 0.16..0.45。 */
        wispRadius: formula(
            F.base(0.24).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.16, 0.45).round(2),
            "单团判定半径", {
                unit: "格",
                description: "每团鬼火的横向判定半径；大个子召出的更粗。"
            }),
        /** 追踪转向：基础 6 度/刻，特攻每比 60 多 1 加 0.06；挽歌 ×1.3；夹在 4..16。 */
        turn: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).max(0).times(0.06))
                .times(F.when(F.pref("dirge"), F.const(1.3), F.const(1)))
                .clamp(4, 16).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "鬼火每刻最多转向多少度；特攻越高追得越紧，挽歌取向下更缠人。"
            }),
        /** 起旋延迟：基础 6 刻，20 级起每级 +0.2，夹在 4..14。 */
        orbitDelay: formula(
            F.base(6).plus(F.level().minus(20).max(0).times(0.2)).clamp(4, 14).round(0),
            "起旋延迟", {
                unit: "刻",
                description: "鬼火先沿直线上冲多久才开始转向目标；等级越高绕得越久。"
            }),
        /** 灼伤概率：基础 0.3，特攻每比 60 多 1 加 0.0008，夹在 0.2..0.45。 */
        burnChance: percent(
            F.base(0.3).plus(F.stat("specialAttack").minus(60).max(0).times(0.0008)).clamp(0.2, 0.45),
            "灼伤概率", "若至少一团鬼火命中，按这个概率让目标灼伤；特攻越高越容易点燃。"),
        /** 灼伤持续：基础 360 刻，20 级起每级 +8，夹在 300..680。 */
        burnTicks: seconds(
            F.base(360).plus(F.level().minus(20).max(0).times(8)).clamp(300, 680).round(0),
            "灼伤持续", "鬼火留下的灼伤持续多久；等级越高烧得越久。"),
        /** 散开张角：基础 26 度，体重每比 60 多 0.1 加 0.015，夹在 14..44。 */
        spread: formula(
            F.base(26).plus(F.body("weight").minus(60).times(0.15)).clamp(14, 44).round(0),
            "散开张角", {
                unit: "度",
                description: "鬼火起旋前散开的半角；体重越大绕出的圈越大。"
            })
    });

    defineDamage("infernalparade", "parade", {});

    describe("infernalparade", [
        { key: "description.0", values: ["wisps", "spread"] },
        { key: "description.1", values: ["parade","wispSpeed","turn"] },
        { key: "description.2", values: ["burnChance","burnTicks","orbitDelay"] }
    ]);
}
