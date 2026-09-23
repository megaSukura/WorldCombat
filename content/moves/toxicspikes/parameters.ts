/**
 * 毒菱 / toxicspikes 的参数。
 *
 * 原生事实：Poison／变化／威力 0／命中 必中／PP 20／target foeSide；出场即触发，最多叠 2 层。
 *   踩到的生物（必须落地）：毒属性会把整片毒菱**吸掉**；钢属性与免疫者不受影响；1 层中毒、2 层剧毒。
 *
 * 世界化：把「在对手脚下撒毒菱」翻成**一片留在世界地面上的毒菱**——施法者把一把带毒的菱角抛到选定的地面，
 *   落地插成毒菱阵（`WorldEffects.field`，规则 `world_combat:hazard/toxicspikes`）；贴地的非友方踏进来就中毒，
 *   留在里面毒素持续被维持；同一片地上再撒一次叠到第二层，踩到的就变成剧毒。毒属性的身体走进来会把整片
 *   毒菱吸收掉（不中毒、毒菱消失），钢属性与共享状态门禁挡住的目标则直接穿过。它是本组唯一**上状态、且会被
 *   特定属性反吃**的陷阱。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   patchRadius   毒菱阵半径：体宽（撒得开）＋特攻（毒更足）；烈毒 ×0.8 / 缓和 ×1.15；夹 1.4..4.0。
 *   patchTicks    毒菱存续时长：等级 ＋ HP；烈毒 ×0.8 / 缓和 ×1.15；夹 120..440。
 *   statusTicks   中毒/剧毒时长：特攻（毒性越足越久）；烈毒 ×1.4 / 缓和 ×0.8；夹 120..420。
 *   fumes         毒气颗粒数：特攻；它同时是画面里毒气与毒泡的数量。
 *   reach         抛撒距离：速度与等级；夹 6..12，也是实际射程。
 *   throwSpeed    抛撒速度：速度。
 *   maxLayers     最多叠几层（原生 2），固定。
 *   tempo         起手：速度；烈毒 +2 刻。
 *   recharge      冷却：速度；烈毒 ×1.1 / 缓和 ×0.95。
 *
 * 配置 `virulent`（烈毒）双向取舍：开启＝中毒时长 ×1.4，但毒菱阵收窄到 0.8 倍、存在更短、起手 +2 刻、冷却更长，
 *   用来让一个目标中毒得久；关闭＝缓和式，毒菱阵铺大 1.15 倍、存在更久、出手更快，代价是毒性 ×0.8、更短。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const toxicspikesId = "toxicspikes";
    export const toxicspikesRule = "world_combat:hazard/toxicspikes";
    export const toxicspikesScene = "world_combat:move_toxicspikes";
    export const toxicspikesLayText = "world_combat.move.toxicspikes.text.lay";
    export const toxicspikesPoisonText = "world_combat.move.toxicspikes.text.poison";
    export const toxicspikesAbsorbText = "world_combat.move.toxicspikes.text.absorb";

    actionParameters.define(toxicspikesId, {
        patchRadius: formula(
            F.base(2.2)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.3, 0.6))
                .times(F.when(F.pref("virulent"), F.const(0.8), F.const(1.15)))
                .clamp(1.4, 4.0).round(2),
            "毒菱阵半径", {
                unit: "格",
                description: "一把毒菱落地插开的覆盖半径；体型越宽、特攻越高铺得越开，烈毒式收窄。它也是指示圈与实际判定半径。"
            }),
        patchTicks: seconds(
            F.base(220).plus(F.level().minus(25).times(2.4).clamp(0, 80)).plus(F.stat("hp").minus(60).times(0.25).clamp(-16, 34))
                .times(F.when(F.pref("virulent"), F.const(0.8), F.const(1.15)))
                .clamp(120, 440).round(0),
            "毒菱存续时长", "一片毒菱在世界上留多久；等级与 HP 越高留得越久，缓和式更耐放。"),
        statusTicks: seconds(
            F.base(220).plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-24, 80))
                .times(F.when(F.pref("virulent"), F.const(1.4), F.const(0.8)))
                .clamp(120, 420).round(0),
            "中毒时长", "踩到的目标中毒（第二层为剧毒）持续多久；特攻越高毒得越久，烈毒式更长。"),
        fumes: formula(
            F.base(16).plus(F.stat("specialAttack").times(0.14)).clamp(12, 40).round(0),
            "毒气颗粒数", {
                unit: "点",
                description: "一片毒菱里冒出的毒气与毒泡数量；特攻越高越浓，也是画面里毒气粒子的数量。"
            }),
        reach: formula(
            F.base(8)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(25).times(0.04).clamp(0, 2))
                .clamp(6, 12).round(2),
            "抛撒距离", {
                unit: "格",
                description: "能把毒菱撒到多远的地面；速度与等级越高够得越远。它也是本招的实际射程。"
            }),
        throwSpeed: formula(
            F.base(1).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.8, 1.5).round(2),
            "抛撒速度", {
                unit: "格/刻",
                description: "毒菱脱手飞向落点的速度；速度快的个体抛得更急，目标更难在落地前走开。"
            }),
        maxLayers: hidden(2),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("virulent"), F.const(2), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "把毒菱拢好再撒出去的时间；速度越快起手越短，烈毒 +2 刻。"),
        recharge: seconds(
            F.base(95).minus(F.stat("speed").minus(60).times(0.1).clamp(-6, 14))
                .times(F.when(F.pref("virulent"), F.const(1.1), F.const(0.95)))
                .clamp(50, 160).round(0),
            "冷却", "两次撒毒菱之间的等待；速度越快回得越快，烈毒 ×1.1、缓和 ×0.95。")
    });

    stages(toxicspikesId, [
        { level: 40, values: { statusTicks: 260, patchRadius: 2.6 } }
    ]);

    describe(toxicspikesId, [
        { key: "description.0", values: ["statusTicks","patchRadius"] },
        { key: "description.1", values: ["patchTicks"] },
        { key: "description.2", values: [] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["virulent"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["virulent"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level","tier.0.statusTicks","tier.0.patchRadius"] }
    ]);
}
