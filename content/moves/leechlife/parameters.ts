/**
 * 吸血 / leechlife —— 参数与伤害段。
 *
 * 原生事实：Bug／物理／威力 80／命中 100／PP 10／接触／吸取一半伤害（Cobblemon 1.8，71 位已实装学习者）。
 *
 * 核心念头：**咬住不放，用口器把血一口口吸上来**。它是本族唯一的「持续抽吸」物理吸招——咬中不是一下结束，
 *   而是连着几拍把血抽回身上，连线一直连着两张嘴；施法者咬住后原地不动，目标拉开到 `leash` 以外钩子就脱开。
 * 翻译：一记短距撕咬先造成 `bite`，随后按 `draws` 分拍各结算一次 `siphon`，每拍把伤害的一部分经 `drain` 抽回自身。
 *
 * 与家族分开：木角是身体撞进去、吸取拳是站定出拳，都是一下结算；只有吸血把命中拉成一段持续的抽吸，
 *   画面里数得出还剩几拍、钩子连着多远。配置 `deep` 让它在「多口快吸」与「少口深咬」之间取舍。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   bite    撕咬入手 40 + 物攻偏移 + 身高偏移；深咬式 ×1.2。物攻高、口器长的个体第一口更重。
 *   siphon  每拍抽量 10 + 物攻偏移 + 身高偏移；深咬式 ×1.4（少口但每口更狠）。
 *   sap     汲取比例 0.50 + 物攻偏移；深咬式 +0.05。抽得越凶回得越足。
 *   draws   抽吸拍数：快吸式 5 拍、深咬式 3 拍，拍数决定整段的节奏。
 *   reach   咬距 2.2 + 速度偏移；也是实际射程来源，先咬到的那一口靠腿快。
 *   leash   拉扯距离 3.4 + 速度偏移 + 身高偏移；目标越过这个距离钩子脱开，抽吸提前结束。
 *   fang    口器判定 0.40 + 身高偏移。
 *   gap     每拍间隔 6 刻 − 速度偏移；深咬式 ×1.6，拍与拍之间拉得更开。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却；深咬式更慢。
 *
 * 配置 `deep`（深咬式）双向取舍：开＝三拍重吸、每拍更狠、回血比例更高、拉扯更远，但起手收招更慢、每拍间隔更长，
 *   目标更容易在这段里跑掉；关＝五拍快吸，节奏紧、回得快，但每口更轻、总抽量分得更散。两向各有局面。
 *
 * 伤害段 `bite`（入手）与 `siphon`（每拍）各自与参数同名，走共享换算（原生类别 Physical，Bug 属性，接触、bite）。
 */
namespace PokemonSkills {
    actionParameters.define("leechlife", {
        /** 撕咬入手：40 + 物攻偏移[−6,16] + 身高偏移[−3,6]；深咬式 ×1.2；夹 24..72。 */
        bite: formula(
            F.base(40).plus(F.stat("attack").minus(65).times(0.24).clamp(-6, 16))
                .plus(F.body("height").minus(1.3).times(6).clamp(-3, 6))
                .times(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(1.2), F.const(1)))
                .clamp(24, 72).round(1),
            "咬口威力", {
                base: 40,
                unit: "威力",
                description: "咬进去这第一下的基础威力；物攻越高、口器越长咬得越深，深咬式第一口更重。"
            }),
        /** 每拍抽量：10 + 物攻偏移[−2,6] + 身高偏移[−1.5,3]；深咬式 ×1.4；夹 5..26。 */
        siphon: formula(
            F.base(10).plus(F.stat("attack").minus(65).times(0.10).clamp(-2, 6))
                .plus(F.body("height").minus(1.3).times(2.5).clamp(-1.5, 3))
                .times(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(1.4), F.const(1)))
                .clamp(5, 26).round(1),
            "每拍抽量", {
                base: 10,
                unit: "威力",
                description: "咬住之后每一拍抽走的血量威力；深咬式少口但每口更重。"
            }),
        /** 汲取比例：0.50 + 物攻偏移[−0.03,0.05] + 深咬式 0.05；夹 0.40..0.60。 */
        sap: formula(
            F.base(0.50).plus(F.stat("attack").minus(65).times(0.0008).clamp(-0.03, 0.05))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(0.05), F.const(0)))
                .clamp(0.40, 0.60),
            "汲取比例", {
                base: 0.50,
                presentation: "percent",
                format: function (value) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "每一拍造成的伤害转为自身回复的比例（原生一半）；物攻高、深咬式抽得更足。"
            }),
        /** 抽吸拍数：快吸式 5、深咬式 3。 */
        draws: formula(
            F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(3), F.const(5)),
            "抽吸拍数", {
                base: 5,
                unit: "拍",
                description: "咬住之后连抽几拍；越快越散（5 拍），越深越少（3 拍）。拍数与每拍抽量共同决定总抽量。"
            }),
        /** 咬距：2.2 + 速度偏移[−0.2,0.5]；夹 1.8..2.9。 */
        reach: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.5)).clamp(1.8, 2.9).round(2),
            "咬距", {
                base: 2.2,
                unit: "格",
                description: "从站位到口器够到的最远距离，也是本招的实际射程来源；腿快的个体先咬到。"
            }),
        /** 拉扯距离：3.4 + 速度偏移[−0.3,0.8] + 身高偏移[0,0.6]；夹 2.6..4.8。 */
        leash: formula(
            F.base(3.4).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.3, 0.8))
                .plus(F.body("height").minus(1.3).times(0.6).clamp(0, 0.6))
                .clamp(2.6, 4.8).round(2),
            "拉扯距离", {
                base: 3.4,
                unit: "格",
                description: "咬住后目标拉到多远钩子脱开、抽吸提前结束；身体长、腿快的个体挂得更牢。"
            }),
        /** 口器判定：0.40 + 身高偏移[−0.05,0.20]；夹 0.32..0.58。 */
        fang: formula(
            F.base(0.40).plus(F.body("height").minus(1.3).times(0.12).clamp(-0.05, 0.20)).clamp(0.32, 0.58).round(2),
            "口器判定", {
                base: 0.40,
                unit: "格",
                description: "口器扫过的横向判定半径；个高的个体口器更宽，更不容易被侧身让开。"
            }),
        /** 拍间隔：6 − 速度偏移[−1,2]；深咬式 ×1.6；夹 3..14 刻。 */
        gap: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .times(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(1.6), F.const(1)))
                .clamp(3, 14).round(0),
            "拍间隔", "两次抽吸之间的间隔；速度越快抽得越密，深咬式把每拍拉得更开。"),
        /** 起手：7 − 速度偏移[−2,2] + 深咬式 2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "凑上去张口的时间；速度越快越短，深咬式要多找一下角度。"),
        /** 收招：7 − 速度偏移[−2,2] + 深咬式 3；夹 4..14。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "收招", "松开钩子、抹嘴站稳的收势；深咬式抽得久、收得慢。"),
        /** 冷却：28 − 速度偏移[−4,3] + 深咬式 5；夹 18..40。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 3))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.leechlife.preference.deep")), F.const(5), F.const(0)))
                .clamp(18, 40).round(0),
            "冷却", "两次撕咬之间的等待；深咬式回得更慢。")
    });

    stages("leechlife", [
        { level: 20, values: { bite: 52 } },
        { level: 36, values: { bite: 62, siphon: 14 } }
    ]);

    defineDamage("leechlife", "bite", { defenceCoefficient: 0.005,
        rationale: "吸血撕咬入手的接触伤害，防御按默认系数减伤。" }, { contact: true, bite: true });
    defineDamage("leechlife", "siphon", { defenceCoefficient: 0.005,
        rationale: "咬住后每一拍抽走的接触伤害，防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("leechlife", [
        { key: "description.0", values: ["bite"] },
        { key: "description.1", values: ["siphon", "draws"] },
        { key: "description.2", values: ["sap", "leash"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bite"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bite", "tier.1.siphon"] }
    ]);
}
