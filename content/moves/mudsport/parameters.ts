/**
 * 玩泥巴 / mudsport 的参数与数值来源。
 *
 * 原生事实：Ground／变化／威力 —／命中 必中／PP 15／target all／场上 pseudoweather 5 回合，期间电属性招式
 *   被削弱（Gen 6+ 系数约 0.33）。
 * 世界化：把「5 回合的场地」翻成一片真的铺在地表的泥滩——施法者把泥甩开，泥浆贴地糊满一圈，
 *   地表方块换成泥；站在泥里的活体被糊上厚泥，使出的电属性招式被乘上 electricFactor，离开泥滩后还糊一阵。
 *   泥是材料：它压电，不像水那样灭火；两者是同一族的两种地面。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   tempo        起手：基础 12 刻 − 速度 ×0.03，加铺法修正（厚泥 +3、稀泥 −2），夹 4..18。
 *   aftercast    收招：基础 7 刻 − 速度 ×0.01，夹 4..10。
 *   recharge     冷却：基础 140 刻 − 速度 ×0.1，再乘铺法系数（厚泥 ×1.15、稀泥 ×0.9），夹 80..190。
 *   reach        施放距离：基础 12 格，20 级起每级 +0.08，夹 10..18。
 *   mudRadius    泥滩半径：基础 3.2 格 + 身高 ×0.6 + 特攻 ×0.006，再乘铺法系数，夹 2.2..8。
 *   mudTicks     泥滩时长：基础 220 刻 + 等级 ×2 + 特攻 ×0.35，再乘铺法系数，夹 150..620。
 *   coatTicks    糊泥余量：基础 80 刻 + 速度 ×0.5，夹 50..180；离开泥滩后电招仍被压的时长。
 *   electricFactor 电招削弱：基础 0.55 − 特防 ×0.0012，再乘铺法系数（厚泥 ×0.85），夹 0.3..0.7。
 *   mudDensity   泥花数量：基础 20 + 特攻 ×0.1，夹 12..48；直接驱动粒子数量。
 *   mudCells     盖泥格数：基础 8 + 速度 ×0.3，夹 4..24；每轮把几格地表换成泥。
 * 配置 thick 在「小而深、糊得久、压得低的厚泥」和「大而浅、起手与冷却都更短的稀泥」之间取舍。
 */
namespace PokemonSkills {
    export const mudsportId = "mudsport";
    export const mudsportField = "world_combat:field/mudsport";
    export const mudsportCoat = "world_combat:mudsport_coat";
    export const mudsportScene = "world_combat:move_mudsport";
    export const mudsportStatus = "mudsport";
    export const mudsportMud = "mud";
    export const mudsportCoatText = "world_combat.move.mudsport.text.coat";
    export const mudsportSplashText = "world_combat.move.mudsport.text.splash";

    actionParameters.define(mudsportId, {
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("thick"), F.const(3), F.const(-2))).clamp(4, 18).round(0),
            "起手", "摊开一片泥滩需要多久；速度越快越短，厚泥 +3 刻、稀泥 −2 刻。"),
        aftercast: seconds(F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0),
            "收招", "甩完泥之后的收势。"),
        recharge: seconds(
            F.base(140).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("thick"), F.const(1.15), F.const(0.9))).clamp(80, 190).round(0),
            "冷却", "两次铺泥之间的等待；厚泥 ×1.15、稀泥 ×0.9。"),
        reach: formula(F.base(12).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能把泥甩到多远的地面；等级越高够得越远。" }),
        mudRadius: formula(
            F.base(3.2).plus(F.body("height").times(0.6)).plus(F.stat("specialAttack").times(0.006))
                .times(F.when(F.pref("thick"), F.const(0.8), F.const(1.3)))
                .clamp(2.2, 8).round(2),
            "泥滩半径", { unit: " 格", description: "泥滩铺开多大一片地；身板越大、特攻越高越广，厚泥 ×0.8、稀泥 ×1.3。" }),
        mudTicks: seconds(
            F.base(220).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.35))
                .times(F.when(F.pref("thick"), F.const(1.3), F.const(0.72)))
                .clamp(150, 620).round(0),
            "泥滩时长", "这片泥滩留多久；厚泥更久（×1.3）、稀泥更短（×0.72），等级与特攻会延长。"),
        coatTicks: seconds(F.base(80).plus(F.stat("speed").times(0.5)).clamp(50, 180).round(0),
            "糊泥余量", "离开泥滩后还糊着泥、电招仍被压多久；速度越快泥在身上挂得越久。"),
        electricFactor: formula(
            F.base(0.55).minus(F.stat("specialDefence").times(0.0012))
                .times(F.when(F.pref("thick"), F.const(0.85), F.const(1))).clamp(0.3, 0.7).round(2),
            "电招削弱", { unit: " 倍", format: function (value) { return "×" + (Math.round(value * 100) / 100); },
                description: "被糊泥者使出的电属性招式威力乘上的系数；特防越高压得越低，厚泥 ×0.85、稀泥 ×1。" }),
        mudDensity: formula(F.base(20).plus(F.stat("specialAttack").times(0.1)).clamp(12, 48).round(0),
            "泥花数量", { unit: " 点", description: "泥滩里翻起的泥花数量；特攻越高铺得越密，粒子直接按它发射。" }),
        mudCells: formula(F.base(8).plus(F.stat("speed").times(0.3)).clamp(4, 24).round(0),
            "盖泥格数", { unit: " 格", description: "每轮把几格地表换成泥；速度越快翻得越多。" })
    });
    describe(mudsportId, [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["mudRadius", "mudTicks"] },
        { key: "description.2", values: ["electricFactor", "coatTicks"] },
        { key: "description.3", values: ["mudDensity", "mudCells"] },
        { key: "description.4", values: ["tempo", "aftercast", "recharge"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
