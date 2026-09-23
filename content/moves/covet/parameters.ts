/**
 * 渴望 / covet —— 第 072 组「以对手的持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 60、一般、物理、命中 100、PP 25、接触；
 *   命中时若自身没有携带道具，就把目标的持有物据为己有（`!source.item && target.item` 才换手）。
 * - 即时战斗翻译：一边可爱地撒娇一边贴上去，趁对手被这份可爱分了神把手里的东西卷走；
 *   每一记落地都会让对手攻势软一拍（攻击 −1 级），自己空手时还会真的换手（统一原生装备事务
 *   `equipmentExchange`，宝可梦携带物与原版生物/玩家的主副手同一契约）。与同为“偷取”的小偷分开：
 *   小偷走恶属性、更快更重、可退可压；渴望走一般属性、更慢更软，用降攻的撒娇换来持续贴身。
 * - 参数分散到精灵数据：威力取物攻（抓得牢）与速度（手快），再加上亲密度（越亲近越会撒娇，也越敢伸手）；
 *   贴近距离与每刻位移取速度，判定半径取体型高度，轻推取体重；心形数量取亲密度与速度，驱动表现。
 * 配置 polite（有礼）：这一击更轻（×0.85）但撒娇更深（攻击 −2），关闭则更重（×1.1）而只降 1 级。
 *
 * 伤害段名 charm：这一贴随精灵数据变化的那部分。降攻用 NativeEffects.boost，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    export interface CovetHeld { id: string; key: string; stack: string | null; count: number; pokemon: CombatPokemon | null; }
    /** 一名战斗者当前的“持有物”。宝可梦取携带物、原版生物/玩家取主手/副手，走同一原生装备读取路径。 */
    export function covetHeldOf(world: CombatWorld, actor: CombatActor): CovetHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "",
            stack: held.stack, count: held.count, pokemon: held.pokemon };
    }
    function covetFromContext(context: any): CovetHeld | null {
        if (context.world && context.actor && context.world.valid(context.actor)) return covetHeldOf(context.world, context.actor);
        var pokemon: CombatPokemon | null = context.pokemon || context.attributes && context.attributes.pokemon || null;
        if (pokemon && String(pokemon.heldItem())) {
            var stack = pokemon.heldStack();
            return { id: String(pokemon.heldItem()), key: String(pokemon.heldKey()), stack: stack.serialized(), count: stack.count(), pokemon: pokemon };
        }
        return null;
    }
    /** 自身是否空手（能否伸手拿东西的判据；也供说明读取）。 */
    export function covetEmptyHanded(context: any): boolean { return covetFromContext(context) === null; }

    actionParameters.define("covet", {
        /** 撒娇威力：基础 52；物攻每比 55 多 1 加 0.30（夹 -12..+32），速度每比 55 多 1 加 0.16（夹 -6..+20），
         *  亲密度每比 70 多 1 加 0.05（夹 -4..+12）；polite 关 ×1.1、开 ×0.85；夹在 30..96。 */
        charm: formula(
            F.base(52)
                .plus(F.stat("attack").minus(55).times(0.30).clamp(-12, 32))
                .plus(F.stat("speed").minus(55).times(0.16).clamp(-6, 20))
                .plus(F.individual("friendship", { key: "worldcombat.value.individual.friendship", fallback: "亲密度" })
                    .minus(70).times(0.05).clamp(-4, 12))
                .times(F.when(F.pref("polite"), F.const(0.85), F.const(1.1)))
                .clamp(30, 96).round(1),
            "撒娇威力", {
                unit: "威力",
                description: "一边撒娇一边伸手的那一下：物攻给出抓得牢的狠度，速度让手更快，亲密度让这份撒娇更自然、更敢伸手。对手防御、相性与暴击在命中时另算。"
            }),
        /** 起手时间：基础 5 秒，速度每比 55 多 1 减 0.02 秒（夹在 2..7 秒）。 */
        charge: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 3)).clamp(2, 7).round(0),
            "起手时间", "眨眨眼、凑近去要多久；越灵活的个体起得越快。"),
        /** 贴近距离：基础 2.4 格，速度每比 55 多 1 加 0.018（夹 -0.3..+1.2），夹在 2.0..4.2 格。 */
        reach: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.3, 1.2)).clamp(2.0, 4.2).round(2),
            "贴近距离", {
                unit: "格",
                description: "从起步到够到对手的总位移；腿快的个体贴得更远。它也是本招的实际射程来源。"
            }),
        /** 每刻位移：基础 0.38 格，速度每比 55 多 1 加 0.004（夹 -0.08..+0.3），夹在 0.28..0.72 格/刻。 */
        step: formula(
            F.base(0.38).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.08, 0.3)).clamp(0.28, 0.72).round(2),
            "贴近速度", {
                unit: "格/刻",
                description: "缓缓蹭过去的速度；比起小偷的掠行，这一步更慢、更像撒娇。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.12，夹在 0.26..0.6 格。 */
        radius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.26, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "伸手够到活体的横向判定半径；身板越大够得越宽。"
            }),
        /** 轻推距离：体重每比 50 多 1 加 0.001（夹 -0.03..+0.2），夹在 0.04..0.32 格。 */
        push: formula(
            F.base(0.08).plus(F.body("weight").minus(50).times(0.001).clamp(-0.03, 0.2)).clamp(0.04, 0.32).round(2),
            "轻推距离", {
                unit: "格",
                description: "贴近时把对手轻轻挤开一点；越重的个体挤得越远。"
            }),
        /** 撒娇深度：polite 开为 2 级、关为 1 级。 */
        soften: formula(
            F.when(F.pref("polite"), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "撒娇深度", {
                unit: "级",
                description: "每一记落地让对手攻击下降的等级；开启有礼后这份可爱分掉对手更多注意力。"
            }),
        /** 心形数量：基础 6，亲密度每比 70 多 1 加 0.12（夹 -2..+6），速度每比 55 多 1 加 0.05（夹 -1..+4），夹在 4..18 个。 */
        hearts: formula(
            F.base(6)
                .plus(F.individual("friendship", { key: "worldcombat.value.individual.friendship", fallback: "亲密度" })
                    .minus(70).times(0.12).clamp(-2, 6))
                .plus(F.stat("speed").minus(55).times(0.05).clamp(-1, 4))
                .clamp(4, 18).round(0),
            "心形数量", {
                unit: "个",
                description: "撒娇与得手时飘出的心形数量；越亲近、手越快越多，粒子按它发射。"
            }),
        /** 收招：基础 7 刻，速度每比 55 多 1 减 0.02（夹 -1..+2），夹在 5..10 刻。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 10).round(0),
            "收招", "得手或落空之后收手的时间；快的个体收得干脆。"),
        /** 冷却：基础 24 刻，速度每比 55 多 1 减 0.06（夹 -2..+4），夹在 16..36 刻。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.06).clamp(-2, 4)).clamp(16, 36).round(0),
            "冷却", "两次渴望之间的等待；比小偷短，因为它打的是消耗而非硬碰。"),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    stages("covet", [
        { level: 20, values: { charm: 64 } },
        { level: 38, values: { charm: 74, hearts: 9 } }
    ]);

    defineDamage("covet", "charm", { defenceCoefficient: 0.0048, rationale: "软软的一贴穿透接近默认，突出物攻、速度与亲密的差别。" }, { contact: true });

    describe("covet", [
        { key: "description.0", values: ["charm", "radius"] },
        { key: "description.1", values: ["reach", "step", "push"] },
        { key: "description.2", values: ["soften"] },
        { key: "description.additional", values: [] },
        { key: "polite.on", values: [], when: function (context) { return read(context.detail.values, ["polite"]) === true; } },
        { key: "polite.off", values: [], when: function (context) { return read(context.detail.values, ["polite"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.charm"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.charm"] }
    ]);
}
