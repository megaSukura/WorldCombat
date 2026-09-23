/**
 * 毒液冲击 / venoshock 的参数与伤害段。
 *
 * 原生事实：Poison、特殊、威力 65、命中 100、PP 10、非接触；目标处于中毒／剧毒时威力翻倍（Cobblemon 1.8）。
 * 翻译：把回合制的“对中毒者翻倍”翻成**泼出的毒液与目标体内毒性发生反应**：命中已中毒的目标时这一段翻倍，
 * 并把那份毒**升格为剧毒**、延长持续时间——这是它区别于单纯投掷毒液的一步。
 * 飞行速度交给**速度**（快个体甩得更急、弧线更平），判定与水花交给**碰撞箱高度**，毒性持续交给**等级**，
 * 冲退交给**体重**。配置 corrode（侵蚀取向）：牺牲即时威力换取更长的毒性，两者各有适用局面。
 *
 * 伤害段名 glob：这一泼随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("venoshock", {
        /** 毒液威力：目标中毒／剧毒时 ×2；侵蚀取向 ×0.85；夹在 38..150。 */
        glob: formula(
            F.base(65)
                .times(F.when(F.target("status.poison"), F.const(2), F.const(1)).as({ key: "worldcombat.skill.venoshock.value.react", fallback: "毒性反应" }))
                .times(F.when(F.pref("corrode"), F.const(0.85), F.const(1)))
                .clamp(38, 150).round(1),
            "毒液威力", {
                unit: "威力",
                description: "本段伤害的基础威力；命中已中毒的目标时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 毒液速度：速度每比 40 多 1 加 0.004 格/刻，夹在 1.0..2.7。 */
        globSpeed: formula(
            F.base(1.7).plus(F.stat("speed").minus(40).max(0).times(0.004)).clamp(1.0, 2.7).round(2),
            "毒液速度", {
                unit: "格/刻",
                description: "毒液团飞行的速度；快个体甩得更急。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.1，夹在 0.2..0.55。 */
        globRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.2, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "毒液团的横向判定半径；大个子抛得更大。"
            }),
        /** 弧线重力：基础 0.075，速度每比 40 多 1 减 0.0006，夹在 0.03..0.095；越快越平直。 */
        arcGravity: formula(
            F.base(0.075).minus(F.stat("speed").minus(40).max(0).times(0.0006)).clamp(0.03, 0.095).round(3),
            "弧线重力", {
                unit: "格/刻²",
                description: "毒液团受的重力；速度快的个体抛得更平、落点更准。"
            }),
        /** 毒性持续：基础 300 刻，20 级起每级 +6，侵蚀取向 ×1.6，夹在 240..640。 */
        toxinTicks: seconds(
            F.base(300).plus(F.level().minus(20).max(0).times(6))
                .times(F.when(F.pref("corrode"), F.const(1.6), F.const(1)))
                .clamp(240, 640).round(0),
            "毒性持续", "命中已中毒目标时，那份毒被升格为剧毒后持续多久；侵蚀取向挂得更久。"),
        /** 冲退距离：基础 0.26 格，体重每 10 加 0.01（上限 0.5），侵蚀取向 ×0.8，夹在 0.1..0.9。 */
        push: formula(
            F.base(0.26).plus(F.body("weight").div(10).times(0.01).min(0.5))
                .times(F.when(F.pref("corrode"), F.const(0.8), F.const(1)))
                .clamp(0.1, 0.9).round(2),
            "冲退距离", {
                unit: "格",
                description: "命中后沿泼洒方向推开的距离；大个子冲得更远。"
            })
    });

    defineDamage("venoshock", "glob", {
        defenceCoefficient: 0.0048,
        rationale: "腐蚀性毒液对防御的穿透略强于默认，让特攻差在毒液冲击上更明显。"
    });

    describe("venoshock", [
        { key: "description.0", values: ["glob"] },
        { key: "description.1", values: ["toxinTicks"] },
        { key: "description.2", values: ["globSpeed","arcGravity","globRadius","push"] },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] }
    ]);
}
