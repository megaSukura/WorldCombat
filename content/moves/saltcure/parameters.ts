/**
 * 盐腌 / saltcure 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Rock、物理、威力 40、命中 100、PP 15、单体；
 *   命中后目标陷入 volatile saltcure：每回合扣最大生命 1/8，钢或水属性时扣 1/4。
 *
 * 世界化：这不是一次性的物理伤害，而是把**一身粗盐壳**摔在对手身上——命中那一下是物理伤害，
 *   之后盐粒嵌在皮肉里，每隔 `interval` 蛰掉一口（`brineShare` × 目标最大生命 × 脆弱系数）；
 *   钢/水（以及世界里湿透或披着金属甲）的身体更痛，系数翻倍。盐壳会一直留在身上直到时间走完或被清掉。
 *
 * 数值来源（不同参数读不同个体数据）：
 *   crust       命中那一下：基础 40，物攻每比 60 多 1 加 0.22，夹 24..80。
 *   brineShare  每口蛰痛：基础 12.5%%，浓卤 ×1.35，夹 6%%..22%%。
 *   saltTicks   盐壳时长：基础 140 刻，20 级起每级 +1.2，浓卤 ×0.7，夹 80..300。
 *   interval    蛰痛间隔：基础 45 刻，30 级起每级 -0.2，浓卤 ×0.85，夹 28..56。
 *   reach       投盐距离：基础 6 格，物攻每比 60 多 1 加 0.02，夹 5..9。
 *   saltSpeed   盐块速度：基础 0.75 格/刻，速度每比 60 快 1 加 0.004，夹 0.6..1.2。
 *   collision   判定半径：基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.1，夹 0.22..0.6。
 *   tempo       起手：基础 10 刻，速度每比 60 快 1 减 0.04，夹 7..13。
 *   wait        冷却：基础 60 刻，30 级起每级 -0.3，浓卤 +8，夹 45..90。
 *
 * 伤害段 crust 是命中那一下；之后的蛰痛按目标最大生命比例结算（brineShare）。
 * 配置 brine（浓卤）：每口更狠、间隔更密，但盐壳更短、冷却更长——爆发式熬盐 vs 长时间慢磨。
 */
namespace PokemonSkills {
    export const saltcureScene = "world_combat:move_saltcure";
    export const saltcureEffect = "world_combat:salt_cured";
    export const saltcureBind = "world_combat:saltcure_bind";
    export const saltcureBrittleFactor = 2;

    actionParameters.define("saltcure", {
        /** 命中威力：基础 40，物攻每比 60 多 1 加 0.22，夹 24..80。 */
        crust: formula(
            F.base(40).plus(F.stat("attack").minus(60).times(0.22)).clamp(24, 80).round(1),
            "命中威力", {
                unit: "威力",
                description: "命中那一下的基础物理威力；对手防御、相性与暴击在命中时另算。"
            }),
        /** 每口蛰痛：基础 12.5%%，浓卤 ×1.35，夹 6%%..22%%。 */
        brineShare: percent(
            F.base(0.125).times(F.when(F.pref("brine"), F.const(1.35), F.const(1))).clamp(0.06, 0.22).round(4),
            "每口蛰痛", "盐壳每隔一段按目标最大生命的这个比例蛰掉一口；钢/水或湿透/披甲的身体翻倍。"),
        /** 盐壳时长：基础 140 刻，20 级起每级 +1.2，浓卤 ×0.7，夹 80..300。 */
        saltTicks: seconds(
            F.base(140).plus(F.level().minus(20).times(1.2))
                .times(F.when(F.pref("brine"), F.const(0.7), F.const(1)))
                .clamp(80, 300).round(0),
            "盐壳时长", "盐壳在目标身上留多久；浓卤蛰得更狠，但留得更短。"),
        /** 蛰痛间隔：基础 45 刻，30 级起每级 -0.2，浓卤 ×0.85，夹 28..56。 */
        interval: seconds(
            F.base(45).minus(F.level().minus(30).times(0.2))
                .times(F.when(F.pref("brine"), F.const(0.85), F.const(1)))
                .clamp(28, 56).round(0),
            "蛰痛间隔", "每隔多久蛰一口；浓卤间隔更密。"),
        /** 投盐距离：基础 6 格，物攻每比 60 多 1 加 0.02，夹 5..9。 */
        reach: formula(
            F.base(6).plus(F.stat("attack").minus(60).times(0.02).clamp(-1, 3)).clamp(5, 9).round(1),
            "投盐距离", {
                unit: "格",
                description: "能把盐摔到多远；物攻越高甩得越远。"
            }),
        /** 盐块速度：基础 0.75 格/刻，速度每比 60 快 1 加 0.004，夹 0.6..1.2。 */
        saltSpeed: formula(
            F.base(0.75).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35)).clamp(0.6, 1.2).round(2),
            "盐块速度", {
                unit: "格/刻",
                description: "盐块飞行的速度；快个体扔得更急。"
            }),
        /** 判定半径：基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.1，夹 0.22..0.6。 */
        collision: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.22, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "盐块的横向判定半径；大个子判定更宽。"
            }),
        /** 起手：基础 10 刻，速度每比 60 快 1 减 0.04，夹 7..13。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4)).clamp(7, 13).round(0),
            "起手", "抓一把盐攥实需要多久；快个体更早脱手。"),
        /** 冷却：基础 60 刻，30 级起每级 -0.3，浓卤 +8，夹 45..90。 */
        wait: seconds(
            F.base(60).minus(F.level().minus(30).max(0).times(0.3))
                .plus(F.when(F.pref("brine"), F.const(8), F.const(0)))
                .clamp(45, 90).round(0),
            "冷却", "两次撒盐之间的等待；等级越高越熟练，浓卤更费。")
    });

    defineDamage("saltcure", "crust", {});

    describe("saltcure", [
        { key: "description.0", values: ["crust"] },
        { key: "description.1", values: ["brineShare", "saltTicks", "interval"] },
        { key: "description.2", values: ["reach", "saltSpeed", "collision"] },
        { key: "description.3", values: ["tempo", "wait"] }
    ]);
}
