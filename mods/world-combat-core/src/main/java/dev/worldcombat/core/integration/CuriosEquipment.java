package dev.worldcombat.core.integration;

import dev.worldcombat.core.world.WorldEquipment;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.common.NeoForge;
import top.theillusivec4.curios.api.CuriosApi;
import top.theillusivec4.curios.api.SlotContext;
import top.theillusivec4.curios.api.event.CurioChangeEvent;

/** Loaded only when Curios is present. Native slot rules, storage and synchronization remain Curios-owned. */
public final class CuriosEquipment {
    private CuriosEquipment() {}
    public static void install() {
        WorldEquipment.register("curios", (entity, result) -> CuriosApi.getCuriosInventory(entity).ifPresent(inventory ->
            inventory.getCurios().forEach((slot, handler) -> {
                var stacks = handler.getStacks();
                var active = handler.getActiveStates();
                for (int index = 0; index < stacks.getSlots(); index++) {
                    var stack = stacks.getStackInSlot(index);
                    if (!stack.isEmpty() && (active.isEmpty() || index < active.size() && active.get(index)))
                        result.add(WorldEquipment.capture("curios", slot, index, stack, entity.registryAccess()));
                }
            })));
        WorldEquipment.registerWriter("curios", new WorldEquipment.Writer() {
            @Override public WorldEquipment.Opened open(LivingEntity entity, String slot, int index, ItemStack expected) {
                var inventory = CuriosApi.getCuriosInventory(entity).orElse(null);
                if (inventory == null) return WorldEquipment.Opened.failure("no-inventory");
                var handler = inventory.getStacksHandler(slot).orElse(null);
                if (handler == null || index < 0 || index >= handler.getStacks().getSlots()) return WorldEquipment.Opened.failure("unknown-slot");
                var current = handler.getStacks().getStackInSlot(index);
                return WorldEquipment.Opened.success(new CuriosSlot(entity, slot, index, current.copy(), ItemStack.matches(current, expected)));
            }
            @Override public WorldEquipment.WriteResult take(LivingEntity entity, String slot, int index, ItemStack expected) {
                var opened = open(entity, slot, index, expected);
                return opened.ok() ? WorldEquipment.takeFrom(opened.slot()) : WorldEquipment.WriteResult.failure(opened.reason());
            }
            @Override public WorldEquipment.WriteResult put(LivingEntity entity, String slot, int index, ItemStack expected, ItemStack incoming) {
                var opened = open(entity, slot, index, expected);
                return opened.ok() ? WorldEquipment.putInto(opened.slot(), incoming) : WorldEquipment.WriteResult.failure(opened.reason());
            }
        });
        NeoForge.EVENT_BUS.addListener((CurioChangeEvent event) -> WorldEquipment.changed(event.getEntity()));
    }

    /** Native Curios slot rules gate the preflight; the write itself stays on Curios' own storage and events. */
    private static final class CuriosSlot implements WorldEquipment.Slot {
        private final LivingEntity entity;
        private final String slot;
        private final int index;
        private final ItemStack stock;
        private final boolean observed;
        CuriosSlot(LivingEntity entity, String slot, int index, ItemStack stock, boolean observed) {
            this.entity = entity; this.slot = slot; this.index = index; this.stock = stock; this.observed = observed;
        }
        @Override public ItemStack stock() { return stock.copy(); }
        @Override public boolean fresh() { return observed && ItemStack.matches(live(), stock); }
        private ItemStack live() {
            var inventory = CuriosApi.getCuriosInventory(entity).orElse(null);
            var handler = inventory == null ? null : inventory.getStacksHandler(slot).orElse(null);
            if (handler == null || index < 0 || index >= handler.getStacks().getSlots()) return ItemStack.EMPTY;
            return handler.getStacks().getStackInSlot(index);
        }
        @Override public String preflight(ItemStack incoming, boolean incomingDroppable) {
            var context = new SlotContext(slot, entity, index, false, true);
            if (!stock.isEmpty() && !ItemStack.matches(stock, incoming)) {
                var worn = CuriosApi.getCurio(stock).orElse(null);
                if (worn != null && !worn.canUnequip(context)) return "cannot-unequip";
            }
            if (incoming.isEmpty()) return null;
            if (!CuriosApi.isStackValid(context, incoming)) return "cannot-equip";
            var curio = CuriosApi.getCurio(incoming).orElse(null);
            if (curio != null && !curio.canEquip(context)) return "cannot-equip";
            return null;
        }
        @Override public int capacityFor(ItemStack incoming) {
            var inventory = CuriosApi.getCuriosInventory(entity).orElse(null);
            var handler = inventory == null ? null : inventory.getStacksHandler(slot).orElse(null);
            return handler == null || index < 0 || index >= handler.getStacks().getSlots() ? 0
                : Math.min(incoming.getMaxStackSize(), handler.getStacks().getSlotLimit(index));
        }
        @Override public boolean commit(ItemStack finalStack) { write(finalStack); return true; }
        @Override public void settle(ItemStack finalStack) { write(finalStack); }
        private void write(ItemStack value) {
            CuriosApi.getCuriosInventory(entity).orElseThrow().setEquippedCurio(slot, index, value.isEmpty() ? ItemStack.EMPTY : value.copy());
        }
    }
}
