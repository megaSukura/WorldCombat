/**
 * 回收利用 / recycle —— 第 111 组「持有物与生命的双向交换」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：一般、变化、PP 10、自身目标；把战斗中已经消耗掉的自己的持有物再生，
 *   让它重新可以再次使用（Showdown 从 `pokemon.lastItem` 里取回并清空记忆）。
 * - 即时翻译：一次「回收」——施法者俯身，把散落的碎片与记忆里的那件道具一起收拢回掌心，重新锻成原来的持有物。
 *   记忆来自事件：战斗者绑定或自身事实变化（`world_combat:actor_bound`／`actor_changed`）时盯着持有物，
 *   只要它是一件新的，就把这整件（含组件）记进本招的个体状态；持有物变空时复位观察位，下次再拿到就重新记。
 *   回收成功即清空记忆（一次一件，和原生一样）；再失去、再拿回，才值得再来一次。
 * - 配置 scavenge（就地取材）：开启后回收范围更大（×1.8），会先扫一遍周围地上的掉落物，若正好是同一种道具，
 *   就把它吸回来当材料（该掉落物从世界里消失），还原出的栈保留它原本的组件；代价是起手变长（×1.25）——
 *   没找到材料时这段搜索就白花了。关闭则只凭记忆复原，起手更短（×0.85），世界不动。
 * - 参数分散到精灵数据：起手与收手取速度，冷却与等级挂钩，回收半径取等级与体型高度，回收火花取等级。
 *
 * 没有伤害段：这是变化招式，回收持有物本身就是结算。
 */
namespace PokemonSkills {
    declare const Java: { loadClass(name: string): any };

    export interface RecycleMemory { id?: string; stack?: string | null; count?: number; }

    /** 本招记住的「上一次消耗掉的持有物」；空对象表示没有可回收的东西。 */
    export function recycleMemory(world: CombatWorld, actor: CombatActor): RecycleMemory {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return {};
        try { return state(world, actor, "recycle") || {}; } catch (error) { return {}; }
    }

    /** 上一次观察到的持有物 id；持有物一变就把它整件记进个体状态，从「有」变「空」时把观察位复位。 */
    const recycleSeen: { [id: string]: string } = Object.create(null);

    function recycleTrack(event: CombatWorldEvent): void {
        const actor = event.actor(), world = event.world();
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return;
        let pokemon: CombatPokemon;
        try { pokemon = CobblemonCombat.pokemon(actor); } catch (error) { return; }
        const key = String(pokemon.id()), held = String(pokemon.heldItem());
        if (!held) { recycleSeen[key] = ""; return; }
        if (recycleSeen[key] === held) return;
        recycleSeen[key] = held;
        const stack = pokemon.heldStack();
        try { setState(world, actor, "recycle", { id: held, stack: stack.serialized(), count: stack.count() }); } catch (error) { }
    }
    // 绑定与自身事实变化时记录当前持有物；不逐刻轮询，也不广播 tick。
    WorldCombat.on("world_combat:move_recycle/bound", "world_combat:actor_bound", "", recycleTrack);
    WorldCombat.on("world_combat:move_recycle/track", "world_combat:actor_changed", "", recycleTrack);

    /**
     * 把记住的持有物放回手里：走统一的原生装备写入（按序列化栈 CAS 装入空槽），保留组件。
     * scavenge 开启时先扫半径内的掉落物，找到同种就把它吸回并消耗（返回 found: true 与它的栈）。
     * 返回 null 表示这次回收没有成立（含原生写入被拒）。
     */
    export function recycleRestore(world: CombatWorld, actor: CombatActor, memory: RecycleMemory, scavenge: boolean, radius: number): any {
        if (!memory.id) return null;
        let foundPoint: CombatPoint | null = null, stack = memory.stack || null, found = false;
        if (scavenge) {
            try {
                const level = world.nativeLevel(), Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
                const NativeRegistryFacts = Java.loadClass("dev.worldcombat.core.world.NativeRegistryFacts");
                const self = world.observe(actor);
                if (self !== null) {
                    const near: any = world.nativeEntities(self.position(), radius, "minecraft:item");
                    for (let index = 0; index < near.length; index++) {
                        const entity = near[index];
                        if (!entity || typeof entity.getItem !== "function") continue;
                        const dropped = entity.getItem();
                        if (dropped === null || dropped.isEmpty()) continue;
                        if (String(Registries.ITEM.getKey(dropped.getItem())) !== memory.id) continue;
                        const serialized = NativeRegistryFacts.serializeStack(level, dropped);
                        if (serialized) { stack = serialized; found = true; foundPoint = self.position(); }
                        entity.discard();
                        break;
                    }
                }
            } catch (error) { }
        }
        try {
            if (!stack) return null;
            // 统一的装备写入：按序列化栈 CAS 装入空槽，保留组件；写入被拒时原样返回 null，不清记忆。
            if (!NativeItems.giveHeld(world, actor, stack).ok) return null;
            try { setState(world, actor, "recycle", {}); } catch (error) { }
            return { id: memory.id, stack: stack, found: found, point: foundPoint };
        } catch (error) {
            return null;
        }
    }

    actionParameters.define("recycle", {
        /** 起手：基础 9 刻，速度每比 60 快 1 少 0.03 刻；就地取材 ×1.25、凭记忆再生 ×0.85；夹在 3..14 刻。 */
        channel: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .times(F.when(F.pref("scavenge"), F.const(1.25), F.const(0.85)))
                .clamp(3, 14).round(0),
            "起手", "俯身收拢碎片、把记忆里的道具重新锻成所需的时间；手快的个体更短，就地取材要额外搜一遍会更长。"),
        /** 回收半径：基础 3 格，等级 30 起每级加 0.03（上限 +1.2），高度每比 1.4 高 1 格加 0.4；就地取材 ×1.8；夹在 2..10 格。 */
        drawRadius: formula(
            F.base(3).plus(F.level().minus(30).max(0).times(0.03).clamp(0, 1.2))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.3, 1.2))
                .times(F.when(F.pref("scavenge"), F.const(1.8), F.const(1)))
                .clamp(2, 10).round(2),
            "回收半径", {
                unit: "格",
                description: "收拢碎片与搜找掉落物的半径；等级越高、身板越高越大，就地取材把这个半径放大近一倍。"
            }),
        /** 回收火花：基础 10，等级 30 起每级加 0.1（上限 +8）；夹在 8..26 颗。 */
        motes: formula(
            F.base(10).plus(F.level().minus(30).max(0).times(0.1).clamp(0, 8)).clamp(8, 26).round(0),
            "回收火花", {
                unit: "颗",
                description: "收拢与锻成时迸出的火花数量；等级越高越多，粒子按它发射。"
            }),
        /** 收手：基础 5 刻，速度每比 60 快 1 少 0.02 刻，夹在 2..8 刻。 */
        recover: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(2, 8).round(0),
            "收手", "把道具收回手里之后收住身形的时间；手快的个体收得更快。"),
        /** 冷却：基础 20 刻 + 等级 ×0.2，夹在 16..44 刻。 */
        cooldown: seconds(
            F.base(20).plus(F.level().times(0.2)).clamp(16, 44).round(0),
            "冷却", "再次回收前的等待；等级越高略长。"),
        minimumMove: hidden(0.05)
    });

    stages("recycle", [
        { level: 28, values: { drawRadius: 3.8, cooldown: 18 } },
        { level: 48, values: { drawRadius: 4.4, motes: 18 } }
    ]);

    describe("recycle", [
        { key: "description.0", values: ["drawRadius"] },
        { key: "description.1", values: ["channel","recover","cooldown"] },
        { key: "description.2", values: [] },
        { key: "scavenge.on", values: [], when: function (context) { return read(context.detail.values, ["scavenge"]) === true; } },
        { key: "scavenge.off", values: [], when: function (context) { return read(context.detail.values, ["scavenge"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drawRadius", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drawRadius"] }
    ]);
}

