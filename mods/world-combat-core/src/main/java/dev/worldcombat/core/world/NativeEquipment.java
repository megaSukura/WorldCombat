package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.*;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.Vec3;

/**
 * Compare-and-set operations over native equipment. The script picks the slot and supplies the exact stack it
 * observed; Minecraft hands and armour are built in, and third-party providers (Curios, Cobblemon held items)
 * register their own writers. Multi-slot operations run as one transaction: every provider pre-check and native
 * pre-event happens before any slot is written, a refused write is rolled back as-is without re-running a rejecting
 * pre-event, and a stale source snapshot is never copied. No operation copies items: drops and exchanges move the
 * real stacks, including their data components.
 */
public final class NativeEquipment {
    private NativeEquipment() {}

    /** A readable operation receipt; {@code item} is the stack that left the slot (empty when none). */
    public record Result(boolean ok, String reason, String item, int count, String drop) {
        public static Result failure(String reason) { return new Result(false, reason, "", 0, ""); }
        public String json() {
            var out = new JsonObject();
            out.addProperty("ok", ok); out.addProperty("reason", reason);
            out.addProperty("item", item); out.addProperty("count", count); out.addProperty("drop", drop);
            return out.toString();
        }
    }

    /** CAS removal of the observed stack; the receipt carries the removed stack. */
    public static Result takeOp(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected) {
        return takeOp(combat, handle, provider, slot, index, expected, 0);
    }
    /** CAS removal of at most {@code count} items (<=0 removes the whole observed stack). */
    public static Result takeOp(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, int count) {
        var entity = target(combat, handle);
        var opened = open(entity, provider, slot, index, expectedStack(entity, expected));
        if (!opened.ok()) return Result.failure(opened.reason());
        var result = WorldEquipment.takeFrom(opened.slot(), count);
        if (!result.ok()) return Result.failure(result.reason());
        return receipt(result.stack(), entity, "");
    }

    /** CAS removal, then a real native item entity at the target's feet; a refused spawn restores the stack. */
    public static Result dropOp(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, String data) {
        return dropOp(combat, handle, provider, slot, index, expected, data, 0);
    }
    /** Same native drop, dropping at most {@code count} items (<=0 drops the whole observed stack). */
    public static Result dropOp(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, String data, int count) {
        var options = object(data);
        var entity = target(combat, handle);
        var opened = open(entity, provider, slot, index, expectedStack(entity, expected));
        if (!opened.ok()) return Result.failure(opened.reason());
        var source = opened.slot();
        var stock = source.stock();
        var result = WorldEquipment.removeFrom(source, count);
        if (!result.ok()) return Result.failure(result.reason());
        var stack = result.stack();
        if (!(entity.level() instanceof ServerLevel level)) { source.settle(stock); return Result.failure("not-server"); }
        ItemEntity item = null;
        try {
            item = new ItemEntity(level, entity.getX(), entity.getY() + 0.5, entity.getZ(), stack);
            if (options.has("pickupDelay")) item.setPickUpDelay(Math.max(0, Math.min(6000, options.get("pickupDelay").getAsInt())));
            else item.setDefaultPickUpDelay();
            if (options.has("velocity") && options.get("velocity").isJsonArray() && options.getAsJsonArray("velocity").size() == 3) {
                var velocity = options.getAsJsonArray("velocity");
                item.setDeltaMovement(new Vec3(velocity.get(0).getAsDouble(), velocity.get(1).getAsDouble(), velocity.get(2).getAsDouble()));
            }
            if (options.has("glow") && options.get("glow").isJsonPrimitive() && options.get("glow").getAsJsonPrimitive().isBoolean()
                && options.get("glow").getAsBoolean()) item.setGlowingTag(true);
            item.setThrower(entity);
            if (!level.addFreshEntity(item)) { source.settle(stock); return Result.failure("spawn-refused"); }
        } catch (RuntimeException refused) {
            // An event can throw after native insertion. Restore only when no dropped entity exists.
            if (item == null || level.getEntity(item.getUUID()) != item) {
                source.settle(stock);
                return Result.failure("spawn-refused");
            }
        }
        // The entity exists now; announce outside the guard so a listener failure never restores the already-spawned stack.
        WorldEquipment.announce(source);
        return new Result(true, "", serialized(entity, stack), stack.getCount(), item.getStringUUID());
    }

    /** CAS install of an item id or serialized stack where {@code expected} sits (empty expected = empty slot). */
    public static Result giveOp(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, String item) {
        return giveOp(combat, handle, provider, slot, index, expected, item, 0);
    }
    /** Same CAS install, capping the installed stack to {@code count} items when {@code count} > 0. */
    public static Result giveOp(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, String item, int count) {
        var entity = target(combat, handle);
        var parsed = NativeRegistryFacts.parseStack(entity.registryAccess(), item);
        if (parsed.isEmpty()) throw new IllegalArgumentException("Expected a nonempty item to give");
        var incoming = count > 0 && parsed.getCount() > count ? parsed.copyWithCount(count) : parsed;
        var opened = open(entity, provider, slot, index, expectedStack(entity, expected));
        if (!opened.ok()) return Result.failure(opened.reason());
        var result = WorldEquipment.putInto(opened.slot(), incoming);
        if (!result.ok()) return Result.failure(result.reason());
        return receipt(result.stack(), entity, "");
    }

    /**
     * Atomic swap of two native equipment stacks. Both slots are opened and preflighted before either is written, so
     * a native refusal leaves both items where they were; a slot that changed since the snapshot is never copied.
     * One or both sides may be empty, which expresses taking from or giving into an empty slot.
     */
    public static Result exchangeOp(MinecraftCombat combat, ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                    ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected) {
        return exchangeOp(combat, first, firstProvider, firstSlot, firstIndex, firstExpected,
            second, secondProvider, secondSlot, secondIndex, secondExpected, 0);
    }
    /** Same atomic swap, moving at most {@code count} items per side when only one side holds something. */
    public static Result exchangeOp(MinecraftCombat combat, ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                    ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected, int count) {
        var a = target(combat, first);
        var b = target(combat, second);
        if (a == b && firstProvider.equals(secondProvider) && firstSlot.equals(secondSlot) && firstIndex == secondIndex) return Result.failure("same-slot");
        var firstOpen = open(a, firstProvider, firstSlot, firstIndex, expectedStack(a, firstExpected));
        if (!firstOpen.ok()) return Result.failure(firstOpen.reason());
        var secondOpen = open(b, secondProvider, secondSlot, secondIndex, expectedStack(b, secondExpected));
        if (!secondOpen.ok()) return Result.failure(secondOpen.reason());
        var result = WorldEquipment.exchange(firstOpen.slot(), secondOpen.slot(), count);
        if (!result.ok()) return Result.failure(result.reason());
        return new Result(true, "", "", 0, "");
    }

    /** Boolean wrapper for callers that only need success. */
    public static boolean take(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected) {
        return takeOp(combat, handle, provider, slot, index, expected).ok();
    }
    /** CAS removal + native drop; returns the dropped item entity UUID or "". */
    public static String drop(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, String data) {
        return dropOp(combat, handle, provider, slot, index, expected, data).drop();
    }
    /** Boolean wrapper for installing an item. */
    public static boolean give(MinecraftCombat combat, ActorHandle handle, String provider, String slot, int index, String expected, String item) {
        return giveOp(combat, handle, provider, slot, index, expected, item).ok();
    }
    /** Boolean wrapper for the atomic swap. */
    public static boolean exchange(MinecraftCombat combat, ActorHandle first, String firstProvider, String firstSlot, int firstIndex, String firstExpected,
                                   ActorHandle second, String secondProvider, String secondSlot, int secondIndex, String secondExpected) {
        return exchangeOp(combat, first, firstProvider, firstSlot, firstIndex, firstExpected, second, secondProvider, secondSlot, secondIndex, secondExpected).ok();
    }

    private static WorldEquipment.Opened open(LivingEntity entity, String provider, String slot, int index, ItemStack expected) {
        if ("minecraft".equals(provider)) {
            var equipment = minecraftSlot(slot);
            if (equipment == null || index != 0) return WorldEquipment.Opened.failure("unknown-slot");
            return WorldEquipment.Opened.success(new MinecraftSlot(entity, equipment, expected));
        }
        return WorldEquipment.open(provider, entity, slot, index, expected);
    }
    private static Result receipt(ItemStack stack, LivingEntity entity, String drop) {
        return new Result(true, "", serialized(entity, stack), stack.getCount(), drop);
    }

    /** Pick up actual material with the same two-slot transaction used by equipment exchange. */
    public static Result collectOp(MinecraftCombat combat, ActorHandle source, ActorHandle target, String provider, String slot, int index,
                                    String expected, String entityId, String expectedDrop, int count) {
        var collector = target(combat, source); var recipient = target(combat, target);
        if (!(collector.level() instanceof ServerLevel level) || recipient.level() != level) return Result.failure("wrong-world");
        var found = level.getEntity(java.util.UUID.fromString(entityId));
        if (!(found instanceof ItemEntity item) || item.isRemoved()) return Result.failure("item-left");
        var stock = NativeRegistryFacts.parseStack(level.registryAccess(), expectedDrop);
        if (stock.isEmpty() || !ItemStack.matches(stock, item.getItem())) return Result.failure("stale-item");
        if (count < 1 || count > stock.getCount()) return Result.failure("count");
        var opened = open(recipient, provider, slot, index, expectedStack(recipient, expected));
        if (!opened.ok()) return Result.failure(opened.reason());
        if (!opened.slot().stock().isEmpty()) return Result.failure("occupied");
        var position = item.position();
        var pickup = new WorldEquipment.Slot() {
            @Override public ItemStack stock() { return stock.copy(); }
            @Override public boolean fresh() {
                return !item.isRemoved() && item.level() == level && item.position().equals(position) && ItemStack.matches(stock, item.getItem())
                    && collector.distanceToSqr(item) <= 64 * 64 && recipient.distanceToSqr(item) <= 64 * 64
                    && combat.clear(source, MinecraftCombat.point(collector.getEyePosition()), MinecraftCombat.point(position));
            }
            @Override public String preflight(ItemStack incoming, boolean droppable) {
                if (item.hasPickUpDelay()) return "pickup-delay";
                var owner = item.getTarget();
                if (owner != null && !owner.equals(collector.getUUID()) && !owner.equals(CombatServices.domain(collector).owner(collector))) return "pickup-owner";
                if (collector instanceof net.minecraft.world.entity.player.Player player) {
                    var event = new net.neoforged.neoforge.event.entity.player.ItemEntityPickupEvent.Pre(player, item);
                    net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(event);
                    if (event.canPickup() == net.neoforged.neoforge.common.util.TriState.FALSE) return "pickup-refused";
                }
                return null;
            }
            @Override public boolean commit(ItemStack value) { item.setItem(value.copy()); return true; }
            @Override public void settle(ItemStack value) { item.setItem(value.copy()); }
            @Override public void publish() {
                try {
                    if (collector instanceof net.minecraft.world.entity.player.Player player)
                        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(new net.neoforged.neoforge.event.entity.player.ItemEntityPickupEvent.Post(player, item, stock.copy()));
                } finally { if (item.getItem().isEmpty()) item.discard(); }
            }
        };
        var result = WorldEquipment.exchange(pickup, opened.slot(), count);
        return result.ok() ? receipt(stock.copyWithCount(count), recipient, item.getStringUUID()) : Result.failure(result.reason());
    }
    private static String serialized(LivingEntity entity, ItemStack stack) {
        if (stack == null || stack.isEmpty()) return "";
        var value = NativeRegistryFacts.serializeStack(entity.registryAccess(), stack);
        return value == null ? "" : value;
    }

    /** Minecraft hands and armour have no cancellable pre-event; the native write path is authoritative. */
    private static final class MinecraftSlot implements WorldEquipment.Slot {
        private final LivingEntity entity;
        private final EquipmentSlot equipment;
        private final ItemStack stock;
        private final boolean observed;
        MinecraftSlot(LivingEntity entity, EquipmentSlot equipment, ItemStack expected) {
            this.entity = entity; this.equipment = equipment;
            this.stock = entity.getItemBySlot(equipment).copy();
            this.observed = ItemStack.matches(stock, expected);
        }
        @Override public ItemStack stock() { return stock.copy(); }
        @Override public boolean fresh() { return observed && ItemStack.matches(entity.getItemBySlot(equipment), stock); }
        @Override public int capacityFor(ItemStack incoming) { return incoming.getMaxStackSize(); }
        @Override public String preflight(ItemStack incoming, boolean incomingDroppable) { return null; }
        @Override public boolean commit(ItemStack finalStack) { write(finalStack); return true; }
        @Override public void settle(ItemStack finalStack) { write(finalStack); }
        private void write(ItemStack value) { entity.setItemSlot(equipment, value.isEmpty() ? ItemStack.EMPTY : value.copy()); }
    }

    private static EquipmentSlot minecraftSlot(String slot) {
        for (var value : EquipmentSlot.values()) if (value.getName().equals(slot)) return value;
        return null;
    }
    private static LivingEntity target(MinecraftCombat combat, ActorHandle handle) {
        var entity = combat.resolve(handle);
        if (entity == null) throw new ActionInactiveException("Target left");
        return entity;
    }
    private static ItemStack expectedStack(LivingEntity entity, String expected) {
        if (expected == null || expected.isEmpty()) return ItemStack.EMPTY;
        return NativeRegistryFacts.parseStack(entity.registryAccess(), expected);
    }
    private static JsonObject object(String json) {
        try { var value = JsonParser.parseString(json == null || json.isBlank() ? "{}" : json); return value.isJsonObject() ? value.getAsJsonObject() : new JsonObject(); }
        catch (RuntimeException malformed) { return new JsonObject(); }
    }
}
