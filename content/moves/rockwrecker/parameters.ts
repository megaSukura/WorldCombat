/**
 * 岩石炮 / rockwrecker 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：岩石、物理、威力 150、命中 90、PP 5、优先度 0、非接触、bullet 标记、
 * self mustrecharge（下一回合无法行动）。
 *
 * 翻译：保留「向对手发射巨大的岩石」，把原生的单体命中翻成即时战斗里**一发抛射的巨石**：
 * 巨石沿抛物线飞向选定落点，落地／撞上活体即碎裂，把落点周围一圈的敌人一起砸伤并向外顶开，
 * 落点只扬起短命的碎石尘（不替换地面方块），随后施法者扛石过力、力竭一段时间无法行动也无法移动。
 * 石头走抛物线，所以矮掩体不一定救得了目标，但高墙仍会在半途把它挡碎——这是它相对直线水柱与光柱的身份。
 * 选取为 `kind: "point"`：自由选落点空投；预告的可达点按这块石头的真实初速与重力算出，不保证穿高墙。
 * 数据分散：物攻决定威力、碎范围与顶开距离，体重决定巨石判断粗细与抛速（越重越慢、越好躲），
 * 速度决定起手，等级拾级抬升威力并决定碎石停留多久。配置 `crush`（碾碎）是真正的取舍：
 * 开启＝巨石更重、砸得更开、更疼，但飞行更慢、更容易被躲，力竭更久；关闭＝更轻更快、恢复更快、碎范围更小。
 *
 * 伤害段名 boulder：这一发随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("rockwrecker", {
        /** 巨石威力：物攻每比 60 多 1 加 1.1（上限 +85），等级每比 20 多 1 加 0.5（上限 +30），体重每比 60 多 1 加 0.1（上限 +18）；碾碎 ×1.05 / 轻投 ×0.95；夹在 95..250。 */
        boulder: formula(
            F.base(150)
                .plus(F.stat("attack").minus(60).times(1.1).clamp(-35, 85))
                .plus(F.level().minus(20).times(0.5).clamp(0, 30))
                .plus(F.body("weight").minus(60).times(0.1).clamp(-8, 18))
                .times(F.when(F.pref("crush"), F.const(1.05), F.const(0.95)))
                .clamp(95, 250).round(1),
            "巨石威力", {
                unit: "威力",
                description: "这一发巨石对落点范围内每个目标的基础威力；碾碎更重。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 投送距离：基础 10，物攻每比 60 多 1 加 0.035；夹在 8..18。 */
        reach: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.035).clamp(-2.5, 7)).clamp(8, 18).round(1),
            "投送距离", {
                unit: "格",
                description: "能把巨石抛到多远；物攻高的个体站得更远。"
            }),
        /** 抛射速度：基础 0.72，体重每比 60 多 1 减 0.0025（上限 −0.25），物攻每比 60 多 1 加 0.002；碾碎 ×0.85 / 轻投 ×1.12；夹在 0.45..1.2。 */
        speed: formula(
            F.base(0.72)
                .minus(F.body("weight").minus(60).times(0.0025).clamp(-0.1, 0.25))
                .plus(F.stat("attack").minus(60).times(0.002).clamp(-0.08, 0.2))
                .times(F.when(F.pref("crush"), F.const(0.85), F.const(1.12)))
                .clamp(0.45, 1.2).round(2),
            "抛射速度", {
                unit: "格/刻",
                description: "巨石出手的速度；越重越慢、越好躲，轻投更快。"
            }),
        /** 碎裂半径：基础 1.9，物攻每比 60 多 1 加 0.008；碾碎 ×1.3 / 轻投 ×0.85；夹在 1.2..4.0。 */
        radius: formula(
            F.base(1.9).plus(F.stat("attack").minus(60).times(0.008).clamp(-0.4, 1.2))
                .times(F.when(F.pref("crush"), F.const(1.3), F.const(0.85)))
                .clamp(1.2, 4.0).round(2),
            "碎裂半径", {
                unit: "格",
                description: "巨石落地后砸开多大一圈；也是画面里那圈碎石的范围。"
            }),
        /** 巨石判定半径：基础 0.45，体重每比 60 多 1 加 0.003；夹在 0.35..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("weight").minus(60).times(0.003).clamp(-0.08, 0.3)).clamp(0.35, 0.8).round(2),
            "巨石判定半径", {
                unit: "格",
                description: "飞行途中撞上活体即提前碎裂的判定半径；越重的个体抛出的石头越粗。"
            }),
        /** 顶开距离：基础 0.9，物攻每比 60 多 1 加 0.008，体重每比 60 多 1 加 0.003；夹在 0.3..2.4。 */
        shove: formula(
            F.base(0.9).plus(F.stat("attack").minus(60).times(0.008).clamp(-0.3, 0.8))
                .plus(F.body("weight").minus(60).times(0.003).clamp(-0.2, 0.6))
                .clamp(0.3, 2.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "碎裂时把落点周围的人沿背离方向顶开多远。"
            }),
        /** 起手：基础 12 tick，速度每比 60 快 1 减 0.02 tick；夹在 8..18 tick。 */
        charge: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02)).clamp(8, 18).round(),
            "起手", "扛起并瞄准巨石的准备时间。"),
        /** 力竭：基础 56 tick，物攻每比 60 多 1 加 0.35 tick（上限 +40），体重每比 60 多 1 加 0.15 tick（上限 +20）；碾碎 ×1.18 / 轻投 ×0.92；夹在 34..118 tick。 */
        exhaust: seconds(
            F.base(56)
                .plus(F.stat("attack").minus(60).times(0.35).clamp(-12, 40))
                .plus(F.body("weight").minus(60).times(0.15).clamp(-6, 20))
                .times(F.when(F.pref("crush"), F.const(1.18), F.const(0.92)))
                .clamp(34, 118).round(),
            "力竭", "抛出巨石后无法行动、无法移动的时间；越重、出力越大，恢复越久。"),
        /** 碎石停留：基础 60 tick，等级每比 20 高 1 加 1.2 tick；夹在 40..140 tick。 */
        rubbleTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(1.2).clamp(0, 80)).clamp(40, 140).round(),
            "碎屑停留", "落点扬起的临时碎石视觉停留多久；只影响画面，地面方块保持原材质。")
    });

    stages("rockwrecker", [
        { level: 38, values: { boulder: 166 } },
        { level: 58, values: { boulder: 184 } }
    ]);

    defineDamage("rockwrecker", "boulder", { defenceCoefficient: 0.0052, rationale: "一枚大石落在身上，护甲之外仍有一份实打实的质量冲击。" }, {});

    describe("rockwrecker", [
        { key: "description.0", values: ["boulder"] },
        { key: "description.1", values: ["radius", "reach"] },
        { key: "description.flight", values: ["collisionRadius"] },
        { key: "description.2", values: ["shove"] },
        { key: "description.3", values: ["speed","charge","exhaust"] }
    ]);
}
