/**
 * 玩水 / watersport 的参数与数值来源。
 *
 * 原生事实：Water、变化、威力 —、命中 必中、PP 15、目标场上全体／entireField，持续 5 回合，
 *   期间减弱火属性招式的威力。
 * 核心念头：在脚下摊开一汪水，把整片地浇湿；湿了的人和脚下的水一起把火压下去。
 * 世界化：在选定的地面铺一片水洼（`WorldEffects.field`），洼里的活体——不分敌我——被泡湿，带上
 *   共享身份 soaked 与本招的 world_combat:status/watersport；带该身份的活体使出的火属性招式威力被乘上
 *   fireFactor，身上的火与灼伤被浇灭，水洼还按预算把地面上的明火一格一格沤熄。这是一片地，站着才有效。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach        基础 12 格 + 20 级起每级 +0.08，夹 10..18；能把水泼到多远的地面。
 *   puddleRadius 基础 3.2 格 + 身高 ×0.6 + 特攻 ×0.006，再乘铺法系数（漫开 ×1.3、沤湿 ×0.75），夹 2.2..8。
 *   puddleTicks  基础 220 刻 + 等级 ×2 + 特攻 ×0.35，再乘铺法系数（沤湿 ×1.35、漫开 ×0.72），夹 150..620。
 *   wetTicks     基础 80 刻 + 速度 ×0.5，夹 50..180；离开水洼后还湿着、火招仍被压的时长。
 *   fireFactor   基础 0.56 − 特防 ×0.0012，再乘铺法系数（沤湿 ×0.85、漫开 ×1），夹 0.3..0.7；火招威力系数。
 *   soakDensity  基础 20 点 + 特攻 ×0.1，夹 12..48；水洼里的水花与涟漪数量，粒子按它发射。
 *   quench       基础 5 + 速度 ×0.05，夹 3..12；每轮扫描沤熄的地面明火数。
 *   tempo        基础 12 刻 − 速度 ×0.03，加铺法修正（沤湿 +3、漫开 −2），夹 4..18；铺水的起手。
 *   aftercast    基础 7 刻 − 速度 ×0.01，夹 4..10；收招。
 *   recharge     基础 140 刻 − 速度 ×0.1，再乘铺法系数（沤湿 ×1.15、漫开 ×0.9），夹 80..190；两次铺水的等待。
 * 配置 deep 双向取舍：沤湿铺得小（半径 ×0.75）、湿得久（时长 ×1.35）、火压得更低（系数 ×0.85），代价是起手 +3、冷却 ×1.15；
 *   漫开铺得广（半径 ×1.3）、铺得快（起手 −2、冷却 ×0.9），代价是时长 ×0.72、火压得浅。
 */
namespace PokemonSkills {
    export const watersportId = "watersport";
    export const watersportEffect = "world_combat:watersport_soaked";
    export const watersportField = "world_combat:field/watersport";
    export const watersportScene = "world_combat:move_watersport";
    export const watersportStatus = "watersport";
    export const watersportSoaked = "soaked";
    export const watersportDrenchText = "world_combat.move.watersport.text.drench";
    export const watersportDouseText = "world_combat.move.watersport.text.douse";
    export const watersportSplashText = "world_combat.move.watersport.text.splash";

    actionParameters.define(watersportId, {
        reach: formula(
            F.base(12).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能把水泼到多远的地面；等级越高够得越远。" }),
        puddleRadius: formula(
            F.base(3.2).plus(F.body("height").times(0.6)).plus(F.stat("specialAttack").times(0.006))
                .times(F.when(F.pref("deep"), F.const(0.75), F.const(1.3)))
                .clamp(2.2, 8).round(2),
            "水洼半径", { unit: " 格", description: "水洼铺开多大一片地；身板越大、特攻越高越广，漫开 ×1.3、沤湿 ×0.75。" }),
        puddleTicks: seconds(
            F.base(220).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.35))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(0.72)))
                .clamp(150, 620).round(0),
            "水洼时长", "这片水洼留多久；沤湿更久（×1.35）、漫开更短（×0.72），等级与特攻会延长。"),
        wetTicks: seconds(
            F.base(80).plus(F.stat("speed").times(0.5)).clamp(50, 180).round(0),
            "湿透时长", "离开水洼后还湿着、火招仍被压多久；速度越快水在身上挂得越久。"),
        fireFactor: formula(
            F.base(0.56).minus(F.stat("specialDefence").times(0.0012))
                .times(F.when(F.pref("deep"), F.const(0.85), F.const(1))).clamp(0.3, 0.7).round(2),
            "火焰削弱", { unit: " 倍", format: function (value) { return "×" + (Math.round(value * 100) / 100); },
                description: "被泡湿者使出的火属性招式威力乘上的系数；特防越高压得越低，沤湿 ×0.85、漫开 ×1。" }),
        soakDensity: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.1)).clamp(12, 48).round(0),
            "水花数量", { unit: " 点", description: "水洼里的水花与涟漪数量；特攻越高铺得越密，粒子直接按它发射。" }),
        quench: formula(
            F.base(5).plus(F.stat("speed").times(0.05)).clamp(3, 12).round(0),
            "沤熄明火", { unit: " 格", description: "每轮扫描沤熄的地面明火数；速度越快跑得越勤。" }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("deep"), F.const(3), F.const(-2))).clamp(4, 18).round(0),
            "起手", "铺开一汪水需要多久；速度越快越短，沤湿 +3 刻、漫开 −2 刻。"),
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0),
            "收招", "铺水之后的收势。"),
        recharge: seconds(
            F.base(140).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(0.9))).clamp(80, 190).round(0),
            "冷却", "两次铺水之间的等待；沤湿 ×1.15、漫开 ×0.9。")
    });
    describe(watersportId, [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["puddleRadius", "puddleTicks"] },
        { key: "description.2", values: ["fireFactor", "wetTicks"] },
        { key: "description.3", values: ["soakDensity", "quench"] },
        { key: "description.4", values: ["tempo", "aftercast", "recharge"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.deep); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.deep); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
