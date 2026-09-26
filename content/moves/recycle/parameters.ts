/** Recover one item from a confirmed consumption receipt; nearby material moves through an atomic native pickup. */
namespace PokemonSkills {
    declare const Java: { loadClass(name: string): any };
    const recycleMemoryEffect = "world_combat:recycle_memory";
    let recycleReceiptSequence = 0;
    const recycleClaims: { [actor: string]: boolean } = Object.create(null);
    export interface RecycleMemory { id?: string; stack?: string | null; count?: number; token?: string; consumed?: boolean; }
    WorldCombat.effect(recycleMemoryEffect, 1, 1200000, "actor", json => JSON.stringify(JSON.parse(json)), EffectProtocols.unchanged);
    WorldCombat.effectHandler(recycleMemoryEffect, "start", () => {});
    WorldCombat.effectHandler(recycleMemoryEffect, "operation:world_combat:dispel", effect => effect.end());
    export function recycleMemory(world: CombatWorld, actor: CombatActor): RecycleMemory {
        if (!world.valid(actor)) return {};
        const value = String(actor.domain()) === "cobblemon" ? state(world, actor, "recycle")
            : world.effects(actor, recycleMemoryEffect).map(view => JSON.parse(view.data()))[0];
        return value && value.consumed === true && value.token ? value : {};
    }
    function recycleWrite(world: CombatWorld, actor: CombatActor, value: RecycleMemory): void {
        if (String(actor.domain()) === "cobblemon") { setState(world, actor, "recycle", value); return; }
        world.effects(actor, recycleMemoryEffect).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
        if (value.id) world.effect(recycleMemoryEffect, actor, JSON.stringify(value), 1200000);
    }
    WorldCombat.on("world_combat:move_recycle/consumed", "world_combat:item_consumed", "", event => {
        const world = event.world(), actor = event.actor(), holder = event.target(), data = JSON.parse(event.data());
        if (!holder || String(actor.key()) !== String(holder.key()) || !world.valid(actor) || !(data.count > 0) || !data.item) return;
        const stack = JSON.parse(String(data.item));
        if (typeof stack.id !== "string") return;
        stack.count = 1;
        recycleWrite(world, actor, { id: stack.id, stack: JSON.stringify(stack), count: 1, consumed: true,
            token: String(world.tick()) + "/" + String(++recycleReceiptSequence) });
    });
    export function recycleRestore(world: CombatWorld, actor: CombatActor, memory: RecycleMemory, scavenge: boolean, radius: number): any {
        const ref = String(actor.ref());
        if (!memory.id || !memory.stack || recycleClaims[ref] || recycleMemory(world, actor).token !== memory.token || NativeItems.heldOf(world, actor)) return null;
        // Native callbacks may reenter content; only this synchronous claim may spend this receipt.
        recycleClaims[ref] = true;
        let result: any = null;
        try {
            if (scavenge) {
                const body = world.observe(actor), slot = NativeItems.slotOf(actor);
                if (!body) return null;
                const entities: any[] = world.nativeEntities(body.position(), radius, "minecraft:item") as any;
                const Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
                const Facts = Java.loadClass("dev.worldcombat.core.world.NativeRegistryFacts");
                for (let i = 0; i < entities.length; i++) {
                    const item = entities[i], stack = item.getItem();
                    if (!stack || stack.isEmpty() || String(Registries.ITEM.getKey(stack.getItem())) !== memory.id) continue;
                    const at = WorldCombat.point(Number(item.getX()), Number(item.getY()), Number(item.getZ()));
                    if (!world.clear(body.position(), at)) continue;
                    const expected = Facts.serializeStack(world.nativeLevel(), stack); if (!expected) continue;
                    const receipt = NativeItems.receipt(world.equipmentCollectResult(actor, slot.provider, slot.slot, slot.index, "",
                        String(item.getStringUUID()), String(expected), 1));
                    if (!receipt.ok) return null;
                    return result = { id: memory.id, stack: receipt.item, found: true, point: at };
                }
            }
            if (!NativeItems.giveHeld(world, actor, memory.stack).ok) return null;
            return result = { id: memory.id, stack: memory.stack, found: false, point: null };
        } finally {
            try { if (result && world.valid(actor) && recycleMemory(world, actor).token === memory.token) recycleWrite(world, actor, {}); }
            finally { delete recycleClaims[ref]; }
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

