/**
 * 疯狂植物 / frenzyplant 的专属参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：草、特殊、威力 150、命中 90、PP 5、优先度 0、非接触、
 * self mustrecharge（下一回合无法行动）。
 *
 * 翻译：保留「用大树的根须摔打对手」，把原生的单体命中翻成即时战斗里**从目标脚下窜出的根须环**：
 * 施法者把生长灌进选定的那块地，巨木根须自地面向上窜出一圈再抽下；命中的活体各挨一记 `bloom` 伤害，
 * 根须褪去后那块地短暂留下苔藓与生根土。「下一回合无法动弹」翻成真实的力竭窗口
 * `world_combat:status/mustrecharge`（本单元效果）：无法行动、无法移动。
 * 数据分散：特攻决定威力、爆发半径与能及的距离，等级拾级抬升威力并决定根须缠住目标的时长，
 * 体型（体重与身高）决定根须窜起多高——越重的个体拔起的根越粗壮。配置 `grip`（缠根）是真正的取舍：
 * 开启＝根须铺得更开、命中后把目标定在原地，但单伤下降、力竭更久；关闭＝收得更紧、单伤更高、恢复更快，
 * 但不缠人。
 *
 * 伤害段名 bloom：这一圈随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("frenzyplant", {
        /** 根须威力：特攻每比 60 多 1 加 1.0（上限 +80），等级每比 20 多 1 加 0.55（上限 +30）；缠根 ×0.9 / 紧束 ×1.06；夹在 95..250。 */
        bloom: formula(
            F.base(150)
                .plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-35, 80))
                .plus(F.level().minus(20).times(0.55).clamp(0, 30))
                .times(F.when(F.pref("grip"), F.const(0.9), F.const(1.06)))
                .clamp(95, 250).round(1),
            "根须威力", {
                unit: "威力",
                description: "这一圈根须对每个命中目标的基础威力；缠根铺得更开、单伤略轻。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 爆发半径：基础 2.4，特攻每比 60 多 1 加 0.012；缠根 ×1.25 / 紧束 ×1.0；夹在 1.6..5.0。 */
        radius: formula(
            F.base(2.4).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.6, 1.4))
                .times(F.when(F.pref("grip"), F.const(1.25), F.const(1.0)))
                .clamp(1.6, 5.0).round(2),
            "爆发半径", {
                unit: "格",
                description: "落点窜出根须的范围半径；也是画面里那圈根须铺开的范围。"
            }),
        /** 施放距离：基础 10，特攻每比 60 多 1 加 0.045；夹在 9..18。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.045).clamp(-3, 8)).clamp(9, 18).round(1),
            "施放距离", {
                unit: "格",
                description: "能把这圈根须种到多远的落点；特攻高的个体够得更远。"
            }),
        /** 窜起高度：基础 3.2，体重每比 60 多 1 加 0.02，身高每比 1.4 高 1 格加 0.4；夹在 2.4..5.5。 */
        rise: formula(
            F.base(3.2).plus(F.body("weight").minus(60).times(0.02).clamp(-0.6, 1.4))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.5, 1.6))
                .clamp(2.4, 5.5).round(2),
            "窜起高度", {
                unit: "格",
                description: "根须从地里窜起多高；越重、越高的个体拔起的根越粗壮，画面里根须竖得越高。"
            }),
        /** 缠足时长：基础 40 tick，等级每比 20 高 1 加 1.5 tick；夹在 30..100 tick。 */
        snareTicks: seconds(
            F.base(40).plus(F.level().minus(20).times(1.5).clamp(0, 60)).clamp(30, 100).round(),
            "缠足时长", "缠根开启时，被命中的目标被根须按在原地、无法移动的时间。"),
        /** 起手：基础 12 tick，速度每比 60 快 1 减 0.03 tick；夹在 8..18 tick。 */
        charge: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03)).clamp(8, 18).round(),
            "起手", "把生长灌进选定地面的准备时间。"),
        /** 力竭：基础 58 tick，特攻每比 60 多 1 加 0.4 tick（上限 +42），体重每比 60 多 1 加 0.06 tick；缠根 ×1.15 / 紧束 ×0.94；夹在 34..116 tick。 */
        exhaust: seconds(
            F.base(58)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-14, 42))
                .plus(F.body("weight").minus(60).times(0.06).clamp(-6, 18))
                .times(F.when(F.pref("grip"), F.const(1.15), F.const(0.94)))
                .clamp(34, 116).round(),
            "力竭", "根须褪去后无法行动、无法移动的时间；铺得越开、身体越重，恢复越久。"),
        /** 留痕时长：基础 60 tick，等级每比 20 高 1 加 1.0 tick；夹在 40..140 tick。 */
        leaves: seconds(
            F.base(60).plus(F.level().minus(20).times(1.0).clamp(0, 80)).clamp(40, 140).round(),
            "留痕时长", "根须褪去后，那块地上苔藓与生根土停留多久；到期原方块回来。")
    });

    stages("frenzyplant", [
        { level: 36, values: { bloom: 166 } },
        { level: 56, values: { bloom: 184 } }
    ]);

    defineDamage("frenzyplant", "bloom", { defenceCoefficient: 0.0044, rationale: "根须是自下而上的重击，对特殊防御的穿透略强。" }, {});

    describe("frenzyplant", [
        { key: "description.0", values: ["bloom"] },
        { key: "description.1", values: ["radius", "reach"] },
        { key: "description.2", values: ["rise", "leaves"] },
        { key: "description.3", values: ["exhaust", "snareTicks"] }
    ]);
}
