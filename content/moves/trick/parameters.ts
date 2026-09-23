/**
 * 戏法 / trick —— 第 111 组「持有物与生命的双向交换」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：超能、变化、PP 10、命中 100、保护；抓住对手的空隙，把彼此手里的
 *   持有物对调，双方都换到对方那件。空手与有物之间同样成立，两边都空或对方能力挡住交换时不发生。
 * - 即时翻译：一支「心线」——施法者用超能把两件持有物沿一条拉直的细线无声对调，自己不必移动。
 *   命中不是随机：把目标看清、心线拉直才交换，所以射程与视线是这招真正的门槛。
 * - 参数分散到精灵数据：心线长度（射程）取特攻与等级，起手「故布疑阵」与收手取速度，冷却取等级，
 *   心尘数量取特攻与等级并驱动粒子；体型只影响画面适配，不写进公式。
 * - 配置 snap：瞬时抓取把起手砍到约一半，代价是心线缩到近身（射程 ×0.62、冷却更短）。两种玩法各有局面。
 *
 * 没有伤害段：这是变化招式，交换持有物本身就是结算；命中目标、相性与暴击都不参与。
 */
namespace PokemonSkills {
    export interface TrickHeld { id: string; key: string; serialized: string | null; count: number; pokemon: CombatPokemon | null; }

    /** 一名战斗者当前的「持有物」：宝可梦取携带物，原版生物/玩家取主手/副手，走同一原生装备读取路径。 */
    export function trickHeldOf(world: CombatWorld, actor: CombatActor): TrickHeld | null {
        var held = NativeItems.heldOf(world, actor);
        return held === null ? null : { id: held.id, key: held.pokemon ? String(held.pokemon.heldKey()) : "",
            serialized: held.stack, count: held.count, pokemon: held.pokemon };
    }

    /** 目标是否在能力上拒绝持有物交换（例如黏着），或被查封（embargo）封住了道具通道。 */
    export function trickBlocked(world: CombatWorld, target: CombatActor): boolean {
        if (NativeItems.sealed(world, target)) return true;
        if (String(target.domain()) !== "cobblemon") return false;
        var state = NativeEffects.read(world, target);
        return NativeAbilities.flag(NativeEffects.ability(CobblemonCombat.pokemon(target), state), "heldExchangeImmune");
    }

    /** 双方持有物对调；走统一的原子原生装备事务，宝可梦携带物与原版生物/玩家的主副手同一契约。 */
    export function trickExchange(world: CombatWorld, actor: CombatActor, target: CombatActor): boolean {
        if (trickBlocked(world, target) || NativeItems.sealed(world, actor)) return false;
        return NativeItems.exchangeHeld(world, actor, target).ok;
    }

    actionParameters.define("trick", {
        /** 故布疑阵：基础 9 刻，速度每比 60 快 1 少 0.03 刻；瞬时抓取 ×0.55；夹在 3.5..12 刻。 */
        feint: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .times(F.when(F.pref("snap"), F.const(0.55), F.const(1)))
                .clamp(3.5, 12).round(0),
            "故布疑阵", "抛出假动作、把目标注意力引开所需的起手；手快的人起得更短，瞬时抓取再砍掉约一半。"),
        /** 心线长度：基础 6.5 格，特攻每比 60 多 1 加 0.02 格（夹 -0.8..+1.6），等级 30 起每级加 0.01（上限 +1.2）；瞬时抓取 ×0.62；夹在 3.2..9 格。 */
        reach: formula(
            F.base(6.5)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.8, 1.6))
                .plus(F.level().minus(30).max(0).times(0.01).clamp(0, 1.2))
                .times(F.when(F.pref("snap"), F.const(0.62), F.const(1)))
                .clamp(3.2, 9).round(2),
            "心线长度", {
                unit: "格",
                description: "从自己到目标拉直心线的距离；特攻与等级越高的个体够得越远，瞬时抓取把这条线缩到近身。"
            }),
        /** 收手：基础 6 刻，速度每比 60 快 1 少 0.02 刻，夹在 3..9 刻。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 1.5)).clamp(3, 9).round(0),
            "收手时间", "交换完成后把手收回来的时间；手快的个体收得更利落。"),
        /** 冷却：基础 40 刻 + 等级 ×0.3，瞬时抓取再 −6；夹在 28..64 刻。 */
        cooldown: seconds(
            F.base(40).plus(F.level().times(0.3)).plus(F.when(F.pref("snap"), F.const(-6), F.const(6)))
                .clamp(28, 64).round(0),
            "冷却", "再次拉线前的等待；等级越高冷却略长，瞬时抓取更短。"),
        /** 心尘数量：基础 14，特攻每比 60 多 1 加 0.3（夹 -5..+20），等级 30 起每级加 0.06（上限 +6）；夹在 8..40 个。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-5, 20))
                .plus(F.level().minus(30).max(0).times(0.06).clamp(0, 6)).clamp(8, 40).round(0),
            "心尘数量", {
                unit: "个",
                description: "心线与两端脉冲迸出的细小光尘数量；特攻越强、等级越高越多，粒子按它发射。"
            }),
        /** 假动作提前量：起手时先向目标抛出的假印记数量，按心尘的一小部分。 */
        decoys: formula(
            F.base(3).plus(F.level().minus(30).max(0).times(0.05).clamp(0, 3)).round(0),
            "假印记", {
                unit: "个",
                description: "故布疑阵阶段抛出的假印记数量；等级越高抛得越多，越像真有一手要递出去。"
            })
    });

    stages("trick", [
        { level: 26, values: { reach: 7.4, cooldown: 36 } },
        { level: 46, values: { reach: 8.2, feint: 6, motes: 22 } }
    ]);

    describe("trick", [
        { key: "description.0", values: ["reach"] },
        { key: "description.conditions", values: [] },
        { key: "description.1", values: ["feint","recover","cooldown"] },
        { key: "snap.on", values: [], when: function (context) { return read(context.detail.values, ["snap"]) === true; } },
        { key: "snap.off", values: [], when: function (context) { return read(context.detail.values, ["snap"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.feint"] }
    ]);
}

