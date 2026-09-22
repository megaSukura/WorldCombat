/**
 * 百万吨重踢 / megakick 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：格斗、物理、威力 120、命中 75、PP 5、优先度 0、接触、无次要效果（215 位学习者）。
 * 翻译：保留「力大无穷的一记重踢把对手踢飞」，把它落成即时战斗里的一次**整身冲撞式的踢飞**：
 * 拉满的起手 → 贴地冲进去 → 命中即把目标沿踢击方向抛飞。命中的 75 在即时战斗里不是掷一次的骰子，
 * 而是**慢而长的起手**与**踢空后收不住的额外冲程**——对手有真实的余地让开，让开就是这一招的代价。
 *
 * 与本族分开：踢倒是贴身扫支撑腿、按目标体重定威力；下盘踢是原地低弧按速度掉速；木槌是自上而下砸地。
 * 百万吨重踢是唯一的**大起手、直线突进、把单体目标抛飞**的一招，玩家凭「整条腿拉满再撞出去、人飞起来」认出它。
 *
 * 数据分散（每项读不同的精灵数据；目标侧用目标事实）：
 *   kick       踢击威力：物攻给狠度、体重给「整副身体压上去」的分量、等级拾级抬升。
 *   lunge      突进距离：速度给起步、身高给腿长（步幅）。
 *   pace       突进速度：施法者速度，越快越难被让开。
 *   collisionRadius 判定半径：碰撞箱高度；腿越长、身架越大，踢面越宽。
 *   launchBack 击飞距离：**施法者物攻**给踢飞的力，**目标体重**把飞出去的距离压下来——越重越飞不远。
 *   launchUp   击飞高度：施法者体重的分量；踢飞式抬得更高。
 *   overshoot  踢空冲程：速度给动势；踢飞式收势更远。踢空要多吃这一段，是这一招真正的风险。
 *   haul/aftercast/recharge 起手／收招／冷却：速度决定快慢，身高给更长的抬腿；踢飞式收得更久。
 *
 * 配置 launch（踢飞式，默认开）双向取舍：开＝把目标抛得更远更高，但单发威力略低、收招与冷却更久；
 * 关（砸穿式）＝一记更重、更省时、几乎不抛飞但冲击更实的重踢。两向各有局面（踢出阵型 vs 单点速伤）。
 *
 * 伤害段 kick 与参数同名；属性与分类沿用原生 Fighting／物理，对手防御、相性与暴击在命中时由共享结算乘入。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const megakickMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("megakick", {
        /** 踢击威力：基础 120；物攻每比 60 多 1 加 0.9（上限 +62）；体重每比 600 多 1 加 0.02（上限 +30）；等级每比 20 高 1 加 0.32（上限 +24）；踢飞 ×0.9 / 砸穿 ×1.08；夹在 85..230。 */
        kick: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.9).clamp(-28, 62))
                .plus(F.body("weight").minus(600).times(0.02).clamp(-6, 30))
                .plus(F.level().minus(20).times(0.32).clamp(0, 24))
                .times(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(0.9), F.const(1.08)))
                .clamp(85, 230).round(1),
            "踢击威力", {
                unit: "威力",
                description: "整条腿撞穿对手的基础威力；物攻给出踢腿的狠度，体重给出整副身体压上去的分量，踢飞式把一部分力换成了抛飞。对手防御、相性与暴击在命中时另算。"
            }),
        /** 突进距离：基础 2.0 格；速度每比 60 快 1 加 0.02（上限 +1.0）；身高每比 1.4 高 1 格加 0.45（上限 +0.9）；踢飞 +0.5；夹在 1.6..4.2。 */
        lunge: formula(
            F.base(2.0).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.5, 1.0))
                .plus(F.body("height").minus(1.4).times(0.45).clamp(-0.3, 0.9))
                .plus(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(0.5), F.const(0)))
                .clamp(1.6, 4.2).round(2),
            "突进距离", {
                unit: "格",
                description: "从起步到踢中的总位移，也是本招的射程基准；速度给起步、腿长给步幅，踢飞式迈得更远。"
            }),
        /** 突进速度：基础 0.46 格/刻；速度每比 60 快 1 加 0.004（上限 +0.26）；夹在 0.34..0.85。 */
        pace: formula(
            F.base(0.46).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.08, 0.26)).clamp(0.34, 0.85).round(2),
            "突进速度", {
                unit: "格/刻",
                description: "撞出去时每刻前进的距离；越快越难被让开，也是画面里速度线的疏密。"
            }),
        /** 判定半径：基础 0.55 格；身高每比 1.4 高 1 格加 0.14；夹在 0.4..0.95。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "撞腿能扫到的横向半径；胸腹越高的个体腿越长、踢面越宽。"
            }),
        /** 击飞距离：基础 1.7 格；物攻每比 60 多 1 加 0.03（上限 +2.0）；目标体重每比 300hg 重 1hg 减 0.0012（最多减 1.4）；踢飞 ×1.3 / 砸穿 ×0.45；夹在 0.4..4.0。 */
        launchBack: formula(
            F.base(1.7)
                .plus(F.stat("attack").minus(60).times(0.03).clamp(-0.5, 2.0))
                .minus(megakickMassNode.minus(300).times(0.0012).clamp(0, 1.4))
                .times(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(1.3), F.const(0.45)))
                .clamp(0.4, 4.0).round(2),
            "击飞距离", {
                unit: "格",
                description: "命中后把目标沿踢击方向抛出去多远；物攻越强踢得越远，**目标越重飞得越近**，踢飞式抬得最远。"
            }),
        /** 击飞高度：基础 0.55 格；施法者体重每比 600hg 多 1hg 加 0.0006（上限 +0.3）；踢飞 ×1.35 / 砸穿 ×0.5；夹在 0.2..1.05。 */
        launchUp: formula(
            F.base(0.55).plus(F.body("weight").minus(600).times(0.0006).clamp(-0.15, 0.3))
                .times(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(1.35), F.const(0.5)))
                .clamp(0.2, 1.05).round(2),
            "击飞高度", {
                unit: "格",
                description: "把目标挑离地面多高；整副身体越沉压得越有劲，踢飞式挑得更高。"
            }),
        /** 踢空冲程：基础 1.1 格；速度每比 60 快 1 加 0.01（上限 +0.7）；踢飞 ×1.2 / 砸穿 ×0.8；夹在 0.6..2.4。 */
        overshoot: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.7))
                .times(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(1.2), F.const(0.8)))
                .clamp(0.6, 2.4).round(2),
            "踢空冲程", {
                unit: "格",
                description: "踢空后收不住、继续多冲出去的距离；速度越快动势越大。这一段是踢空真正的代价。"
            }),
        /** 起手：基础 14 刻；速度每比 60 快 1 减 0.03 刻（上限 −5）；身高每比 1.4 高 1 格加 1.5 刻（上限 +3）；夹在 9..20。 */
        haul: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 5))
                .plus(F.body("height").minus(1.4).times(1.5).clamp(0, 3))
                .clamp(9, 20).round(0),
            "起手", "把一条腿高抬后撤、身体后仰拉满的时间；腿越长抬得越久，这段时间对手能看清并让开。"),
        /** 收招：基础 12 刻；速度每比 60 快 1 减 0.03 刻（上限 −4）；踢飞 +2；夹在 8..20。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-4, 5))
                .plus(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(2), F.const(0)))
                .clamp(8, 20).round(0),
            "收招", "把踢出去的腿收回来、重新站稳的收势；踢飞式收得更久。"),
        /** 冷却：基础 40 刻；速度每比 60 快 1 减 0.06 刻（上限 −10）；踢飞 +6；夹在 28..64。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("launch", text("worldcombat.skill.megakick.preference.launch")), F.const(6), F.const(0)))
                .clamp(28, 64).round(0),
            "冷却", "两次重踢之间的等待；PP 只有 5，这一招本就该留到要一锤定音的时候。")
    });

    stages("megakick", [
        { level: 30, values: { kick: 138 } },
        { level: 50, values: { kick: 158, launchBack: 2.4 } }
    ]);

    defineDamage("megakick", "kick", { defenceCoefficient: 0.0054,
        rationale: "整副身体的分量压过护甲，防御减伤更弱，让物攻、体重与等级差在场上更明显。" }, { contact: true });

    describe("megakick", [
        { key: "description.0", values: ["kick", "collisionRadius"] },
        { key: "description.1", values: ["lunge", "pace", "overshoot"] },
        { key: "description.2", values: ["launchBack", "launchUp"] },
        { key: "launch.on", values: [], when: function (context) { return read(context.detail.values, ["launch"]) !== false; } },
        { key: "launch.off", values: [], when: function (context) { return read(context.detail.values, ["launch"]) === false; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick", "tier.1.launchBack"] }
    ]);
}
