/**
 * 起死回生 / reversal — 参数与伤害段。
 *
 * 原生事实：格斗、物理、命中 100、PP 15、接触、无次要效果；威力按当前生命比例分档，血越少越高
 * （满血 20 → 濒死 200）（Cobblemon 1.8，177 位学习者）。
 *
 * 翻译：把「血越少威力越大」翻成即时战斗里的一件事——**背水一喷**：先站住把余力全提到脚下，再贴身跃起，
 * 落地时从身下喷出一道格斗系的光柱，把周围所有敌人一起掀开。它是本组唯一带范围的成员，也是唯一随伤势
 * 放大作用范围的成员：生命比例越低，威力与喷发半径一起变大，画面上的范围就是真正会打到的范围。
 * 与报恩/迁怒分开：那两招读亲密度、只打一个；这招读自己的血、一次掀一圈。
 *
 * 数据分散：power 读已损失生命比例与攻击；burstRadius 读已损失生命比例与体型体重；lunge/lungeSpeed/plant 读速度；
 * push 读体重。配置 reckless（拼命式）：威力再抬一截，但每次打中都要按最大生命付反噬——残血时更猛也更险。
 */
namespace PokemonSkills {
    actionParameters.define("reversal", {
        /** 背水威力：基础 20，已损失生命比例 ×120（0..120），攻击每比 55 多 1 加 0.2（夹 −6..+20），等级每高 1 加 0.25（夹 −4..+10）；拼命 ×1.18；夹在 14..178。 */
        power: formula(
            F.base(20)
                .plus(F.const(1).minus(F.actor("healthRatio", text("worldcombat.skill.reversal.value.hpRatio"))).clamp(0, 1)
                    .times(120).as(text("worldcombat.skill.reversal.value.wound")))
                .plus(F.stat("attack").minus(55).times(0.2).clamp(-6, 20).as(text("worldcombat.skill.reversal.value.force")))
                .plus(F.level().minus(20).times(0.25).clamp(-4, 10).as(text("worldcombat.value.level")))
                .times(F.when(F.pref("reckless", text("worldcombat.skill.reversal.preference.reckless")), F.const(1.18), F.const(1)))
                .clamp(14, 178).round(1),
            "背水威力", {
                unit: "威力",
                description: "这一喷的基础威力；自己已损失的生命比例越高越大，满血时接近最低。对手防御、相性与暴击在命中时另算。"
            }),
        /** 已损失生命比例：1 − 当前生命 / 最大生命，夹在 0..1。它是本招威力与喷发范围的共同读数来源。 */
        wound: percent(
            F.const(1).minus(F.actor("healthRatio", text("worldcombat.skill.reversal.value.hpRatio"))).clamp(0, 1).round(3),
            "已损失生命", "自己越接近倒下这个值越大；它同时放大威力与喷发半径，是这招「起死回生」的根。"),
        /** 喷发半径：基础 0.9 格，已损失生命比例 ×0.7（0..0.7），碰撞箱每比 1.4 高 1 格加 0.2，体重每比 60 重 1 加 0.002；夹在 0.8..2.2。 */
        burstRadius: formula(
            F.base(0.9)
                .plus(F.const(1).minus(F.actor("healthRatio", text("worldcombat.skill.reversal.value.hpRatio"))).clamp(0, 1)
                    .times(0.7).as(text("worldcombat.skill.reversal.value.wound")))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.15, 0.7).as(text("worldcombat.skill.reversal.value.bulk")))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.08, 0.4))
                .clamp(0.8, 2.2).round(2),
            "喷发半径", {
                unit: "格",
                description: "落点掀开的一圈范围；伤势越重、身板越大喷得越宽，站在这一圈里的敌人都会被掀到。"
            }),
        /** 扑身距离：基础 2.2 格，速度每比 55 多 1 加 0.018（夹 −0.3..+1.1）；夹在 1.6..3.6。 */
        lunge: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.3, 1.1)).clamp(1.6, 3.6).round(2),
            "扑身距离", {
                unit: "格",
                description: "从站定到喷发点的位移；腿快的个体扑得更远。"
            }),
        /** 扑身速度：基础 0.66 格/刻，速度每比 55 多 1 加 0.004（夹 −0.12..+0.32）；夹在 0.45..1.1。 */
        lungeSpeed: formula(
            F.base(0.66).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.12, 0.32)).clamp(0.45, 1.1).round(2),
            "扑身速度", {
                unit: "格/刻",
                description: "扑出去时每刻前进的距离；要贴到对手身下才掀得中。"
            }),
        /** 起手站定：基础 11 刻，速度每比 55 快 1 少 0.03 刻（夹 −1.5..+3）；夹在 6..16 刻。 */
        plant: formula(
            F.base(11).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3)).clamp(6, 16).round(0),
            "起手站定", {
                unit: "刻",
                description: "把余力提到脚下之前要站住多久；天生快的个体起得更急。这一段可以被对手打断，打断则什么也不发生。"
            }),
        /** 判定半径：基础 0.4 格，碰撞箱每比 1.4 高 1 格加 0.13；夹在 0.3..0.8。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.13)).clamp(0.3, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "扑身途中撞到活体的横向判定半径；身板越大判定越宽。喷发本身按喷发半径结算，不受此限。"
            }),
        /** 径向顶开：基础 0.4 格，体重每比 60 重 1 加 0.002（夹 −0.06..+0.5）；夹在 0.15..1.0。 */
        push: formula(
            F.base(0.4).plus(F.body("weight").minus(60).times(0.002).clamp(-0.06, 0.5)).clamp(0.15, 1.0).round(2),
            "径向顶开", {
                unit: "格",
                description: "喷发把圈内每个敌人从自己身下向外掀开多远；越重掀得越远。"
            }),
        /** 反噬比例：拼命式每次打中后，自己按最大生命扣掉的比例，固定 8%。 */
        recoil: percent(
            F.base(0.08),
            "反噬比例", "仅拼命式生效：每次打中后自己按最大生命扣掉这一比例，残血时可能因此倒下。"),
        minimumMove: hidden(0.05)
    });

    defineDamage("reversal", "power", { defenceCoefficient: 0.005 }, { contact: true });

    describe("reversal", [
        { key: "description.0", values: ["power", "wound"] },
        { key: "description.1", values: ["plant", "lunge", "lungeSpeed"] },
        { key: "description.2", values: ["burstRadius", "push", "collisionRadius"] },
        { key: "reckless.on", values: ["recoil"], when: function (context) { return read(context.detail.values, ["reckless"]) === true; } },
        { key: "reckless.off", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) !== true; } },
        { key: "timing", values: ["range", "plant", "recover", "pp", "cooldown"] }
    ]);
}
