/**
 * 拍落 / knockoff —— 第 026 组「以持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 65、恶、物理、命中 100、PP 20、接触；目标携带道具时威力 ×1.5，
 *   命中后拍掉其道具，此战不可再使用。
 * - 即时战斗翻译：举臂过顶一记重拍——把对方手里的东西整个拍飞，落到地上、谁都能再捡起；对手空手时只是一记
 *   普通重击。道具经统一装备事务（equipmentDrop）被取走并以真实掉落物抛出（带初速），
 *   由原生掉落物自己翻滚落地，世界里真的少了一件、地上真的多了一件；宝可梦携带物与原版生物/玩家的手同一契约。
 * - 参数分散到精灵数据：威力取物攻（拍得重）与体重（压得住），突进距离取物攻，每刻位移取速度，顶开与碎屑取体重，
 *   掉落距离与可拾取延迟取物攻（拍得越狠飞得越远、越久才能捡）。
 * 配置 far（挑飞得远）：道具被挑得更远（更难捡回、封得更久），代价是本击略轻、收招更久；关闭则拍在脚下、本击更重。
 *
 * 伤害段名 smash：这一拍随精灵数据变化的那部分。命中持物目标的 ×1.5 在命中时结算（目标身上才读得到持有物）。
 */
namespace PokemonSkills {
    export interface KnockoffHeld { id: string; key: string; stack: string | null; count: number; pokemon: CombatPokemon | null; }
    /** 一名战斗者当前的“持有物”。宝可梦取携带物、原版生物/玩家取主手/副手，走同一原生装备读取路径。 */
    export function knockoffHeldOf(world: CombatWorld, actor: CombatActor): KnockoffHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "",
            stack: held.stack, count: held.count, pokemon: held.pokemon };
    }

    actionParameters.define("knockoff", {
        /** 拍击威力：攻击每比 65 多 1 加 0.42（夹 -18..+42），体重每比 50 多 1 加 0.05（夹 -3..+14）；far 开 ×0.92、关 ×1.12；夹在 34..104。 */
        smash: formula(
            F.base(60)
                .plus(F.stat("attack").minus(65).times(0.42).clamp(-18, 42))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-3, 14))
                .times(F.when(F.pref("far"), F.const(0.92), F.const(1.12)))
                .clamp(34, 104).round(1),
            "拍击威力", {
                base: 60, unit: "威力",
                description: "这一拍随精灵数据变化的那部分：物攻给出拍得重的狠度，体重把它压得更实。目标携带持有物时，命中再 ×1.5（命中时结算）；对手防御、相性与暴击也在命中时另算。"
            }),
        /** 蓄力时间：速度每比 50 多 1 减 0.015 秒（下限 3 秒），夹在 3..7 秒。 */
        charge: seconds(
            F.base(6).minus(F.stat("speed").minus(50).max(0).times(0.015)).clamp(3, 7).round(0),
            "蓄力时间", "把手臂高高举起再砸下的时间；身法快的个体起得更短。"),
        /** 突进距离：攻击每比 65 多 1 加 0.012 格（下限 -0.3），夹在 2.3..4.4 格。 */
        reach: formula(
            F.base(2.6).plus(F.stat("attack").minus(65).max(0).times(0.012)).clamp(2.3, 4.4).round(2),
            "突进距离", {
                base: 2.6, unit: "格",
                description: "从起步到够到目标的总位移；臂力大的个体压得更近。"
            }),
        /** 每刻位移：速度每比 50 多 1 加 0.005 格（下限 -0.1），夹在 0.4..0.95 格/刻。 */
        step: formula(
            F.base(0.5).plus(F.stat("speed").minus(50).max(0).times(0.005)).clamp(0.4, 0.95).round(2),
            "压上速度", {
                unit: "格/刻",
                description: "逼近目标时每刻前进的距离；这一拍偏慢，靠重量压住。"
            }),
        /** 顶开距离：体重每比 50 多 1 加 0.004 格（夹 -0.08..+0.7），夹在 0.1..1.0 格。 */
        push: formula(
            F.base(0.2).plus(F.body("weight").minus(50).times(0.004).clamp(-0.08, 0.7)).clamp(0.1, 1.0).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中时把目标沿拍击方向推开的距离；越重推得越远。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.13，夹在 0.28..0.66 格。 */
        collisionRadius: formula(
            F.base(0.38).plus(F.body("height").minus(1.4).times(0.13)).clamp(0.28, 0.66).round(2),
            "判定半径", {
                unit: "格",
                description: "压上时够到活体的横向判定半径；身板越大判定越宽。"
            }),
        /** 掉落距离：攻击每比 65 多 1 加 0.02 格；far 开 ×1.8、关 ×0.55；夹在 0.6..4.5 格。 */
        scatter: formula(
            F.base(1.6).plus(F.stat("attack").minus(65).max(0).times(0.02))
                .times(F.when(F.pref("far"), F.const(1.8), F.const(0.55)))
                .clamp(0.6, 4.5).round(2),
            "道具掉落距离", {
                unit: "格",
                description: "被拍掉的道具落在离目标多远处；far 开启时挑得更远，更难被捡回。"
            }),
        /** 抛出速度：攻击每比 65 多 1 加 0.004 格/刻（下限 -0.1），夹在 0.25..0.7 格/刻。 */
        tossSpeed: formula(
            F.base(0.35).plus(F.stat("attack").minus(65).max(0).times(0.004)).clamp(0.25, 0.7).round(2),
            "道具抛出速度", {
                unit: "格/刻",
                description: "被拍掉的道具飞出去的初速；拍得越狠飞得越快。"
            }),
        /** 可拾取延迟：基础 320 刻（16 秒），攻击每比 65 多 1 加 1.6 刻，夹在 200..800 刻（10..40 秒）。 */
        pickup: seconds(
            F.base(320).plus(F.stat("attack").minus(65).max(0).times(1.6)).clamp(200, 800).round(0),
            "可拾取延迟", "掉在地上的道具要过多久才能被捡起；拍得越狠、落地越久。"),
        /** 碎屑数量：体重每比 50 多 1 加 0.06（夹 -4..+14），夹在 10..28 个；驱动落地尘。 */
        motes: formula(
            F.base(14).plus(F.body("weight").minus(50).times(0.06).clamp(-4, 14)).clamp(10, 28).round(0),
            "碎屑数量", {
                unit: "个",
                description: "拍击与道具落地时扬起的碎屑数量；体重越大越多，粒子按它发射。"
            }),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    stages("knockoff", [
        { level: 24, values: { smash: 72 } },
        { level: 42, values: { smash: 84, reach: 3.4 } }
    ]);

    defineDamage("knockoff", "smash", { defenceCoefficient: 0.0052, rationale: "重拍对防御的穿透略强于默认，让物攻与体重的差别更可见。" }, { contact: true });

    describe("knockoff", [
        { key: "description.0", values: ["smash", "collisionRadius"] },
        { key: "description.1", values: ["reach", "step", "push"] },
        { key: "description.2", values: ["scatter","pickup"] },
        { key: "far.on", values: [], when: function (context) { return read(context.detail.values, ["far"]) === true; } },
        { key: "far.off", values: [], when: function (context) { return read(context.detail.values, ["far"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.smash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.smash", "tier.1.reach"] }
    ]);
}
