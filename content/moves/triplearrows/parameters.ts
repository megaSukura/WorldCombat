/**
 * 三连箭 / triplearrows 的参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 90／命中 100／PP 10／暴击等级 2（高暴击）／追加 50% 令目标防御 −1、
 * 30% 令目标畏缩（Cobblemon 1.8，1 位学习者：洗翠狙射树枭 / Hisuian Decidueye）。
 *
 * 翻译：把「使出一记腿技后同时发射 3 箭」落成**两拍**——先一记低扫腿踢开护架，再同时射出 3 支箭。
 * 箭的伤害按支分（每支一段 `volley`，三支都命中≈原生的 90 威力总量），三箭齐发所以可以散开打不同目标；
 * 高暴击落成两处：原生暴击等级已由共享结算读取，另外**只有被这一脚真正踢中护架的目标**会被三箭直接命中要害
 * （`critical` 覆写，按目标 ref 对齐）。50% 的降防落在腿技这一段、30% 的畏缩只在第一次命中时掷一次（与原生「一次判定」一致）。
 * 降防用 `NativeEffects.boost(...,"def",-N)` + 共享身份 `world_combat:status/guardbroken`；
 * 畏缩用本单元声明的 `world_combat:status/flinch` 并投递 `world_combat:interrupt`。
 *
 * 选取是 aim：方向点或实体都能放。腿只够到 `reach` 的近身长度（判定与画面用同一条真实腿线），远距离不会凭空踢中，
 * 只送三箭；箭会被墙挡住。实际施放射程由 `arrowRange` 决定，`reach` 只描述这一步近身腿技。
 *
 * 数据分散：
 *   kick          腿技威力：物攻定踢开护架的力道（这段只占小头）。
 *   volley        每支箭威力：物攻定弓力、速度定拉弦快慢；配置两向分配。
 *   spread        扇形角：配置决定散开多少（扇形齐射 / 集中齐射）。
 *   drawTicks     腿技到齐射的间隔：速度定收腿拉弦多快。
 *   guardChance   踢开护架几率：物攻定踢得准不准（原生 50%）。
 *   guardStages   踢开等级：本招固定 1 级。
 *   guardTicks    护架缺口时长：等级定缺口留多久。
 *   flinchChance  畏缩几率：速度定箭势多急（原生 30%，只在第一次命中时掷）。
 *   flinchTicks   畏缩时长：固定 14 刻。
 *   arrowSpeed    箭速：速度定箭飞多急。
 *   arrowRange    箭程：等级与速度定箭能追多远；也是本招的实际射程来源。
 *   reach         腿技距离（近身）：速度定这一步低扫腿够到多近，不随目标剩余距离拉长。
 *   kickRadius / arrowRadius 判定：身高定腿与箭的判定大小。
 *
 * 配置 `fan`（扇形齐射）：开＝三箭散开 14°、每支 ×0.85（铺开打几个人），但冷却更久；
 * 关（集中齐射，默认）＝三箭几乎同一点、每支 ×1.05（单体更狠）。两向各有局面。
 *
 * 伤害段 `kick` 与 `volley` 各走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("triplearrows", {
        /** 腿技威力：16 + 物攻偏移[−3,10]；夹 10..32。 */
        kick: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.06).clamp(-3, 10)).clamp(10, 32).round(1),
            "腿技威力", {
                unit: "威力",
                description: "低扫腿那一下的威力；它是小头，作用是把护架踢开、给三箭让路。"
            }),
        /** 每支箭威力：24 + 物攻偏移[−5,16] + 速度偏移[−2,6]；扇形 ×0.85 / 集中 ×1.05；夹 15..52。 */
        volley: formula(
            F.base(24)
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-5, 16))
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-2, 6))
                .times(F.when(F.pref("fan", text("worldcombat.skill.triplearrows.preference.fan")), F.const(0.85), F.const(1.05)))
                .clamp(15, 52).round(1),
            "单支箭威力", {
                unit: "威力",
                description: "每一支箭的威力；三支都命中同一个目标时约等于一次完整的三连箭。物攻定弓力、速度定拉弦快慢。"
            }),
        /** 扇形角：2.5 + 扇形齐射 +11.5；夹 1..15；每支箭相对中心线的偏角。 */
        spread: formula(
            F.base(2.5).plus(F.when(F.pref("fan", text("worldcombat.skill.triplearrows.preference.fan")), F.const(11.5), F.const(0))).clamp(1, 15).round(1),
            "扇形角", {
                unit: "度",
                description: "每支箭偏离中心线的角度；扇形齐射散得开、能扫到旁边的人，集中齐射几乎叠在同一点。"
            }),
        /** 齐射间隔：6 − 速度偏移[−1,2]；夹 3..8；腿技到齐射之间隔多久。 */
        drawTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.008).clamp(-1, 2)).clamp(3, 8).round(0),
            "齐射间隔", "低扫腿之后隔多久射箭；速度快的个体收腿拉弦更快。"),
        /** 踢开护架几率：0.5 + 物攻偏移[−0.08,0.15]；夹 0.35..0.7。 */
        guardChance: percent(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.0012).clamp(-0.08, 0.15)).clamp(0.35, 0.7),
            "踢开护架几率", "腿技命中时让目标防御下降的几率（原生 50%）；物攻越高踢得越准。"),
        /** 踢开等级：本招固定 1 级。 */
        guardStages: formula(
            F.base(1),
            "踢开等级", {
                unit: "级",
                description: "一次踢开让目标防御下降的能力等级。"
            }),
        /** 护架缺口时长：70 + 等级(≥30)偏移[0,50]；夹 50..220。 */
        guardTicks: seconds(
            F.base(70).plus(F.level().minus(30).times(1.1).clamp(0, 50)).clamp(50, 220).round(0),
            "护架缺口时长", "目标护架缺口停留的时长；等级越高留得越久。"),
        /** 畏缩几率：0.3 + 速度偏移[−0.06,0.12]；夹 0.18..0.45；一次施放只在第一次命中时掷一次。 */
        flinchChance: percent(
            F.base(0.3).plus(F.stat("speed").minus(60).times(0.001).clamp(-0.06, 0.12)).clamp(0.18, 0.45),
            "畏缩几率", "三箭第一次命中时让目标畏缩的几率（原生 30%）；速度越高箭势越急。"),
        flinchTicks: ticks(14, "畏缩持续", "被箭势压住的人在这段时间内无法开始新动作。"),
        /** 箭速：1.15 + 速度偏移[−0.15,0.3]；夹 0.9..1.5。 */
        arrowSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.3)).clamp(0.9, 1.5).round(2),
            "箭速", {
                unit: "格/刻",
                description: "箭离弦的速度；速度快的个体箭飞得更急、更难躲。"
            }),
        /** 箭程：10 + 等级(≥25)偏移[0,4] + 速度偏移[−1,2]；夹 8..16。 */
        arrowRange: formula(
            F.base(10)
                .plus(F.level().minus(25).times(0.1).clamp(0, 4))
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .clamp(8, 16).round(2),
            "箭程", {
                unit: "格",
                description: "箭能飞多远；腿技踢开后目标走开时，箭还能追出去的距离。"
            }),
        /** 腿技距离：3.4 + 速度偏移[−0.3,0.9]；夹 3.0..4.6；只描述这一步近身低扫腿，不随目标距离拉长。 */
        reach: formula(
            F.base(3.4).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.3, 0.9)).clamp(3.0, 4.6).round(2),
            "腿技距离", {
                unit: "格",
                description: "低扫腿这一步能扫到多近；速度快的个体步幅更大。它只描述近身腿技，远处的目标不会被它凭空踢到——远处只送三箭。"
            }),
        /** 腿技判定：0.5 + 身高偏移[−0.05,0.3]；夹 0.4..0.85。 */
        kickRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.3)).clamp(0.4, 0.85).round(2),
            "腿技判定", {
                unit: "格",
                description: "低扫腿能踢到多大范围；大个子腿更长。"
            }),
        /** 箭判定：0.16 + 身高偏移[−0.02,0.12]；夹 0.12..0.32。 */
        arrowRadius: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).times(0.04).clamp(-0.02, 0.12)).clamp(0.12, 0.32).round(2),
            "箭判定", {
                unit: "格",
                description: "一支箭能擦到多大范围；大个子拉开的弓更大。"
            })
    });

    defineDamage("triplearrows", "kick", {}, { contact: true });
    defineDamage("triplearrows", "volley", {}, { contact: false });

    stages("triplearrows", [
        { level: 30, values: { volley: 30 } },
        { level: 48, values: { volley: 38, guardTicks: 100 } }
    ]);

    describe("triplearrows", [
        { key: "description.0", values: ["kick","kickRadius","reach"] },
        { key: "description.1", values: ["drawTicks","volley","spread","arrowSpeed","arrowRange","arrowRadius"] },
        { key: "description.2", values: ["guardChance","guardStages","guardTicks","flinchChance","flinchTicks"] },        { key: "fan.on", values: [], when: function (context) { return read(context.detail.values, ["fan"]) === true; } },
        { key: "fan.off", values: [], when: function (context) { return read(context.detail.values, ["fan"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.volley"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.volley", "tier.1.guardTicks"] }
    ]);
}
