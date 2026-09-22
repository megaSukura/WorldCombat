/**
 * 神秘守护 / safeguard 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 必中、PP 25、目标己方场地 side safeguard，持续 5 回合，
 *   期间己方（施法者一侧）不会陷入异常状态。
 * 核心念头：一圈碧色守护光从施法者身上张开，罩住自己与身边的队友；一条异常状态落到谁头上之前，
 *   先在光罩上荡开一圈、被弹回去。它不加防、不加血，只让「异常状态」落不下来。
 * 世界化：施法者挂共享身份 world_combat:status/safeguard 的真实 MobEffect（物品栏可见、/effect 可用），
 *   并以自身为锚每 20 刻把这份守护补给半径内的友方；带该身份的活体上，任何经共享状态路由
 *   （CombatStatus.inflict／招式次要状态）落下的异常都会被本单元的 gate 拒绝，并当场播「守护弹开」。
 *   守护跟着施法者走，离开范围的人随补给停止而失去。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   wardTicks   基础 260 刻 + 等级 ×2 + 特防 ×0.4，夹 180..560；特防高的人光罩撑得更久。
 *   wardRadius  基础 3.2 格 + 身高 ×0.9 + 特防 ×0.01，夹 2.5..6.5；身板大、特防高罩得越广。
 *   motes       基础 22 点 + 特防 ×0.1 + 等级 ×0.3，夹 14..58；光点数量，直接驱动画面密度。
 *   tempo       基础 12 刻 − 速度 ×0.03，夹 7..16；张开光罩的起手。
 *   aftercast   基础 8 刻 − 速度 ×0.01，夹 4..11；收招。
 *   recharge    基础 165 刻 − 速度 ×0.1，夹 95..205；两次张罩之间的等待。
 * 配置 ward 双向取舍：深守撑得久、罩得广（时长 ×1.25、半径 ×1.15、motes ×1.15），代价是起手 +3、冷却 ×1.15；
 *   早守张得快、补得勤（起手 −2、冷却 ×0.8），代价是时长 ×0.75、半径 ×0.85、motes ×0.85。
 */
namespace PokemonSkills {
    export const safeguardId = "safeguard";
    export const safeguardEffect = "world_combat:safeguard_veil";
    export const safeguardMark = "world_combat:safeguard_mark";
    export const safeguardScene = "world_combat:move_safeguard";
    export const safeguardStatus = "safeguard";
    export const safeguardWardText = "world_combat.move.safeguard.text.ward";
    export const safeguardGuardText = "world_combat.move.safeguard.text.guard";
    export const safeguardFadeText = "world_combat.move.safeguard.text.fade";

    actionParameters.define(safeguardId, {
        wardTicks: seconds(
            F.base(260).plus(F.level().times(2)).plus(F.stat("specialDefence").times(0.4)).clamp(180, 560).round(0),
            "守护时长", "光罩能罩住自己与队友多久；等级与特防让这层守护撑得更久。"),
        wardRadius: formula(
            F.base(3.2).plus(F.body("height").times(0.9)).plus(F.stat("specialDefence").times(0.01)).clamp(2.5, 6.5),
            "守护半径", { unit: " 格", description: "光罩罩住多大一圈盟友；身板越大、特防越高罩得越广。" }),
        motes: formula(
            F.base(22).plus(F.stat("specialDefence").times(0.1)).plus(F.level().times(0.3)).clamp(14, 58).round(0),
            "光点数量", { unit: " 点", description: "光罩上的光尘数量；特防与等级越高越密，也驱动画面密度。" }),
        tempo: seconds(F.base(12).minus(F.stat("speed").times(0.03)).clamp(7, 16).round(0), "起手",
            "张开光罩需要多久；速度越快越短。"),
        aftercast: seconds(F.base(8).minus(F.stat("speed").times(0.01)).clamp(4, 11).round(0), "收招",
            "张罩之后的收势。"),
        recharge: seconds(F.base(165).minus(F.stat("speed").times(0.1)).clamp(95, 205).round(0), "冷却",
            "两次张罩之间的等待。")
    });
    describe(safeguardId, [
        { key: "description.0", values: ["wardTicks", "wardRadius"] },
        { key: "description.1", values: ["motes", "range"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "ward.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.ward === "early"); } },
        { key: "ward.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.ward !== "early"; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
