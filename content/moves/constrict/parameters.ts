/**
 * 缠绕 / constrict 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、物理、威力 10、命中 100、PP 35、优先度 0、接触、
 * 10% 概率降低对手速度一级（18 位学习者）。
 * 翻译：保留「用触手或青藤缠住对手进行攻击，有时降低速度」，把它做成本族里唯一的**控制招**：
 * 青藤沿线伸向目标、缠上并收紧；伤害很低，价值全在「缠住之后」——压速度、短暂定住，让队友接手。
 * 原生的「10% 降速」在这里翻成：减速是主效果（这是控制招的意义），而「有时更紧一道」落成 `gripChance`
 * 概率再压一级速度，读轨迹可见，属于随机结果。
 *
 * 与本族分开：强力鞭打是远而宽的横扫、藤鞭是短而快的单线一抽、百万吨重踢是直线单体踢飞；
 * 缠绕凭「缠上去、把目标按住并留下一个持续状态」认出来，是唯一在命中后世界继续变化的一招。
 *
 * 数据分散（每项读不同的精灵数据；目标侧用目标事实）：
 *   squeeze     绞缠威力：物攻给收紧的力、等级拾级抬升；攀缠式把力摊到更长的时间里。
 *   reach       触及距离：身高给触手长度，速度给一点前探。
 *   pace        伸藤速度：施法者速度，决定触手多快够到目标（也决定对手有多少时间走开）。
 *   speedStages 减速级数：基础 1，**目标当前速度**高（≥90）时再多一级；攀缠式补一级。
 *   bindTicks   束缚持续：等级决定缠多久；攀缠式留得更久。
 *   holdTicks   定身时长：**目标体重**（越重越难立刻挣脱）与攀缠式决定。
 *   gripChance  再紧一道的概率：等级抬升；原生「有时降速」的落点，随机结果写进轨迹。
 *   notes       藤屑数量：物攻与等级派生，表现按它发射。
 *   tempo/aftercast/recharge 起手／收招／冷却：速度决定快慢；攀缠式收得更久、缓得更久。
 *
 * 配置 latch（攀缠式，默认关）双向取舍：开＝缠得久、定得久、再压一级速度，但伤害更低，且施法者要分出
 * 肢体按住目标（自身短暂 rooted）；关（绞缠式）＝一记更重更快的硬绞，束缚更短、定身更短。两向各有局面
 * （配合队友控场 vs 单点速伤）。
 *
 * 伤害段 squeeze 与参数同名；属性与分类沿用原生 Normal／物理，对手防御、相性与暴击在命中时由共享结算乘入。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const constrictMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");
    /** 目标当前速度：宝可梦读原生速度能力，其他生物缺省按 0。 */
    const constrictSpeedNode: Formula.Node = F.target("stat.speed");

    actionParameters.define("constrict", {
        /** 绞缠威力：基础 10；物攻每比 60 多 1 加 0.16（上限 +14）；等级每比 20 高 1 加 0.08（上限 +8）；攀缠 ×0.82 / 绞缠 ×1.15；夹在 8..42。 */
        squeeze: formula(
            F.base(10)
                .plus(F.stat("attack").minus(60).times(0.16).clamp(-5, 14))
                .plus(F.level().minus(20).times(0.08).clamp(0, 8))
                .times(F.when(F.pref("latch", text("worldcombat.skill.constrict.preference.latch")), F.const(0.82), F.const(1.15)))
                .clamp(8, 42).round(1),
            "绞缠威力", {
                unit: "威力",
                description: "青藤收紧这一下的基础威力；物攻给出收紧的力。这一招伤害很低，价值在缠住之后。对手防御、相性与暴击在命中时另算。"
            }),
        /** 触及距离：基础 2.6 格；身高每比 1.4 高 1 格加 0.6（上限 +1.3）；速度每比 60 快 1 加 0.006（上限 +0.35）；夹在 2.2..4.0。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.3))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.35))
                .clamp(2.2, 4.0).round(2),
            "触及距离", {
                unit: "格",
                description: "触手能伸到多远，也是本招的射程；肢体越长够得越远。"
            }),
        /** 伸藤速度：基础 0.9 格/刻；速度每比 60 快 1 加 0.006（上限 +0.4）；夹在 0.6..1.6。 */
        pace: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.4)).clamp(0.6, 1.6).round(2),
            "伸藤速度", {
                unit: "格/刻",
                description: "青藤伸向目标的速度；越快，对手越没时间走开，画面里藤蔓也爬得越急。"
            }),
        /** 减速级数：基础 1；目标速度 ≥90 再加 1；攀缠 +1；夹在 1..3。 */
        speedStages: formula(
            F.base(1).plus(constrictSpeedNode.gte(90).times(F.const(1)))
                .plus(F.when(F.pref("latch", text("worldcombat.skill.constrict.preference.latch")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "减速级数", {
                unit: "级",
                description: "被缠住后下降的速度能力等级；**跑得快的目标掉得更多**，攀缠式再补一级。对其他战斗者落到移动速度属性上。"
            }),
        /** 束缚持续：基础 60 刻；等级每比 20 高 1 加 0.8 刻（上限 +40）；攀缠 ×1.5；夹在 40..160。 */
        bindTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(0.8).clamp(0, 40))
                .times(F.when(F.pref("latch", text("worldcombat.skill.constrict.preference.latch")), F.const(1.5), F.const(1)))
                .clamp(40, 160).round(0),
            "束缚持续", "带着 trapped 身份、被青藤缠住的时间；攀缠式留得明显更久。"),
        /** 定身时长：基础 20 刻；目标体重每比 300hg 重 1hg 加 0.01 刻（上限 +20）；攀缠 ×1.4；夹在 10..80。 */
        holdTicks: seconds(
            F.base(20).plus(constrictMassNode.minus(300).times(0.01).clamp(0, 20))
                .times(F.when(F.pref("latch", text("worldcombat.skill.constrict.preference.latch")), F.const(1.4), F.const(1)))
                .clamp(10, 80).round(0),
            "定身时长", "刚缠上时目标被按住、无法移动的时间；越重越难立刻挣脱。"),
        /** 再紧一道的概率：基础 0.3；等级每比 20 高 1 加 0.004（上限 +0.25）；夹在 0.1..0.6。 */
        gripChance: percent(
            F.base(0.3).plus(F.level().minus(20).times(0.004).clamp(0, 0.25)).clamp(0.1, 0.6),
            "再紧一道的概率", "命中后再压一级速度（并延长一点束缚）的概率；这是原生「有时降低速度」在即时战斗里的落点，读轨迹可见。"),
        /** 藤屑数量：基础 12；物攻每比 60 多 1 加 0.1（上限 +8）；等级每比 20 高 1 加 0.1（上限 +6）；夹在 8..30。 */
        notes: formula(
            F.base(12).plus(F.stat("attack").minus(60).times(0.1).clamp(-3, 8))
                .plus(F.level().minus(20).times(0.1).clamp(0, 6))
                .clamp(8, 30).round(0),
            "藤屑数量", {
                unit: "片",
                description: "青藤伸展与收紧时掉落的叶片碎屑数量，随物攻与等级增长；粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：基础 8 刻；速度每比 60 快 1 减 0.03 刻（上限 −3）；夹在 5..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手", "把触手从身体侧面伸出去、对准目标的时间。"),
        /** 收招：基础 7 刻；速度每比 60 快 1 减 0.02 刻（上限 −2）；攀缠 +2；夹在 5..13。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("latch", text("worldcombat.skill.constrict.preference.latch")), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "收招", "把触手收回来的收势；攀缠式要多拆一会儿。"),
        /** 冷却：基础 16 刻；速度每比 60 快 1 减 0.06 刻（上限 −4）；攀缠 +6；夹在 10..30。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.06).clamp(-4, 5))
                .plus(F.when(F.pref("latch", text("worldcombat.skill.constrict.preference.latch")), F.const(6), F.const(0)))
                .clamp(10, 30).round(0),
            "冷却", "两轮缠绕之间的等待；攀缠式把目标留得久，自己也缓得久。"),
        /** 按住所花的自身定身：基础 20 刻，攀缠式才用；夹在 10..50。 */
        selfHold: seconds(F.base(20).clamp(10, 50).round(0), "自身按住", "攀缠式缠住目标时，施法者分出肢体按住它、自己也无法移动的时间。")
    });

    stages("constrict", [
        { level: 30, values: { squeeze: 16 } },
        { level: 45, values: { squeeze: 20, speedStages: 2 } }
    ]);

    defineDamage("constrict", "squeeze", {}, { contact: true });

    describe("constrict", [
        { key: "description.0", values: ["squeeze", "reach", "pace"] },
        { key: "description.1", values: ["speedStages", "bindTicks", "holdTicks", "gripChance"] },
        { key: "latch.on", values: [], when: function (context) { return read(context.detail.values, ["latch"]) === true; } },
        { key: "latch.off", values: [], when: function (context) { return read(context.detail.values, ["latch"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.squeeze"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.squeeze", "tier.1.speedStages"] }
    ]);
}
