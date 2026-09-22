/**
 * 小偷 / thief —— 第 026 组「以持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 60、恶、物理、命中 100、PP 25、接触；命中时若自身没有携带道具，
 *   就把目标的持有物据为己有（Showdown thief 在 `!source.item && target.item` 时换手）。
 * - 即时战斗翻译：一记“探手”——贴身掠过，顺手把对手手里的东西卷进自己手里；自己手上有物（或对手空手）时
 *   只当一记普通打击。道具真的换手：走统一的原子原生装备事务（equipmentExchange），
 *   宝可梦携带物与原版生物/玩家的主副手同一契约，队伍面板与世界实体都会同步。
 * - 参数分散到精灵数据：威力取物攻（探得准）与速度（手快），突进距离、每刻位移与得手后的退步距离取速度，
 *   判定半径取体型高度，顶开取体重；火花数量另取速度，驱动命中粒子，让两只精灵同一招的画面也不同。
 * 配置 flee（得手即退）：得手后多退一段、收招更久，换脱离；关闭则贴身不退，继续压。
 *
 * 伤害段名 swipe：这一探随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export interface ThiefHeld { id: string; key: string; stack: string | null; count: number; pokemon: CombatPokemon | null; }
    /** 一名战斗者当前的“持有物”。宝可梦取携带物、原版生物/玩家取主手/副手，走同一原生装备读取路径。 */
    export function thiefHeldOf(world: CombatWorld, actor: CombatActor): ThiefHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "",
            stack: held.stack, count: held.count, pokemon: held.pokemon };
    }
    function thiefFromContext(context: any): ThiefHeld | null {
        if (context.world && context.actor && context.world.valid(context.actor)) return thiefHeldOf(context.world, context.actor);
        var pokemon: CombatPokemon | null = context.pokemon || context.attributes && context.attributes.pokemon || null;
        if (pokemon && String(pokemon.heldItem())) {
            var stack = pokemon.heldStack();
            return { id: String(pokemon.heldItem()), key: String(pokemon.heldKey()), stack: stack.serialized(), count: stack.count(), pokemon: pokemon };
        }
        return null;
    }
    /** 自身是否空手（作为“能否盗取”的判据；也供说明与公式读取）。 */
    export function thiefEmptyHanded(context: any): boolean { return thiefFromContext(context) === null; }

    actionParameters.define("thief", {
        /** 探手威力：攻击每比 60 多 1 加 0.34（夹 -14..+32），速度每比 60 多 1 加 0.20（夹 -6..+22），夹在 34..104。 */
        swipe: formula(
            F.base(60)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-14, 32))
                .plus(F.stat("speed").minus(60).times(0.20).clamp(-6, 22))
                .clamp(34, 104).round(1),
            "探手威力", {
                unit: "威力",
                description: "这一探随精灵数据变化的那部分：物攻给出探得准的狠度，速度让手更快的个体出手更利落。对手防御、相性与暴击在命中时另算。"
            }),
        /** 蓄势时间：速度每比 60 多 1 减 0.015 秒（下限 2 秒），夹在 2..5 秒。 */
        charge: seconds(
            F.base(4).minus(F.stat("speed").minus(60).max(0).times(0.015)).clamp(2, 5).round(0),
            "蓄势时间", "压身探手之前的起手；手快的人起得更短。"),
        /** 突进距离：速度每比 60 多 1 加 0.02 格（夹 -0.3..+1.6），夹在 2.4..5 格。 */
        reach: formula(
            F.base(2.8).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.3, 1.6)).clamp(2.4, 5).round(2),
            "突进距离", {
                unit: "格",
                description: "从起步到够到目标的总位移；腿快的个体探得更远。"
            }),
        /** 每刻位移：速度每比 60 多 1 加 0.006 格（夹 -0.1..+0.4），夹在 0.5..1.05 格/刻。 */
        step: formula(
            F.base(0.6).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.1, 0.4)).clamp(0.5, 1.05).round(2),
            "掠行速度", {
                unit: "格/刻",
                description: "贴身掠过时每刻前进的距离；越快越难被反应。"
            }),
        /** 退步距离：速度每比 60 多 1 加 0.012 格；flee 开启 ×2；夹在 0.4..3.2 格。 */
        slip: formula(
            F.base(0.8).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.2, 0.8))
                .times(F.when(F.pref("flee"), F.const(2.0), F.const(1.0)))
                .clamp(0.4, 3.2).round(2),
            "退步距离", {
                unit: "格",
                description: "得手后向后拉开多少；flee 开启时退得更远，代价是收招更久。"
            }),
        /** 顶开距离：体重每比 50 多 1 加 0.0015 格（夹 -0.05..+0.35），夹在 0.06..0.5 格。 */
        push: formula(
            F.base(0.12).plus(F.body("weight").minus(50).times(0.0015).clamp(-0.05, 0.35)).clamp(0.06, 0.5).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中时把目标沿掠行方向推开的距离；越重推得越远。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.12，夹在 0.26..0.62 格。 */
        collisionRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.26, 0.62).round(2),
            "判定半径", {
                unit: "格",
                description: "掠行时够到活体的横向判定半径；身板越大判定越宽。"
            }),
        /** 火花数量：速度每比 60 多 1 加 0.28（夹 -5..+18），夹在 7..30 个；驱动命中粒子。 */
        motes: formula(
            F.base(12).plus(F.stat("speed").minus(60).times(0.28).clamp(-5, 18)).clamp(7, 30).round(0),
            "火花数量", {
                unit: "个",
                description: "得手/命中时迸出的细小火花数量；手越快越多，粒子按它发射。"
            }),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    stages("thief", [
        { level: 22, values: { swipe: 72 } },
        { level: 40, values: { swipe: 82, reach: 3.6 } }
    ]);

    defineDamage("thief", "swipe", { defenceCoefficient: 0.005, rationale: "轻巧的一探对防御的穿透接近默认，突出物攻与速度的差别。" }, { contact: true });

    describe("thief", [
        { key: "description.0", values: ["swipe", "collisionRadius"] },
        { key: "description.1", values: ["reach", "step", "slip"] },
        { key: "description.2", values: ["push"] },
        { key: "flee.on", values: [], when: function (context) { return read(context.detail.values, ["flee"]) === true; } },
        { key: "flee.off", values: [], when: function (context) { return read(context.detail.values, ["flee"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swipe"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swipe", "tier.1.reach"] }
    ]);
}
