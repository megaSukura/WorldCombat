/**
 * 重磅冲撞 / heavyslam 的参数与伤害段。
 *
 * 原生事实：Steel、物理、命中 100、PP 10、接触、威力按**自己体重 / 对手体重**的比值分档
 * （≥5 倍 120、≥4 倍 100、≥3 倍 80、≥2 倍 60、其余 40）（Cobblemon 1.8，99 位学习者）。
 * 翻译：把自己整副钢甲身躯当成武器——跃起、翻身、以体重砸落。**分量比才是这招的主角**：自己越压过对手，越狠；
 * 落点一圈冲击把周围一起震开，地面留下一个短命的坑。
 *
 * 数据分散（每项读不同的精灵数据；比较项同时读双方）：
 *   crush      冲撞威力：**自身／目标体重比**给出主曲线 + 施法者物攻（下砸的狠度）+ 自身绝对体重（再压一层）。
 *   landRadius 落点半径：施法者碰撞箱高度 + 体重；配置 anchor 收窄。
 *   shove      顶开距离：自身体重 + 体重比；配置 anchor 降低。
 *   hop        跃起高度：速度。
 *   airTicks   腾空时长：速度。
 *   leap       跳跃距离：速度 + 体重；配置 anchor 收短。
 *   collisionRadius 判定半径：碰撞箱高度。
 *   craterRadius 坑半径：体重；配置 anchor 略大。
 *   craterTicks 坑留存：等级。
 *   prepare/recover/cooldown 起手／收招／冷却：速度；配置 anchor 另加。
 *
 * 配置 `anchor`（沉坠式，默认关）双向取舍：开＝跃得近、单点威力更高、坑更大，但顶开更少、收招与冷却更久；
 * 关＝冲跳式，跃得远、顶开更开，单发更轻。两向各有局面（单点行刑 vs 群控开路）。
 *
 * 伤害段 `crush` 与参数同名；属性与分类沿用原生 Steel／物理，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    /** 目标与自身质量的比较用值：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const heavyslamMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    /** 自身体重 / 目标体重，夹在 1..5（对应原生分档区间）。 */
    const heavyslamRatio: Formula.Node = F.body("weight").div(heavyslamMassNode.max(1)).clamp(1, 5).as("体重比");

    actionParameters.define("heavyslam", {
        /** 冲撞威力：基础 40；体重比每超过 2 倍 1 点加 26.67（上限 +80）；物攻每比 60 多 1 加 0.25（上限 +24）；体重每比 100kg 多 1kg 加 0.4（上限 +18）；沉坠 ×1.12；夹在 36..160。 */
        crush: formula(
            F.base(40)
                .plus(heavyslamRatio.minus(2).clamp(0, 3).times(26.67))
                .plus(F.stat("attack").minus(60).times(0.25).clamp(-8, 24))
                .plus(F.body("weight").minus(1000).times(0.004).clamp(-6, 18))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(1.12), F.const(1)))
                .clamp(36, 160).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "整副身躯砸下的基础威力；**自己比对手越重越狠**（体重比是主曲线），物攻给出下砸的狠度、绝对体重再压一层。命中时的防御、相性与暴击另算，双方体重只有命中时才互相读到。"
            }),
        /** 落点半径：基础 1.8 格；碰撞箱每比 1.4 高 1 格加 0.6（上限 +1.0）；体重每比 100kg 多 1kg 加 0.02（上限 +0.5）；沉坠 ×0.85；夹在 1.5..3.2。 */
        landRadius: formula(
            F.base(1.8).plus(F.body("height").minus(1.4).times(0.6).clamp(0, 1.0))
                .plus(F.body("weight").minus(1000).times(0.02).clamp(0, 0.5))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(0.85), F.const(1)))
                .clamp(1.5, 3.2).round(2),
            "落点半径", {
                unit: "格",
                description: "落地冲击罩住的范围；身板越大、越重砸出的范围越大，沉坠式更集中。"
            }),
        /** 顶开距离：基础 0.8 格；体重每比 100kg 多 1kg 加 0.04（上限 +1.4）；体重比每超过 1 倍 1 点加 0.15（上限 +0.6）；沉坠 ×0.8；夹在 0.4..2.6。 */
        shove: formula(
            F.base(0.8).plus(F.body("weight").minus(1000).times(0.04).clamp(-0.2, 1.4))
                .plus(heavyslamRatio.minus(1).clamp(0, 4).times(0.15))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(0.8), F.const(1)))
                .clamp(0.4, 2.6).round(2),
            "顶开距离", {
                unit: "格",
                description: "落地把范围里目标沿背离方向推开多远；越重、压过对手越多推得越开。"
            }),
        /** 跃起高度：基础 1.8 格；速度每比 60 快 1 加 0.01（上限 +0.8）；夹在 1.2..3.0。 */
        hop: formula(
            F.base(1.8).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.3, 0.8)).clamp(1.2, 3.0).round(2),
            "跃起高度", {
                unit: "格",
                description: "腾空到最高点的高度；动作快的个体跳得更高。"
            }),
        /** 腾空时长：基础 12 刻；速度每比 60 快 1 减 0.05 刻（上限 ±4）；夹在 8..18。 */
        airTicks: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 4)).clamp(8, 18).round(0),
            "腾空时长", "从起跳到砸地的时间；快脚落地更干脆，留给对手的闪避窗口更短。"),
        /** 跳跃距离：基础 3.6 格；速度每比 60 快 1 加 0.03（上限 +1.8）；体重每比 100kg 多 1kg 加 0.02（上限 +1.0）；沉坠 ×0.75；夹在 2.6..6.0。 */
        leap: formula(
            F.base(3.6).plus(F.stat("speed").minus(60).times(0.03).clamp(-0.8, 1.8))
                .plus(F.body("weight").minus(1000).times(0.02).clamp(0, 1.0))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(0.75), F.const(1)))
                .clamp(2.6, 6.0).round(2),
            "跳跃距离", {
                unit: "格",
                description: "最多能从多远跃起砸落；驱动目标接受范围。沉坠式起得更近。"
            }),
        /** 判定半径：基础 0.55 格；碰撞箱每比 1.4 高 1 格加 0.16；夹在 0.4..0.95。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.16)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "砸中活体时的横向判定半径；身板越大越宽。"
            }),
        /** 坑半径：基础 1.4 格；体重每比 100kg 多 1kg 加 0.035（上限 +1.2）；沉坠 ×1.1；夹在 1.2..3.0。 */
        craterRadius: formula(
            F.base(1.4).plus(F.body("weight").minus(1000).times(0.035).clamp(0, 1.2))
                .times(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(1.1), F.const(1)))
                .clamp(1.2, 3.0).round(2),
            "坑半径", {
                unit: "格",
                description: "地面被砸碎的范围；越重砸得越大，沉坠式更狠。坑会自己平复。"
            }),
        /** 坑留存：基础 100 刻；等级每高 1 级加 2；夹在 80..260。 */
        craterTicks: seconds(
            F.base(100).plus(F.level().minus(20).times(2)).clamp(80, 260).round(0),
            "坑留存", "砸碎的地面留多久；到期原方块回来。"),
        /** 起手：基础 9 刻；速度每比 60 快 1 减 0.04 刻（上限 −3）；沉坠 +2；夹在 5..15。 */
        prepare: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.04).clamp(-1, 3))
                .plus(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "沉肩压腿、蓄到能跃起的时间；沉坠式起得更慢。"),
        /** 收招：基础 12 刻；速度每比 60 快 1 减 0.03 刻（上限 −4）；沉坠 +3；夹在 6..20。 */
        recover: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 4))
                .plus(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(3), F.const(0)))
                .clamp(6, 20).round(0),
            "收招", "落地后重新站稳的收势；沉坠式更久。"),
        /** 冷却：基础 46 刻；速度每比 60 快 1 减 0.06 刻（上限 −8）；沉坠 +6；夹在 30..72。 */
        cooldown: seconds(
            F.base(46).minus(F.stat("speed").minus(60).times(0.06).clamp(-2, 8))
                .plus(F.when(F.pref("anchor", text("worldcombat.skill.heavyslam.preference.anchor")), F.const(6), F.const(0)))
                .clamp(30, 72).round(0),
            "冷却", "两次重磅冲撞之间的等待；沉坠式缓得更久。")
    });

    stages("heavyslam", [
        { level: 30, values: { crush: 62 } },
        { level: 50, values: { crush: 80, landRadius: 2.2 } }
    ]);

    defineDamage("heavyslam", "crush", { defenceCoefficient: 0.005 }, { contact: true });

    describe("heavyslam", [
        { key: "description.0", values: ["crush","landRadius"] },
        { key: "description.1", values: ["leap", "hop", "airTicks", "shove"] },
        { key: "description.2", values: ["craterRadius","craterTicks"] },
        { key: "anchor.on", values: [], when: function (context) { return read(context.detail.values, ["anchor"]) === true; } },
        { key: "anchor.off", values: [], when: function (context) { return read(context.detail.values, ["anchor"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crush", "tier.1.landRadius"] }
    ]);
}
