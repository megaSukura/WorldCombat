/**
 * 撒菱 / spikes 的参数与伤害段。
 *
 * 原生事实：Ground／变化／威力 0／命中 必中／PP 20／target foeSide（对手一侧场地）。出场即触发，
 *   按层数结算 `[0,3,4,6][layers] × maxhp / 24`（1 层 1/8、2 层 1/6、3 层 1/4 最大生命）；只有
 *   落地（isGrounded）的生物触发，未被踩到的撒菱一直留在对手一侧。
 *
 * 世界化：把「在对手脚下撒一层菱」翻成**一片留在世界地面上的尖刺**——施法者把一把碎片抛到选定的地面，
 *   落地插成一圈尖刺（`WorldEffects.field`，规则 `world_combat:hazard/spikes`）；踏进来的那一刻被扎一次，
 *   之后必须真的在刺地里走出 `step`（约 0.9 格）才会再被扎一次，原地站着不再周期掉血；同一片地上再撒一次
 *   就多叠一层，层数直接放大每次扎伤。只有贴地（grounded）且脚部与刺地同一层的生物会被扎，飞在半空的生物
 *   从上方过去。它是本组四招里唯一会**层数叠加**、且按步伐而非时间结算的伤害陷阱。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   pierce         每层刺伤威力：基础 20 + 物攻偏移 + 等级偏移；密布 ×1.2 / 撒布 ×0.9；夹 14..64。
 *   layerGain      每多叠一层的伤害增量（占每层威力的比例）：物攻偏移；密布 ×1.15；夹 0.2..0.6。
 *   patchRadius    尖刺圈半径：体宽（撒得开）＋物攻（撒得远）；密布 ×0.75 / 撒布 ×1.2；夹 1.5..4.2。
 *   patchTicks     尖刺存在时长：等级（越熟练留得越久）＋HP（越结实越久）；夹 140..460。
 *   treadInterval  两次踩伤之间的最短间隔：速度（越快扎得越密）；密布 ×0.85；夹 12..34。
 *   step           必须实际走出的水平距离：几何常量 0.9 格；原地站着不再被扎，只有真正跨过这段才再触发。
 *   reach          抛撒距离：速度与等级；夹 6..12，也是实际射程。
 *   throwSpeed     抛撒速度：速度。
 *   shards         碎片数：物攻；它同时是画面里尖刺与碎屑的数量。
 *   maxLayers      最多叠几层（原生 3），固定。
 *   tempo          起手：速度。
 *   recharge       冷却：速度；密布 ×1.1 / 撒布 ×0.95。
 *
 * 配置 `dense`（密布）双向取舍：开启＝圈收窄到 0.75 倍、每层刺伤 ×1.2、存在更久、再扎更快，但覆盖小、
 *   冷却更长，用来把一条窄路彻底扎死；关闭＝撒布式，圈铺大 1.2 倍、留得短、每层更轻，用来覆盖一大片地面。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const spikesId = "spikes";
    export const spikesRule = "world_combat:hazard/spikes";
    export const spikesScene = "world_combat:move_spikes";
    export const spikesLayText = "world_combat.move.spikes.text.lay";
    export const spikesTreadText = "world_combat.move.spikes.text.tread";

    actionParameters.define(spikesId, {
        pierce: formula(
            F.base(20)
                .plus(F.stat("attack").minus(60).times(0.18).clamp(-6, 26))
                .plus(F.level().minus(25).times(0.22).clamp(0, 10))
                .times(F.when(F.pref("dense"), F.const(1.2), F.const(0.9)))
                .clamp(14, 64).round(1),
            "每层刺伤威力", {
                unit: "威力",
                description: "第一层尖刺扎进脚底那一下的威力；物攻与等级越高越疼，密布式再抬两成。层数会按每层增量放大它。"
            }),
        layerGain: percent(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.05, 0.12))
                .times(F.when(F.pref("dense"), F.const(1.15), F.const(0.9)))
                .clamp(0.2, 0.6),
            "每层增量", "同一片地上每多叠一层尖刺，单次扎伤在上一层基础上多出的比例；物攻越高叠得越狠。"),
        patchRadius: formula(
            F.base(2.4)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.3, 1.2))
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.4, 0.8))
                .times(F.when(F.pref("dense"), F.const(0.75), F.const(1.2)))
                .clamp(1.5, 4.2).round(2),
            "尖刺圈半径", {
                unit: "格",
                description: "一把碎片落地插开的覆盖半径；体型越宽、物攻越高铺得越开，密布式收窄。它也是指示圈与实际判定半径。"
            }),
        patchTicks: seconds(
            F.base(240).plus(F.level().minus(25).times(2.6).clamp(0, 90)).plus(F.stat("hp").minus(60).times(0.3).clamp(-20, 40))
                .times(F.when(F.pref("dense"), F.const(1.25), F.const(0.8)))
                .clamp(140, 460).round(0),
            "尖刺存在时长", "一片尖刺在世界上留多久；等级与 HP 越高留得越久，密布式更耐放。"),
        treadInterval: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 5))
                .times(F.when(F.pref("dense"), F.const(0.85), F.const(1)))
                .clamp(12, 34).round(0),
            "再扎间隔", "两次踩伤之间的最短间隔；只有真的走出步距才会触发，所以它给步伐设上限、不能靠贴边连刷。速度越快越密，密布式 ×0.85。"),
        step: formula(
            F.base(0.9).clamp(0.6, 1.2).round(2),
            "步距", {
                unit: "格",
                description: "在刺地里必须实际走过的水平距离，每跨过这么远再被扎一次；原地站着不会被重复扎。"
            }),
        reach: formula(
            F.base(8)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(25).times(0.04).clamp(0, 2))
                .clamp(6, 12).round(2),
            "抛撒距离", {
                unit: "格",
                description: "能把碎片撒到多远的地面；速度与等级越高够得越远。它也是本招的实际射程。"
            }),
        throwSpeed: formula(
            F.base(1).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.8, 1.5).round(2),
            "抛撒速度", {
                unit: "格/刻",
                description: "碎片脱手飞向落点的速度；速度快的个体抛得更急，目标更难在落地前走开。"
            }),
        shards: formula(
            F.base(22).plus(F.stat("attack").times(0.18)).clamp(16, 52).round(0),
            "碎片数", {
                unit: "片",
                description: "一把碎片里有多少片能插成尖刺；物攻越高越密，也是画面里尖刺与碎屑的数量。"
            }),
        maxLayers: hidden(3),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(6, 14).round(0),
            "起手", "把碎片拢到手里再撒出去的时间；速度越快起手越短。"),
        recharge: seconds(
            F.base(90).minus(F.stat("speed").minus(60).times(0.1).clamp(-6, 14))
                .times(F.when(F.pref("dense"), F.const(1.1), F.const(0.95)))
                .clamp(50, 150).round(0),
            "冷却", "两次撒菱之间的等待；速度越快回得越快，要在同一片地上叠满三层就要在这段时间里连撒几次。")
    });

    defineCategory(spikesId, "physical");
    defineDamage(spikesId, "pierce", {});

    stages(spikesId, [
        { level: 40, values: { pierce: 30, patchRadius: 2.8 } },
        { level: 55, values: { pierce: 38, layerGain: 0.46 } }
    ]);

    describe(spikesId, [
        { key: "description.0", values: ["pierce","layerGain"] },
        { key: "description.1", values: ["patchRadius","patchTicks","step","treadInterval"] },
        { key: "description.stacks", values: ["maxLayers"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level","tier.0.pierce","tier.0.patchRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pierce", "tier.1.layerGain"] }
    ]);
}
