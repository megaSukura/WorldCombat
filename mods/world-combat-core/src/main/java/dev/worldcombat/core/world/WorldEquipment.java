package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.EquipmentObservation;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import java.util.*;
import java.util.function.BiConsumer;

/**
 * Equipment integrations contribute native facts and, when their slot rules allow it, compare-and-set changes.
 * Scripts choose a slot from the snapshots {@link #read} returns and supply the exact stack they observed; a writer
 * applies that change through its own native events and storage. A provider that only registers a reader answers with
 * an explicit {@code read-only} refusal, and a repeated stale snapshot never changes anything.
 */
public final class WorldEquipment {
    private static final Map<String, BiConsumer<LivingEntity, List<EquipmentObservation>>> PROVIDERS = new LinkedHashMap<>();
    private static final Map<String, Writer> WRITERS = new LinkedHashMap<>();
    private WorldEquipment() {}

    /** Read-only contribution; existing integrations keep this entry point. */
    public static void register(String id, BiConsumer<LivingEntity, List<EquipmentObservation>> provider) {
        if (PROVIDERS.putIfAbsent(id, provider) != null) throw new IllegalArgumentException("Duplicate equipment provider: " + id);
    }

    /** A provider that can also apply compare-and-set changes to its own slots. */
    public interface Writer {
        /** Removes the exact observed stack. Success carries the removed stack; failure carries the reason. */
        default WriteResult take(LivingEntity entity, String slot, int index, ItemStack expected) { return WriteResult.failure("read-only"); }
        /** Installs {@code incoming} where {@code expected} currently sits (an empty expected requires an empty slot). */
        default WriteResult put(LivingEntity entity, String slot, int index, ItemStack expected, ItemStack incoming) { return WriteResult.failure("read-only"); }
        /**
         * Opens one slot for a multi-slot transaction. The handle captures the current stack, runs the provider's
         * native pre-checks before anything is written, then commits through the provider's native path. Providers
         * that cannot transact the slot answer with an {@link Opened} failure carrying a readable reason.
         */
        default Opened open(LivingEntity entity, String slot, int index, ItemStack expected) { return Opened.failure("read-only"); }
    }

    /** One slot of a two-phase transaction; nothing is written before {@link Slot#commit}. */
    public interface Slot {
        /** The stack as captured when the transaction opened. */
        ItemStack stock();
        /**
         * Whether the slot still holds exactly the observed stack. Providers re-read their live slot, so a change
         * made after the snapshot (including by a native pre-event) is detected; a stale slot is never written.
         */
        boolean fresh();
        /** The greatest count this slot accepts for {@code incoming} in one write (its own native capacity). */
        default int capacityFor(ItemStack incoming) { return incoming.getMaxStackSize(); }
        /**
         * The reason this slot would refuse {@code incoming} (an empty incoming means the slot may be emptied), or
         * null when accepted. Runs the provider's native pre-checks and pre-events but writes nothing.
         */
        String preflight(ItemStack incoming, boolean incomingDroppable);
        /** Whether the captured stack may drop natively; providers without the notion answer true. */
        default boolean droppable() { return true; }
        /**
         * Writes {@code finalStack} to native storage only. A provider whose native write also announces (a client
         * packet, a post-event) must defer that to {@link #publish()}; false refuses and the caller rolls back.
         */
        boolean commit(ItemStack finalStack);
        /** Force-restores {@code finalStack} for a rollback: no rejecting pre-check, pre-event or publish. */
        void settle(ItemStack finalStack);
        /** Announces committed stacks after every slot in the transaction succeeded; a no-op for direct native writes. */
        default void publish() {}
    }

    /** An opened slot, or the readable reason a provider could not transact it. */
    public record Opened(Slot slot, String reason) {
        public static Opened success(Slot slot) { return new Opened(java.util.Objects.requireNonNull(slot), ""); }
        public static Opened failure(String reason) { return new Opened(null, reason); }
        public boolean ok() { return slot != null; }
    }

    /** The previous stack and an empty reason on success; an empty stack and the refusal otherwise. */
    public record WriteResult(ItemStack stack, String reason) {
        public static WriteResult success(ItemStack stack) { return new WriteResult(stack == null ? ItemStack.EMPTY : stack.copy(), ""); }
        public static WriteResult failure(String reason) { return new WriteResult(ItemStack.EMPTY, reason); }
        public boolean ok() { return reason.isEmpty(); }
    }

    public static void registerWriter(String id, Writer writer) {
        if (WRITERS.putIfAbsent(id, writer) != null) throw new IllegalArgumentException("Duplicate equipment writer: " + id);
    }
    public static WriteResult take(String provider, LivingEntity entity, String slot, int index, ItemStack expected) {
        var writer = WRITERS.get(provider);
        if (writer != null) return writer.take(entity, slot, index, expected);
        return WriteResult.failure(PROVIDERS.containsKey(provider) ? "read-only" : "unknown-provider");
    }
    public static WriteResult put(String provider, LivingEntity entity, String slot, int index, ItemStack expected, ItemStack incoming) {
        var writer = WRITERS.get(provider);
        if (writer != null) return writer.put(entity, slot, index, expected, incoming);
        return WriteResult.failure(PROVIDERS.containsKey(provider) ? "read-only" : "unknown-provider");
    }
    /** Opens a provider slot for a transaction, refusing with a readable reason when it cannot transact. */
    public static Opened open(String provider, LivingEntity entity, String slot, int index, ItemStack expected) {
        var writer = WRITERS.get(provider);
        if (writer == null) return Opened.failure(PROVIDERS.containsKey(provider) ? "read-only" : "unknown-provider");
        var opened = writer.open(entity, slot, index, expected);
        if (opened == null) return Opened.failure("unavailable");
        return opened.ok() ? opened : Opened.failure(opened.reason());
    }
    /** Take path for one opened slot: fresh check, native preflight, then commit to empty and publish. */
    public static WriteResult takeFrom(Slot slot) { return takeFrom(slot, 0); }
    /** Take path for one opened slot, removing at most {@code count} items (<=0 removes the whole observed stack). */
    public static WriteResult takeFrom(Slot slot, int count) {
        var result = removeFrom(slot, count);
        if (result.ok()) announce(slot);
        return result;
    }
    /**
     * CAS removal that commits native storage only; the caller publishes after its follow-up native step succeeds.
     * {@code count} <= 0 removes the whole observed stack; a positive count removes that many and keeps the source
     * remainder in the slot. Freshness is re-checked after preflight because a native pre-event may change the slot.
     */
    public static WriteResult removeFrom(Slot slot, int count) {
        if (!slot.fresh()) return WriteResult.failure("stale");
        var stock = slot.stock();
        if (stock.isEmpty()) return WriteResult.failure("empty");
        int take = count <= 0 ? stock.getCount() : Math.min(count, stock.getCount());
        if (take <= 0) return WriteResult.failure("empty");
        var removed = stock.copyWithCount(take);
        var remaining = stock.copy();
        remaining.shrink(take);
        var refusal = slot.preflight(remaining, false);
        if (refusal != null) return WriteResult.failure(refusal);
        if (!slot.fresh()) return WriteResult.failure("stale");
        if (!commit(slot, remaining, stock)) return WriteResult.failure("write-refused");
        return WriteResult.success(removed);
    }
    /** Put path for one opened slot; success carries the stack the slot held before the write. */
    public static WriteResult putInto(Slot slot, ItemStack incoming) {
        if (!slot.fresh()) return WriteResult.failure("stale");
        if (incoming == null || incoming.isEmpty()) return WriteResult.failure("empty-incoming");
        if (incoming.getCount() > slot.capacityFor(incoming)) return WriteResult.failure("capacity");
        var before = slot.stock();
        var refusal = slot.preflight(incoming, true);
        if (refusal != null) return WriteResult.failure(refusal);
        if (!slot.fresh()) return WriteResult.failure("stale");
        if (!commit(slot, incoming, before)) return WriteResult.failure("write-refused");
        announce(slot);
        return WriteResult.success(before);
    }
    /**
     * Atomic two-slot exchange; nothing is written until both slots passed freshness checks and preflight. When both
     * sides hold something the whole observed stacks swap. With one side empty, {@code count} > 0 moves that many
     * items and keeps the source remainder, while {@code count} <= 0 moves the whole stack. A destination's native
     * capacity still applies, so a whole stack that cannot fit is refused with {@code capacity}. A refused or thrown
     * commit restores both captured stacks as-is.
     */
    public static WriteResult exchange(Slot first, Slot second, int count) {
        if (!first.fresh()) return WriteResult.failure("stale-first");
        if (!second.fresh()) return WriteResult.failure("stale-second");
        var a = first.stock();
        var b = second.stock();
        if (a.isEmpty() && b.isEmpty()) return WriteResult.failure("empty");
        int limit = count <= 0 || (!a.isEmpty() && !b.isEmpty()) ? Integer.MAX_VALUE : count;
        int sendAB = Math.min(limit, a.getCount()), sendBA = Math.min(limit, b.getCount());
        var finalA = transfer(a, sendAB, b, sendBA);
        var finalB = transfer(b, sendBA, a, sendAB);
        if (!finalA.isEmpty() && finalA.getCount() > first.capacityFor(finalA)) return WriteResult.failure("capacity");
        if (!finalB.isEmpty() && finalB.getCount() > second.capacityFor(finalB)) return WriteResult.failure("capacity");
        var refusalA = first.preflight(finalA, second.droppable());
        if (refusalA != null) return WriteResult.failure(refusalA);
        var refusalB = second.preflight(finalB, first.droppable());
        if (refusalB != null) return WriteResult.failure(refusalB);
        if (!first.fresh()) return WriteResult.failure("stale");
        if (!second.fresh()) return WriteResult.failure("stale");
        if (!commit(second, finalB, b)) { settle(first, a); return WriteResult.failure("write-refused"); }
        if (!commit(first, finalA, a)) { settle(second, b); return WriteResult.failure("write-refused"); }
        announce(first);
        announce(second);
        return WriteResult.success(ItemStack.EMPTY);
    }
    /** Publishes one committed slot, containing a failing announce so the rest of a transaction still reports. */
    public static void announce(Slot slot) {
        try { slot.publish(); } catch (RuntimeException ignored) { }
    }
    /** The stack left after removing {@code removed} and adding {@code addedCount} of {@code added}. */
    private static ItemStack transfer(ItemStack from, int removed, ItemStack added, int addedCount) {
        var out = from.isEmpty() ? ItemStack.EMPTY : from.copy();
        if (!out.isEmpty()) out.shrink(removed);
        if (addedCount > 0 && !added.isEmpty()) out = added.copyWithCount(addedCount);
        return out;
    }
    /** Commits one slot, restoring the captured stack when the write refuses or throws. */
    private static boolean commit(Slot slot, ItemStack next, ItemStack fallback) {
        try { if (slot.commit(next)) return true; }
        catch (RuntimeException failed) { }
        settle(slot, fallback);
        return false;
    }
    private static void settle(Slot slot, ItemStack fallback) {
        try { slot.settle(fallback); } catch (RuntimeException ignored) { }
    }

    public static EquipmentObservation capture(String provider, String slot, int index, ItemStack stack, net.minecraft.core.HolderLookup.Provider access) {
        return new EquipmentObservation(provider, slot, index, BuiltInRegistries.ITEM.getKey(stack.getItem()).toString(),
            stack.getCount(), stack.getDescriptionId(), stack.getTags().map(tag -> tag.location().toString()).sorted().toList(),
            NativeRegistryFacts.stack(access, stack));
    }
    public static EquipmentObservation[] read(LivingEntity entity) {
        var values = new ArrayList<EquipmentObservation>();
        for (var slot : EquipmentSlot.values()) {
            var stack = entity.getItemBySlot(slot);
            if (!stack.isEmpty()) values.add(capture("minecraft", slot.getName(), 0, stack, entity.registryAccess()));
        }
        PROVIDERS.values().forEach(provider -> provider.accept(entity, values));
        return values.toArray(EquipmentObservation[]::new);
    }
    public static void changed(LivingEntity entity) {
        if (!(entity.level() instanceof ServerLevel level)) return;
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(new CombatEquipmentChangedEvent(entity));
        var combat = CombatServices.get(level.getServer());
        var actor = combat.bind(entity);
        if (combat.valid(actor)) combat.runtime().event("world_combat:equipment_changed", actor, null, "{}", true);
    }
}
