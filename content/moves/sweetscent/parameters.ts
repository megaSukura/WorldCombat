/**
 * 甜甜香气 / Sweet Scent 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 20／目标 allAdjacentFoes／boosts={evasion:-2}（大幅降低闪避率）。
 * 世界化：即时交战里没有回合制的命中骰与闪避等级，所以「大幅降低闪避率」翻译成**被香气浸透**：
 *   香气落地摊成一片会停留的甜云，云里的人失去遮掩、身上挂上共享身份 world_combat:status/scented，
 *   之后**任何来源**打在它身上的伤害都会被放大——躲不掉、藏不住，就是闪避率降到最低的意思。
 *   香气半径、停留、留香时长与易伤强度各读一项个体数据，配置「馥郁」在浓度与覆盖之间取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach        7 + (等级 − 30) × 0.06 格，夹 5..11；等级越高，香风送得越远。
 *   cloudRadius  2.2 + 体重偏离 60 的部分 × 0.01（夹 −0.4..1.0），馥郁 ×0.8／清甜 ×1.2，夹 1.4..3.6；
 *                越重的个体吐出的香气越多、摊得越开。
 *   cloudTicks   140 + 亲密度 × 0.6，馥郁 ×1.35／清甜 ×0.85，夹 100..340；越亲近越愿意让香气留久些。
 *   scentTicks   120 + 特攻偏离 60 的部分，馥郁 ×1.25，夹 100..260；香气越浓，留香越久。
 *   exposure     特攻每 45 点 +1 级（基础 1 级），馥郁 +1，夹 1..3；每级让来犯伤害放大 6%。
 *   maxTargets   3 + (等级 − 30) × 0.05，夹 3..6；一次扫描最多让几人留香。
 *   tempo        10 − 速度偏离 60 的部分 × 0.03 刻，夹 8..14；速度越快，吐香越早。
 *   recharge     80 + (等级 − 30) × 0.5 刻，夹 70..110；馥郁 ×1.15。
 */
namespace PokemonSkills {
    export const sweetscentId = "sweetscent";
    export const sweetscentEffect = "world_combat:sweet_scent";
    export const sweetscentScene = "world_combat:move_sweetscent";
    export const sweetscentSpot = "world_combat:status/scented";
    export const sweetscentField = "world_combat:field/sweetscent";
    /** 每一级「被香气浸透」让来犯伤害放大 6%。 */
    export const sweetscentRankBonus = 0.06;

    actionParameters.define(sweetscentId, {
        reach: formula(F.base(7).plus(F.level().minus(30).times(0.06)).clamp(5, 11).round(1), "喷香距离", {
            unit: " 格",
            description: "香气能送到的最远点；等级越高送得越远。"
        }),
        cloudRadius: formula(
            F.base(2.2).plus(F.body("weight").minus(60).times(0.01).clamp(-0.4, 1.0))
                .times(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(0.8), F.const(1.2)))
                .clamp(1.4, 3.6).round(2),
            "香气半径", {
                unit: " 格",
                description: "甜云在地面上的覆盖半径；体重越大摊得越开，馥郁取向收得更紧。"
            }),
        cloudTicks: seconds(
            F.base(140).plus(F.individual("friendship").times(0.6))
                .times(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(1.35), F.const(0.85)))
                .clamp(100, 340).round(0),
            "甜云时长", "一片甜云在世界上停留多久；馥郁留得更久。"),
        scentTicks: seconds(
            F.base(120).plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-20, 120))
                .times(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(1.25), F.const(1)))
                .clamp(100, 260).round(0),
            "留香时长", "离开甜云后香气还挂在身上多久；特攻越高留得越久。"),
        exposure: formula(
            F.stat("specialAttack").minus(50).div(45).floor().plus(1)
                .plus(F.when(F.pref("aroma", text("worldcombat.skill.sweetscent.preference.aroma")), F.const(1), F.const(0)))
                .clamp(1, 3),
            "浸透等级", {
                unit: " 级",
                description: "被香气浸透的等级；每级让所有打在这个目标上的伤害放大 6%。"
            }),
        maxTargets: formula(F.base(3).plus(F.level().minus(30).max(0).times(0.05)).clamp(3, 6).round(0), "留香人数", {
            unit: " 人",
            description: "每次扫描最多让几个人留香；等级越高罩得越多。"
        }),
        tempo: seconds(F.base(10).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(8, 14), "起手",
            "吐出香气需要多久；速度越快越早。"),
        recharge: seconds(F.base(80).plus(F.level().minus(30).max(0).times(0.5)).clamp(70, 110), "冷却",
            "两次喷香之间的等待；等级越高越熟练。")
    });
    describe(sweetscentId, [
        { key: "description.0", values: ["exposure", "scentTicks"] },
        { key: "description.1", values: ["cloudRadius", "cloudTicks", "maxTargets"] },
        { key: "description.2", values: ["reach", "tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
