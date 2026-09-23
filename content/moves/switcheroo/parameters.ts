/**
 * 掉包 / switcheroo —— 第 111 组「持有物与生命的双向交换」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：恶属性、变化、PP 10、命中 100、保护；用一闪而过的速度交换自己与
 *   目标的持有物，效果与戏法一致，但换成恶属性、走「快」这一路。
 * - 即时翻译：一次掠影——施法者几乎不蓄势就贴着地面掠过去，撞上的一瞬两件持有物已经在空中易手，
 *   身影随后在目标身后拉直（配置 through）。与戏法分开：戏法是超能远程、从容拉线、自己不动；掉包是贴身位移、
 *   起手极短、冷却更短，用冒险换速度。
 * - 参数分散到精灵数据：突进距离、每刻掠行、穿身余量都取速度，判定半径取体型高度，顶开取体重，火花取速度与等级，
 *   冷却取等级。同为「交换持有物」，两只精灵放出来的距离、时机与画面因此不同。
 * - 配置 through：穿身而过——交换后继续冲到目标身后，代价是把自己送进对面阵型深处；关闭则触到即停。
 *
 * 没有伤害段：这是变化招式，交换持有物本身就是结算。
 */
namespace PokemonSkills {
    export interface SwitcherooHeld { id: string; key: string; serialized: string | null; count: number; pokemon: CombatPokemon | null; }

    /** 一名战斗者当前的「持有物」：宝可梦取携带物，原版生物/玩家取主手/副手，走同一原生装备读取路径。 */
    export function switcherooHeldOf(world: CombatWorld, actor: CombatActor): SwitcherooHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "",
            serialized: held.stack, count: held.count, pokemon: held.pokemon };
    }

    /** 目标是否在能力上拒绝持有物交换（例如黏着），或被查封（embargo）封住了道具通道。 */
    export function switcherooBlocked(world: CombatWorld, target: CombatActor): boolean {
        if (NativeItems.sealed(world, target)) return true;
        if (String(target.domain()) !== "cobblemon") return false;
        var state = NativeEffects.read(world, target);
        return NativeAbilities.flag(NativeEffects.ability(CobblemonCombat.pokemon(target), state), "heldExchangeImmune");
    }

    /** 双方持有物对调；走统一的原子原生装备事务，宝可梦携带物与原版生物/玩家的主副手同一契约。 */
    export function switcherooExchange(world: CombatWorld, actor: CombatActor, target: CombatActor): boolean {
        if (switcherooBlocked(world, target) || NativeItems.sealed(world, actor)) return false;
        return NativeItems.exchangeHeld(world, actor, target).ok;
    }

    actionParameters.define("switcheroo", {
        /** 蓄势：基础 2.6 刻，速度每比 60 快 1 少 0.012 刻，夹在 1.2..4.5 刻。 */
        charge: seconds(
            F.base(2.6).minus(F.stat("speed").minus(60).times(0.012).clamp(-0.6, 1.2)).clamp(1.2, 4.5).round(0),
            "蓄势", "一闪而过之前几乎不蓄势的起手；手快的个体快到几乎立刻出手。"),
        /** 突进距离：基础 3.2 格，速度每比 60 多 1 加 0.02 格（夹 -0.3..+1.4）；穿身而过再 +2.2 格；夹在 2.6..6.5 格。 */
        reach: formula(
            F.base(3.2).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.3, 1.4))
                .plus(F.when(F.pref("through"), F.const(2.2), F.const(0)))
                .clamp(2.6, 6.5).round(2),
            "突进距离", {
                unit: "格",
                description: "从起步到够到目标的总位移；腿快的个体掠得更远，穿身而过把终点推到目标身后。"
            }),
        /** 掠行速度：基础 0.78 格/刻，速度每比 60 多 1 加 0.008（夹 -0.12..+0.5）；夹在 0.6..1.35 格/刻。 */
        step: formula(
            F.base(0.78).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.12, 0.5)).clamp(0.6, 1.35).round(2),
            "掠行速度", {
                unit: "格/刻",
                description: "贴身掠过时每刻前进的距离；比小偷更快，越快越难被反应过来。"
            }),
        /** 穿身余量：基础 1.1 格，速度每比 60 多 1 加 0.01（夹 -0.2..+0.7）；夹在 0.6..2.2 格。 */
        overshoot: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.7)).clamp(0.6, 2.2).round(2),
            "穿身余量", {
                unit: "格",
                description: "穿上过而过后，从目标身边再多冲出的距离；手越快穿得越深。"
            }),
        /** 顶开距离：体重每比 50 多 1 加 0.0012 格（夹 -0.04..+0.3），夹在 0.04..0.4 格。 */
        push: formula(
            F.base(0.08).plus(F.body("weight").minus(50).times(0.0012).clamp(-0.04, 0.3)).clamp(0.04, 0.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "掠过时把目标沿掠行方向带开的一点点；越重带得越远。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.12，夹在 0.26..0.62 格。 */
        collisionRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.26, 0.62).round(2),
            "判定半径", {
                unit: "格",
                description: "掠行时够到活体的横向判定半径；身板越大判定越宽。"
            }),
        /** 火花数量：基础 16，速度每比 60 多 1 加 0.32（夹 -6..+20）；夹在 8..36 个。 */
        motes: formula(
            F.base(16).plus(F.stat("speed").minus(60).times(0.32).clamp(-6, 20)).clamp(8, 36).round(0),
            "火花数量", {
                unit: "个",
                description: "掠影与换手时拖出的暗色火花数量；手越快越多，粒子按它发射。"
            }),
        /** 收势：基础 4 刻，速度每比 60 快 1 少 0.02 刻，夹在 2..6 刻。 */
        recover: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(2, 6).round(0),
            "收势", "换手落定后把身形收住的时间；手快的个体收得更快。"),
        /** 冷却：基础 22 刻 + 等级 ×0.2，穿身而过再 +6；夹在 16..40 刻。 */
        cooldown: seconds(
            F.base(22).plus(F.level().times(0.2)).plus(F.when(F.pref("through"), F.const(6), F.const(0)))
                .clamp(16, 40).round(0),
            "冷却", "再次掠影前的等待；比戏法短得多，穿身而过略长。"),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    stages("switcheroo", [
        { level: 24, values: { reach: 4.0, cooldown: 20 } },
        { level: 44, values: { reach: 4.6, step: 0.95, motes: 24 } }
    ]);

    describe("switcheroo", [
        { key: "description.0", values: ["reach"] },
        { key: "description.1", values: ["charge", "step", "recover", "cooldown"] },
        { key: "description.2", values: ["overshoot", "push"] },
        { key: "through.on", values: [], when: function (context) { return read(context.detail.values, ["through"]) === true; } },
        { key: "through.off", values: [], when: function (context) { return read(context.detail.values, ["through"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.step"] }
    ]);
}

