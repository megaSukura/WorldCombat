/**
 * 吸取拳 / drainpunch —— 参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 75／命中 100／PP 10／接触／punch 标记／吸取一半伤害（Cobblemon 1.8，127 位已实装学习者）。
 *
 * 核心念头：**站定一记直拳抵进对手，把力气顺着拳路抽回自己身上**。它是本族最短、最快、唯一「脚下不动」的
 * 物理吸招：不冲、不扑，靠拳距和出手速度把一段贴身距离变成命中；力量顺着手臂回流，画面上一眼看出它从拳头回到身上。
 * 翻译：一记短距接触拳击；命中结算 `jab` 物理伤害并把伤害的一部分经 `drain` 抽回自身。
 *
 * 与家族分开：木角是带着身体撞进去、可贯穿的冲撞；吸血是咬住不放的持续抽吸；悔念剑是扇面斩击；
 *   只有吸取拳站在原地出拳，靠「拳距短、出手快、拳路回流」被认出。配置 `combo` 让同一招在「一记直拳」与「三连拳」两种形状间取舍。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   jab     拳威 75 + 物攻偏移 + 身高偏移（臂展）；连打式 ×0.62（分给三拳）。物攻高、臂展长的个体一拳更重。
 *   sap     汲取比例 0.50 + 物攻偏移 + 身高偏移；连打式 ×0.78（每拳分走的更薄）。
 *   reach   拳距 2.4 + 速度偏移；也是实际射程来源，腿快的个体贴近得快、够得稍远。
 *   fist    拳面判定 0.40 + 身高偏移；个高的个体拳面更宽，不容易被侧身让开。
 *   gaps    连打间隔 4 刻 − 速度偏移；连打式把三拳串起来，间隔决定整段的时长。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却；连打式起手更长、收招更慢。
 *
 * 配置 `combo`（连打式）双向取舍：开＝三连拳，总伤害更高、更容易打出暴击，但每拳更轻、每拳的汲取比例更低、
 *   收招更长；关＝一记干净的直拳，汲取更足、收招更快，适合续航。两向各有局面（抢输出 vs 续航）。
 *
 * 伤害段 `jab` 与参数同名，走共享换算（原生类别 Physical，Fighting 属性，接触、punch）。
 */
namespace PokemonSkills {
    actionParameters.define("drainpunch", {
        /** 拳威：75 + 物攻偏移[−12,28] + 身高偏移[−4,9]；连打式 ×0.62；夹 40..120。 */
        jab: formula(
            F.base(75).plus(F.stat("attack").minus(65).times(0.42).clamp(-12, 28))
                .plus(F.body("height").minus(1.3).times(7).clamp(-4, 9))
                .times(F.when(F.pref("combo", text("worldcombat.skill.drainpunch.preference.combo")), F.const(0.62), F.const(1)))
                .clamp(40, 120).round(1),
            "拳威", {
                base: 75,
                unit: "威力",
                description: "这一拳的基础威力；物攻越高、臂展越长打得越重，连打式把力量分给三拳。对手防御、相性与暴击在命中时另算。"
            }),
        /** 汲取比例：0.50 + 物攻偏移[−0.03,0.05] + 身高偏移[−0.01,0.02]；连打式 ×0.78；夹 0.36..0.58。 */
        sap: formula(
            F.base(0.50).plus(F.stat("attack").minus(65).times(0.0008).clamp(-0.03, 0.05))
                .plus(F.body("height").minus(1.3).times(0.01).clamp(-0.01, 0.02))
                .times(F.when(F.pref("combo", text("worldcombat.skill.drainpunch.preference.combo")), F.const(0.78), F.const(1)))
                .clamp(0.36, 0.58),
            "汲取比例", {
                base: 0.50,
                presentation: "percent",
                format: function (value) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "这一拳造成的伤害转为自身回复的比例（原生一半）；物攻高抽得更足，连打式每拳分走的更薄。"
            }),
        /** 拳距：2.4 + 速度偏移[−0.3,0.7]；夹 1.9..3.4。 */
        reach: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.7)).clamp(1.9, 3.4).round(2),
            "拳距", {
                base: 2.4,
                unit: "格",
                description: "从站位到拳头够到的最远距离，也是本招的实际射程来源；腿快的个体贴近更快、够得稍远。"
            }),
        /** 拳面判定：0.40 + 身高偏移[−0.05,0.20]；夹 0.32..0.62。 */
        fist: formula(
            F.base(0.40).plus(F.body("height").minus(1.3).times(0.12).clamp(-0.05, 0.20)).clamp(0.32, 0.62).round(2),
            "拳面判定", {
                base: 0.40,
                unit: "格",
                description: "拳头扫过的横向判定半径；个高的个体拳面更宽，更不容易被侧身让开。"
            }),
        /** 连打间隔：4 − 速度偏移[−1,2]；夹 2..6 刻。 */
        gaps: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(2, 6).round(0),
            "连打间隔", "三连拳每两拳之间的间隔；速度越快串得越紧。"),
        /** 起手：6 − 速度偏移[−2,2] + 连打式 2；夹 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("combo", text("worldcombat.skill.drainpunch.preference.combo")), F.const(2), F.const(0)))
                .clamp(4, 10).round(0),
            "起手", "收拳蓄势的时间；速度越快越短，连打式要多压一拍。"),
        /** 收招：6 − 速度偏移[−2,2] + 连打式 4；夹 4..12。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("combo", text("worldcombat.skill.drainpunch.preference.combo")), F.const(4), F.const(0)))
                .clamp(4, 12).round(0),
            "收招", "打完把拳收回来、稳住重心的收势；连打式收得更慢。"),
        /** 冷却：22 − 速度偏移[−4,3] + 连打式 4；夹 14..30。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 3))
                .plus(F.when(F.pref("combo", text("worldcombat.skill.drainpunch.preference.combo")), F.const(4), F.const(0)))
                .clamp(14, 30).round(0),
            "冷却", "两拳之间的等待；它是本族最短的冷却，单拳式回得尤其快。")
    });

    stages("drainpunch", [
        { level: 22, values: { jab: 84 } },
        { level: 40, values: { jab: 94, sap: 0.53 } }
    ]);

    defineDamage("drainpunch", "jab", { defenceCoefficient: 0.005,
        rationale: "吸取拳的接触拳击，防御按默认系数减伤。" }, { contact: true, punch: true });

    describe("drainpunch", [
        { key: "description.0", values: ["jab"] },
        { key: "description.1", values: ["reach", "fist"] },
        { key: "description.2", values: ["sap"] },
        { key: "combo.on", values: ["gaps"], when: function (context) { return read(context.detail.values, ["combo"]) === true; } },
        { key: "combo.off", values: [], when: function (context) { return read(context.detail.values, ["combo"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jab", "tier.1.sap"] }
    ]);
}
